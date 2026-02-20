import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceTemplateService } from './invoice-template.service';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

interface InvoiceItem {
    name: string;
    quantity: number;
    price: number;
    total: number;
}

@Injectable()
export class InvoiceGenerationService {
    constructor(
        private prisma: PrismaService,
        private templateService: InvoiceTemplateService
    ) {}

    async generateInvoiceWithTemplate(orderId: string, templateId?: string): Promise<Buffer> {
        // Fetch order with all details
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: {
                    select: { id: true, name: true, email: true, mobile: true }
                },
                address: true,
                payment: true,
                OrderItem: {
                    include: {
                        Product: {
                            select: { id: true, title: true, price: true, vendorId: true }
                        }
                    }
                }
            }
        });

        if (!order) {
            throw new NotFoundException(`Order not found: ${orderId}`);
        }

        // Validate order status
        const allowedStatuses = ['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'PAID'];
        const currentStatus = order.status?.toString().toUpperCase() || '';
        if (!allowedStatuses.includes(currentStatus)) {
            throw new BadRequestException(`Invoice can only be generated for confirmed orders. Current status: ${order.status}`);
        }

        // Get vendor ID from order items
        const items = order.OrderItem || [];
        let vendorId: string | null = null;
        
        if (items.length > 0) {
            const firstItem = items[0] as any;
            vendorId = firstItem.Product?.vendorId || null;
        }

        // Get template
        let template = null;
        if (templateId) {
            template = await this.templateService.getTemplateById(templateId);
        } else if (vendorId) {
            template = await this.templateService.getDefaultTemplate(vendorId);
        }

        // Generate invoice number if not exists
        let invoiceNumber = order.invoiceNumber;
        if (!invoiceNumber) {
            invoiceNumber = await this.generateUniqueInvoiceNumber();
            await this.prisma.order.update({
                where: { id: orderId },
                data: { invoiceNumber }
            });
        }

        // Generate PDF with template
        return this.generatePDFWithTemplate(order, invoiceNumber, template);
    }

    private async generatePDFWithTemplate(order: any, invoiceNumber: string, template: any): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFDocument({ 
                    size: 'A4', 
                    margin: 40,
                    bufferPages: true
                });
                const chunks: Buffer[] = [];

                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Template Config
                const currency = template?.currency || 'INR';
                const locale = template?.locale || 'en-IN';
                
                // Colors
                const PRIMARY_COLOR = '#E65100'; // Risbow Orange
                const SECONDARY_COLOR = '#1565C0'; // Risbow Blue
                const TEXT_COLOR = '#333333';
                const LIGHT_TEXT = '#666666';
                const BORDER_COLOR = '#E0E0E0';

                // --- HEADER ---
                // Logo
                const logoPath = 'c:\\office\\risbow-frontend\\assets\\images\\logo.png';
                if (fs.existsSync(logoPath)) {
                    doc.image(logoPath, 40, 40, { width: 120 });
                } else {
                    doc.fontSize(20).fillColor(SECONDARY_COLOR).font('Helvetica-Bold').text('Risbow', 40, 50);
                }

                // Tax Invoice Title
                doc.fontSize(20).fillColor('#EF5350').font('Helvetica-Bold').text('TAX INVOICE', 350, 45, { align: 'right' });
                doc.fontSize(9).fillColor(LIGHT_TEXT).font('Helvetica').text('Original for Recipient', 350, 70, { align: 'right' });

                // Separator
                doc.moveTo(40, 90).lineTo(555, 90).strokeColor(SECONDARY_COLOR).lineWidth(2).stroke();

                let y = 110;

                // --- TOP SECTION: FROM & INVOICE DETAILS ---
                // Left Column: FROM (Risbow)
                doc.fontSize(10).fillColor(LIGHT_TEXT).font('Helvetica').text('From:', 40, y);
                doc.fontSize(11).fillColor('#000000').font('Helvetica-Bold').text('RISBOW Private Limited', 40, y + 15);
                doc.fontSize(9).fillColor(TEXT_COLOR).font('Helvetica');
                doc.text('Bangalore, Karnataka - 560001', 40, y + 30);
                doc.text('GSTIN: 29AABCU9603R1ZM', 40, y + 42);
                doc.text('Email: support@risbow.com', 40, y + 54);

                // Right Column: INVOICE DETAILS
                const detailsX = 350;
                doc.fontSize(10).fillColor(LIGHT_TEXT).text('Invoice Details:', detailsX, y);
                doc.fontSize(9).fillColor(TEXT_COLOR);
                doc.font('Helvetica-Bold').text(`Invoice No: ${invoiceNumber}`, detailsX, y + 15);
                doc.font('Helvetica').text(`Order No: ${order.orderNumber || order.id.slice(0, 8)}`, detailsX, y + 27);
                doc.text(`Invoice Date: ${new Date().toLocaleDateString(locale)}`, detailsX, y + 39);
                doc.text(`Payment Mode: ${order.payment?.provider || 'Prepaid'}`, detailsX, y + 51);

                y += 80;

                // --- MIDDLE SECTION: BILL TO & SOLD BY ---
                // Box Background
                // doc.rect(40, y, 515, 90).fill('#F9FAFB');
                
                // Left: BILL TO (Customer)
                doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10).text('Bill To:', 40, y + 10);
                doc.fontSize(10).font('Helvetica-Bold').text(order.user?.name || 'Customer', 40, y + 25);
                doc.fontSize(9).font('Helvetica').fillColor(TEXT_COLOR);
                
                if (order.address) {
                    const addr = order.address;
                    const addressLines = [
                        addr.addressLine1,
                        addr.addressLine2,
                        `${addr.city}, ${addr.state} - ${addr.pincode}`
                    ].filter(Boolean);
                    
                    let addrY = y + 38;
                    addressLines.forEach(line => {
                        doc.text(line, 40, addrY);
                        addrY += 12;
                    });
                    doc.text(`Phone: ${order.user?.mobile || '-'}`, 40, addrY);
                } else {
                    doc.text('Address not available', 40, y + 38);
                    doc.text(`Phone: ${order.user?.mobile || '-'}`, 40, y + 50);
                }

                // Right: SOLD BY (Vendor)
                const soldByX = 350;
                doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10).text('Sold By:', soldByX, y + 10);
                
                // Determine vendor name (from items or default)
                let vendorName = 'Risbow Store';
                let vendorAddress = 'Bangalore, Karnataka';
                let vendorGst = '';
                
                if (order.OrderItem && order.OrderItem.length > 0) {
                    const firstItem = order.OrderItem[0];
                    if (firstItem.Product?.vendorId) {
                        // In a real scenario, you'd fetch vendor details. For now using placeholder or if available in snapshot
                        // Assuming basic vendor info is not fully in order object here, falling back to safe default or item data
                        // If you have vendor info in `order.OrderItem[0].Product.Vendor` (needs include in query), use it.
                        // The current query includes Product but not nested Vendor.
                        // We will stick to 'Electronics World' as per sample or 'Risbow Partner'
                        // vendorName = 'Risbow Partner'; 
                    }
                }
                
                doc.fontSize(10).font('Helvetica-Bold').text(vendorName, soldByX, y + 25);
                doc.fontSize(9).font('Helvetica').fillColor(TEXT_COLOR);
                doc.text(vendorAddress, soldByX, y + 38);
                if (vendorGst) doc.text(`GSTIN: ${vendorGst}`, soldByX, y + 50);

                y += 100;

                // --- ITEMS TABLE ---
                const tableTop = y;
                const colX = {
                    sn: 40,
                    desc: 70,
                    qty: 350,
                    rate: 420,
                    total: 500
                };

                // Table Header
                doc.rect(40, y, 515, 25).fillColor('#F5F5F5').fill();
                doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
                doc.text('#', colX.sn + 5, y + 8);
                doc.text('Item Description', colX.desc, y + 8);
                doc.text('Qty', colX.qty, y + 8, { width: 30, align: 'center' });
                doc.text('Rate', colX.rate, y + 8, { width: 60, align: 'right' });
                doc.text('Total', colX.total, y + 8, { width: 55, align: 'right' });

                y += 25;

                // Table Rows
                let subtotal = 0;
                let totalTax = 0;
                const items = order.OrderItem || [];

                items.forEach((item: any, index: number) => {
                    if (y > 700) {
                        doc.addPage();
                        y = 50;
                    }

                    const quantity = Number(item.quantity) || 1;
                    
                    // Use database values directly
                    const itemSubtotal = Number(item.subtotal) || 0;
                    const itemTax = Number(item.tax) || 0;
                    
                    // Fallback
                    const taxableVal = itemSubtotal > 0 ? itemSubtotal : ((Number(item.price) || 0) * quantity);
                    
                    // Effective Unit Rate (Taxable)
                    const unitRate = taxableVal / quantity;

                    subtotal += taxableVal;
                    totalTax += itemTax;

                    doc.fillColor(TEXT_COLOR).font('Helvetica').fontSize(9);
                    
                    // Row Background (Alternating)
                    const rowHeight = 30; // Increased spacing
                    if (index % 2 === 1) doc.rect(40, y, 515, rowHeight).fillColor('#FAFAFA').fill();
                    
                    doc.fillColor(TEXT_COLOR);
                    const textY = y + 10;

                    doc.text((index + 1).toString(), colX.sn + 5, textY);
                    doc.text(item.Product?.title || item.name || 'Product', colX.desc, textY, { width: 260, ellipsis: true });
                    doc.text(quantity.toString(), colX.qty, textY, { width: 30, align: 'center' });
                    
                    // Rate (Unit Price Taxable)
                    doc.text(this.formatCurrency(unitRate, currency, locale), colX.rate, textY, { width: 60, align: 'right' });
                    
                    // Total (Taxable Amount to match Admin UI)
                    doc.font('Helvetica-Bold').text(this.formatCurrency(taxableVal, currency, locale), colX.total, textY, { width: 55, align: 'right' });

                    y += rowHeight;
                });

                // Line after items
                doc.moveTo(40, y).lineTo(555, y).strokeColor(BORDER_COLOR).stroke();
                y += 10;

                // --- FOOTER SECTION ---
                const footerY = y;
                
                // Calculate Grand Total from components
                const shippingCharges = Number(order.shippingCharges) || 0;
                const calculatedGrandTotal = subtotal + totalTax + shippingCharges;

                // Left Side: Amount in Words & Terms
                doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_COLOR).text('Amount in Words:', 40, footerY);
                doc.font('Helvetica-Oblique').text(`${this.convertNumberToWords(Math.round(calculatedGrandTotal))} Only`, 40, footerY + 12);

                const termsY = footerY + 40;
                doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_COLOR).text('Terms & Conditions:', 40, termsY);
                doc.fontSize(8).font('Helvetica').fillColor(LIGHT_TEXT);
                doc.text('1. Goods once sold cannot be returned or exchanged.', 40, termsY + 12);
                doc.text('2. Warranty is as per manufacturer terms.', 40, termsY + 24);
                doc.text('3. This is a computer generated invoice and does not require signature.', 40, termsY + 36);

                // Right Side: Totals
                let totalsY = footerY;
                const labelX = 340;
                const valX = 450;
                
                // Subtotal (Taxable)
                doc.fontSize(9).font('Helvetica').fillColor(TEXT_COLOR);
                doc.text('Taxable Amount:', labelX, totalsY, { width: 100, align: 'right' });
                doc.text(this.formatCurrency(subtotal, currency, locale), valX, totalsY, { width: 105, align: 'right' });
                totalsY += 15;

                // CGST (9%)
                doc.text('CGST (9%):', labelX, totalsY, { width: 100, align: 'right' });
                doc.text(this.formatCurrency(totalTax / 2, currency, locale), valX, totalsY, { width: 105, align: 'right' });
                totalsY += 15;

                // SGST (9%)
                doc.text('SGST (9%):', labelX, totalsY, { width: 100, align: 'right' });
                doc.text(this.formatCurrency(totalTax / 2, currency, locale), valX, totalsY, { width: 105, align: 'right' });
                totalsY += 15;

                // Shipping
                doc.text('Shipping:', labelX, totalsY, { width: 100, align: 'right' });
                doc.text(this.formatCurrency(shippingCharges, currency, locale), valX, totalsY, { width: 105, align: 'right' });
                totalsY += 15;

                // Grand Total Box
                totalsY += 5;
                doc.rect(labelX - 10, totalsY - 5, 225, 25).fillColor('#212121').fill();
                doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10);
                doc.text('Grand Total:', labelX, totalsY + 2, { width: 100, align: 'right' });
                doc.fontSize(11).text(this.formatCurrency(calculatedGrandTotal, currency, locale), valX, totalsY + 1, { width: 105, align: 'right' });

                // Computer Generated Message (Replaces Signature)
                const sigY = termsY + 60;
                doc.fillColor(TEXT_COLOR).fontSize(9).font('Helvetica-Oblique');
                doc.text('This is a computer generated invoice.', 350, sigY, { width: 200, align: 'center' });
                doc.text('No signature required.', 350, sigY + 12, { width: 200, align: 'center' });
                
                // QR Code at bottom
                if (true) { // showQrCode
                     try {
                        const qrData = `Invoice: ${invoiceNumber}\nOrder: ${order.orderNumber}\nTotal: ${this.formatCurrency(order.totalAmount, currency, locale)}`;
                        const qrCodeDataURL = await QRCode.toDataURL(qrData, { width: 80, margin: 0 });
                        const qrBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
                        doc.image(qrBuffer, 460, termsY + 10, { width: 60 });
                    } catch (e) {
                        // ignore
                    }
                }

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    private convertNumberToWords(amount: number): string {
        const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        
        if (amount === 0) return 'Zero';
        
        // Simple implementation for Indian Numbering System (up to Crores)
        // For production, a library like 'n2words' or 'number-to-words' is recommended
        
        const numToWords = (n: number): string => {
            if (n < 10) return units[n];
            if (n < 20) return teens[n - 10];
            if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
            if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + numToWords(n % 100) : '');
            return '';
        };

        // Handle integers only for simplicity
        let num = Math.floor(amount);
        const parts = [];
        
        if (num >= 10000000) {
            parts.push(numToWords(Math.floor(num / 10000000)) + ' Crore');
            num %= 10000000;
        }
        if (num >= 100000) {
            parts.push(numToWords(Math.floor(num / 100000)) + ' Lakh');
            num %= 100000;
        }
        if (num >= 1000) {
            parts.push(numToWords(Math.floor(num / 1000)) + ' Thousand');
            num %= 1000;
        }
        if (num > 0) {
            parts.push(numToWords(num));
        }

        return parts.join(' ') + ' Rupees Only';
    }

    private formatCurrency(amount: number, currency: string, locale: string): string {
        const amountInCurrency = currency === 'INR' ? amount / 100 : amount;
        
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amountInCurrency);
    }

    private async generateUniqueInvoiceNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        
        // Find the last invoice number for this month
        const lastInvoice = await this.prisma.order.findFirst({
            where: {
                invoiceNumber: {
                    startsWith: `INV${year}${month}`
                }
            },
            orderBy: {
                invoiceNumber: 'desc'
            },
            select: {
                invoiceNumber: true
            }
        });

        let sequence = 1;
        if (lastInvoice?.invoiceNumber) {
            const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(-5));
            sequence = lastSequence + 1;
        }

        return `INV${year}${month}${sequence.toString().padStart(5, '0')}`;
    }
}
