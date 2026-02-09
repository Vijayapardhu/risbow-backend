import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceTemplateService } from './invoice-template.service';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

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
        const items = Array.isArray(order.items) ? order.items : [];
        let vendorId: string | null = null;
        
        if (items.length > 0) {
            const firstItem = items[0] as any;
            vendorId = firstItem.vendorId;
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
                    margin: 50,
                    bufferPages: true
                });
                const chunks: Buffer[] = [];

                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Parse template configuration
                const currency = template?.currency || 'INR';
                const locale = template?.locale || 'en-IN';
                const showQrCode = template?.showQrCode ?? true;
                const taxFields = template?.taxFields?.fields || [];
                const customFields = template?.InvoiceCustomField || [];

                // Company/Vendor Info
                const companyName = template?.companyName || 'Risbow Store';
                const companyAddress = template?.address || 'Bangalore, Karnataka - 560001';
                const companyPhone = template?.phone || '+91 1234567890';
                const companyEmail = template?.email || 'support@risbow.com';
                const gstin = template?.gstin || '';

                // Logo (if available)
                if (template?.logoUrl) {
                    try {
                        // In production, you'd fetch and add the logo image
                        // doc.image(logoBuffer, 50, 50, { width: 100 });
                        doc.fontSize(20).fillColor('#333').text(companyName, 50, 50);
                    } catch (e) {
                        doc.fontSize(20).fillColor('#333').text(companyName, 50, 50);
                    }
                } else {
                    doc.fontSize(20).fillColor('#333').text(companyName, 50, 50);
                }

                // Header Text
                if (template?.headerText) {
                    doc.fontSize(10).fillColor('#666').text(template.headerText, 50, 80, { width: 500, align: 'left' });
                }

                // Invoice Title
                doc.fontSize(24).fillColor('#000').text('TAX INVOICE', 50, 120, { align: 'center' });

                // Invoice Details Box
                let yPosition = 160;
                doc.fontSize(10).fillColor('#333');
                doc.text(`Invoice No: ${invoiceNumber}`, 50, yPosition);
                doc.text(`Date: ${new Date().toLocaleDateString(locale)}`, 350, yPosition);
                
                if (order.orderNumber) {
                    yPosition += 20;
                    doc.text(`Order No: ${order.orderNumber}`, 50, yPosition);
                }

                yPosition += 30;

                // Two-column layout: Vendor & Customer
                doc.rect(50, yPosition, 245, 120).stroke();
                doc.rect(305, yPosition, 245, 120).stroke();

                // Vendor Details
                doc.fontSize(11).fillColor('#000').text('From:', 60, yPosition + 10);
                doc.fontSize(10).fillColor('#333');
                doc.text(companyName, 60, yPosition + 28, { width: 225 });
                if (companyAddress) doc.text(companyAddress, 60, yPosition + 45, { width: 225 });
                if (companyPhone) doc.text(`Phone: ${companyPhone}`, 60, yPosition + 75);
                if (companyEmail) doc.text(`Email: ${companyEmail}`, 60, yPosition + 90);
                if (gstin) doc.text(`GSTIN: ${gstin}`, 60, yPosition + 105);

                // Customer Details
                doc.fontSize(11).fillColor('#000').text('To:', 315, yPosition + 10);
                doc.fontSize(10).fillColor('#333');
                doc.text(order.user?.name || 'Customer', 315, yPosition + 28, { width: 225 });
                if (order.address) {
                    const addr = order.address;
                    const fullAddress = [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.pincode]
                        .filter(Boolean)
                        .join(', ');
                    doc.text(fullAddress, 315, yPosition + 45, { width: 225 });
                }
                if (order.user?.mobile) doc.text(`Phone: ${order.user.mobile}`, 315, yPosition + 75);
                if (order.user?.email) doc.text(`Email: ${order.user.email}`, 315, yPosition + 90);

                yPosition += 140;

                // Items Table Header
                doc.fontSize(11).fillColor('#fff').rect(50, yPosition, 500, 25).fill('#333');
                doc.text('Item', 60, yPosition + 7);
                doc.text('Qty', 300, yPosition + 7, { width: 50, align: 'center' });
                doc.text('Price', 360, yPosition + 7, { width: 80, align: 'right' });
                doc.text('Total', 450, yPosition + 7, { width: 90, align: 'right' });

                yPosition += 25;

                // Items
                const items = Array.isArray(order.items) ? order.items : [];
                let subtotal = 0;

                items.forEach((item: any, index: number) => {
                    if (yPosition > 700) {
                        doc.addPage();
                        yPosition = 50;
                    }

                    const itemTotal = item.price * item.quantity;
                    subtotal += itemTotal;

                    doc.fontSize(10).fillColor('#333');
                    if (index % 2 === 0) {
                        doc.rect(50, yPosition, 500, 25).fill('#f9f9f9');
                    }

                    doc.fillColor('#333').text(item.name || 'Product', 60, yPosition + 7, { width: 220 });
                    doc.text(item.quantity.toString(), 300, yPosition + 7, { width: 50, align: 'center' });
                    doc.text(this.formatCurrency(item.price, currency, locale), 360, yPosition + 7, { width: 80, align: 'right' });
                    doc.text(this.formatCurrency(itemTotal, currency, locale), 450, yPosition + 7, { width: 90, align: 'right' });

                    yPosition += 25;
                });

                // Totals section
                yPosition += 10;
                doc.rect(50, yPosition, 500, 1).fill('#ddd');
                yPosition += 10;

                // Subtotal
                doc.fontSize(10).fillColor('#333');
                doc.text('Subtotal:', 360, yPosition, { width: 80, align: 'right' });
                doc.text(this.formatCurrency(subtotal, currency, locale), 450, yPosition, { width: 90, align: 'right' });
                yPosition += 20;

                // Custom Tax Fields
                let taxTotal = 0;
                if (taxFields.length > 0) {
                    taxFields.forEach((taxField: any) => {
                        // Integer paise math: taxPaise = round(subtotalPaise * ratePercent / 100)
                        const taxAmount = Math.round((subtotal * Number(taxField.rate)) / 100);
                        taxTotal += taxAmount;

                        doc.text(`${taxField.name} (${taxField.rate}%):`, 360, yPosition, { width: 80, align: 'right' });
                        doc.text(this.formatCurrency(taxAmount, currency, locale), 450, yPosition, { width: 90, align: 'right' });
                        yPosition += 20;
                    });
                } else {
                    // Default tax
                    const defaultTax = Math.round((subtotal * 18) / 100);
                    taxTotal = defaultTax;
                    doc.text('GST (18%):', 360, yPosition, { width: 80, align: 'right' });
                    doc.text(this.formatCurrency(defaultTax, currency, locale), 450, yPosition, { width: 90, align: 'right' });
                    yPosition += 20;
                }

                // Shipping charges
                if (order.shippingCharges > 0) {
                    doc.text('Shipping:', 360, yPosition, { width: 80, align: 'right' });
                    doc.text(this.formatCurrency(order.shippingCharges, currency, locale), 450, yPosition, { width: 90, align: 'right' });
                    yPosition += 20;
                }

                // Discount
                if (order.discountAmount > 0) {
                    doc.fillColor('#d9534f');
                    doc.text('Discount:', 360, yPosition, { width: 80, align: 'right' });
                    doc.text(`-${this.formatCurrency(order.discountAmount, currency, locale)}`, 450, yPosition, { width: 90, align: 'right' });
                    yPosition += 20;
                    doc.fillColor('#333');
                }

                // Grand Total
                yPosition += 5;
                doc.rect(360, yPosition - 5, 190, 30).fill('#f0f0f0');
                doc.fontSize(12).fillColor('#000').text('Total Amount:', 370, yPosition + 3);
                doc.fontSize(14).text(this.formatCurrency(order.totalAmount, currency, locale), 450, yPosition + 2, { width: 90, align: 'right' });

                yPosition += 40;

                // Custom Fields
                if (customFields.length > 0) {
                    yPosition += 10;
                    doc.fontSize(10).fillColor('#333');
                    customFields.forEach((field: any) => {
                        doc.text(`${field.fieldName}: ${field.fieldValue}`, 50, yPosition);
                        yPosition += 18;
                    });
                }

                // QR Code (Payment QR or Order Details)
                if (showQrCode) {
                    try {
                        const qrData = `Invoice: ${invoiceNumber}\nOrder: ${order.orderNumber}\nAmount: ${this.formatCurrency(order.totalAmount, currency, locale)}`;
                        const qrCodeDataURL = await QRCode.toDataURL(qrData, { width: 120 });
                        const qrBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
                        
                        doc.image(qrBuffer, 50, yPosition + 10, { width: 100 });
                    } catch (e) {
                        console.error('QR code generation failed:', e);
                    }
                }

                // Footer Text
                if (template?.footerText) {
                    const footerY = doc.page.height - 80;
                    doc.fontSize(9).fillColor('#666').text(template.footerText, 50, footerY, { 
                        width: 500, 
                        align: 'center' 
                    });
                }

                // Signature line
                const signatureY = doc.page.height - 100;
                doc.fontSize(9).fillColor('#333');
                doc.text('Authorized Signature', 400, signatureY, { width: 150, align: 'center' });
                doc.moveTo(400, signatureY - 5).lineTo(550, signatureY - 5).stroke();

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
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
