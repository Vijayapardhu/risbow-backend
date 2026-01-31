import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InvoicesService {
    constructor(private prisma: PrismaService) {}

    async generateInvoice(orderId: string): Promise<Buffer> {
        console.log(`[Invoice] Starting generation for order: ${orderId}`);

        if (!orderId || orderId.trim() === '') {
            throw new Error('Order ID is required');
        }

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

        console.log(`[Invoice] Found order: ${order.id}`);

        // Get vendor info from order items
        const items = Array.isArray(order.items) ? order.items : [];
        let vendorName = 'Risbow Store';
        let vendorAddress = 'Risbow HQ, Bangalore, Karnataka - 560001';
        let vendorGST = '29AABCU9603R1ZM';

        if (items.length > 0) {
            const firstItem = items[0] as any;
            if (firstItem.vendorId) {
                const vendor = await this.prisma.vendor.findUnique({
                    where: { id: firstItem.vendorId },
                    select: { name: true, storeName: true, pincode: true, gstNumber: true }
                });
                if (vendor) {
                    vendorName = vendor.storeName || vendor.name || 'Risbow Store';
                    vendorAddress = vendor.pincode ? `Pincode: ${vendor.pincode}` : vendorAddress;
                    vendorGST = vendor.gstNumber || vendorGST;
                }
            }
        }

        // Generate barcode
        let barcodeBuffer: Buffer | null = null;
        try {
            barcodeBuffer = await bwipjs.toBuffer({
                bcid: 'code128',
                text: order.id,
                scale: 3,
                height: 10,
                includetext: true,
                textxalign: 'center',
            });
            console.log('[Invoice] Barcode generated successfully');
        } catch (err) {
            console.warn('[Invoice] Barcode generation failed:', err.message);
        }

        // Generate PDF using PDFKit
        return this.generatePDF(order, items, vendorName, vendorAddress, vendorGST, barcodeBuffer);
    }

    private generatePDF(order: any, items: any[], vendorName: string, vendorAddress: string, vendorGST: string, barcodeBuffer: Buffer | null): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                console.log('[Invoice] Creating PDF with PDFKit...');
                
                const doc = new PDFDocument({ margin: 50 });
                const chunks: Buffer[] = [];
                
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(chunks);
                    console.log('[Invoice] PDF generated, size:', pdfBuffer.length, 'bytes');
                    resolve(pdfBuffer);
                });
                doc.on('error', reject);

                const invoiceNumber = `INV-${order.id.substring(0, 8).toUpperCase()}`;
                const orderNumber = order.orderNumber || `ORD-${order.id.substring(0, 8).toUpperCase()}`;
                const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN');
                const customerName = order.user?.name || 'Customer';
                const customerMobile = order.user?.mobile || '-';
                const customerEmail = order.user?.email || '-';
                
                const address = order.address || {};
                const shippingAddress = [
                    address.addressLine1 || address.street || '',
                    address.addressLine2 || '',
                    address.city || '',
                    address.state || '',
                    address.country || 'India',
                    address.pincode || address.postalCode || ''
                ].filter(Boolean).join(', ');

                // Add Logo
                const logoPath = path.join(process.cwd(), 'public', 'logo.png');
                if (fs.existsSync(logoPath)) {
                    doc.image(logoPath, 50, 30, { width: 80 });
                    console.log('[Invoice] Logo added to PDF');
                } else {
                    console.warn('[Invoice] Logo not found at:', logoPath);
                    // Fallback to text logo
                    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1a1a2e').text('R', 50, 40);
                    doc.fontSize(18).font('Helvetica-Bold').text('RISBOW', 80, 45);
                }

                // Header - TAX INVOICE
                doc.fontSize(20).font('Helvetica-Bold').fillColor('#333').text('TAX INVOICE', 300, 40, { align: 'right' });
                doc.fontSize(10).font('Helvetica').fillColor('#666').text('Original for Recipient', 300, 65, { align: 'right' });
                
                // Separator line
                doc.moveTo(50, 100).lineTo(550, 100).stroke('#1a1a2e');
                
                // Three Column Layout: Sold By | Invoice Details | Bill To
                let leftColY = 120;
                let midColY = 120;
                let rightColY = 120;
                
                // Left Column - Sold By
                doc.fontSize(9).font('Helvetica-Bold').fillColor('#666').text('SOLD BY:', 50, leftColY);
                leftColY += 15;
                doc.fontSize(11).font('Helvetica-Bold').fillColor('#333').text(vendorName, 50, leftColY);
                leftColY += 15;
                doc.fontSize(9).font('Helvetica').fillColor('#333').text(vendorAddress, 50, leftColY, { width: 150 });
                leftColY += 25;
                doc.fontSize(9).font('Helvetica').text(`GSTIN: ${vendorGST}`, 50, leftColY);
                
                // Middle Column - Invoice Details
                doc.fontSize(9).font('Helvetica-Bold').fillColor('#666').text('INVOICE DETAILS:', 220, midColY);
                midColY += 15;
                doc.fontSize(9).font('Helvetica').fillColor('#333').text(`Invoice #: ${invoiceNumber}`, 220, midColY);
                midColY += 13;
                doc.fontSize(9).font('Helvetica').text(`Order #: ${orderNumber}`, 220, midColY);
                midColY += 13;
                doc.fontSize(9).font('Helvetica').text(`Date: ${orderDate}`, 220, midColY);
                midColY += 13;
                doc.fontSize(9).font('Helvetica').text(`Payment: ${order.payment?.provider || 'COD'}`, 220, midColY);
                midColY += 15;
                
                // Add barcode if generated
                if (barcodeBuffer) {
                    doc.image(barcodeBuffer, 220, midColY, { width: 120, height: 40 });
                    doc.fontSize(7).font('Helvetica').fillColor('#666').text(order.id, 220, midColY + 42, { width: 120, align: 'center' });
                }
                
                // Right Column - Bill To
                doc.fontSize(9).font('Helvetica-Bold').fillColor('#666').text('BILL TO:', 400, rightColY);
                rightColY += 15;
                doc.fontSize(11).font('Helvetica-Bold').fillColor('#333').text(customerName, 400, rightColY);
                rightColY += 15;
                doc.fontSize(9).font('Helvetica').fillColor('#333').text(shippingAddress || 'Address not available', 400, rightColY, { width: 150 });
                rightColY += 35;
                doc.fontSize(9).font('Helvetica').text(`Phone: ${customerMobile}`, 400, rightColY);
                rightColY += 13;
                doc.fontSize(9).font('Helvetica').text(`Email: ${customerEmail}`, 400, rightColY);
                
                // Find max Y to continue from
                let y = Math.max(leftColY, midColY + 50, rightColY) + 20;
                
                // Separator line
                doc.moveTo(50, y).lineTo(550, y).stroke('#1a1a2e');
                y += 15;
                
                // Table Header
                doc.fontSize(9).font('Helvetica-Bold').fillColor('#333');
                doc.text('#', 50, y, { width: 30, align: 'center' });
                doc.text('Item Description', 85, y, { width: 200 });
                doc.text('Qty', 290, y, { width: 40, align: 'center' });
                doc.text('Unit Price', 335, y, { width: 70, align: 'right' });
                doc.text('Amount', 410, y, { width: 70, align: 'right' });
                doc.text('CGST', 485, y, { width: 35, align: 'right' });
                doc.text('SGST', 525, y, { width: 35, align: 'right' });
                
                y += 18;
                doc.moveTo(50, y).lineTo(550, y).stroke('#ccc');
                y += 10;
                
                // Table Items
                let totalTaxable = 0;
                let totalCGST = 0;
                let totalSGST = 0;
                
                doc.fontSize(8).font('Helvetica').fillColor('#333');
                items.forEach((item: any, index: number) => {
                    const unitPrice = item.price || item.unitPrice || 0;
                    const quantity = item.quantity || 1;
                    const taxableValue = unitPrice * quantity;
                    const cgst = Math.round((taxableValue * 9) / 100);
                    const sgst = Math.round((taxableValue * 9) / 100);
                    
                    totalTaxable += taxableValue;
                    totalCGST += cgst;
                    totalSGST += sgst;
                    
                    // Try multiple possible field names for product name
                    const productName = item.productName || item.productTitle || item.title || item.name || item.product?.title || 'Product';
                    
                    // Calculate row height based on product name length
                    const productNameText = productName.length > 35 ? productName.substring(0, 35) + '...' : productName;
                    const textHeight = doc.heightOfString(productNameText, { width: 200 });
                    const rowHeight = Math.max(18, textHeight + 4);
                    
                    doc.text((index + 1).toString(), 50, y, { width: 30, align: 'center' });
                    doc.text(productNameText, 85, y, { width: 200, height: rowHeight });
                    doc.text(quantity.toString(), 290, y, { width: 40, align: 'center' });
                    doc.text(this.formatCurrency(unitPrice), 335, y, { width: 70, align: 'right' });
                    doc.text(this.formatCurrency(taxableValue), 410, y, { width: 70, align: 'right' });
                    doc.text(this.formatCurrency(cgst), 485, y, { width: 35, align: 'right' });
                    doc.text(this.formatCurrency(sgst), 525, y, { width: 35, align: 'right' });
                    
                    y += rowHeight;
                    
                    // Add new page if needed
                    if (y > 680) {
                        doc.addPage();
                        y = 50;
                        // Redraw header on new page
                        doc.fontSize(9).font('Helvetica-Bold');
                        doc.text('#', 50, y, { width: 30, align: 'center' });
                        doc.text('Item Description', 85, y, { width: 200 });
                        doc.text('Qty', 290, y, { width: 40, align: 'center' });
                        doc.text('Unit Price', 335, y, { width: 70, align: 'right' });
                        doc.text('Amount', 410, y, { width: 70, align: 'right' });
                        doc.text('CGST', 485, y, { width: 35, align: 'right' });
                        doc.text('SGST', 525, y, { width: 35, align: 'right' });
                        y += 25;
                    }
                });
                
                // Separator line
                doc.moveTo(50, y).lineTo(550, y).stroke('#1a1a2e');
                y += 15;
                
                // Totals Section
                const shipping = order.shippingCharges || 0;
                const discount = order.coinsUsed || 0;
                const grandTotal = totalTaxable + totalCGST + totalSGST + shipping - discount;
                
                // Right-aligned totals
                const totalsX = 350;
                const valueX = 480;
                
                doc.fontSize(10).font('Helvetica').fillColor('#333');
                doc.text('Subtotal:', totalsX, y, { width: 120, align: 'right' });
                doc.text(this.formatCurrency(totalTaxable), valueX, y, { width: 70, align: 'right' });
                y += 18;
                
                doc.text('CGST (9%):', totalsX, y, { width: 120, align: 'right' });
                doc.text(this.formatCurrency(totalCGST), valueX, y, { width: 70, align: 'right' });
                y += 18;
                
                doc.text('SGST (9%):', totalsX, y, { width: 120, align: 'right' });
                doc.text(this.formatCurrency(totalSGST), valueX, y, { width: 70, align: 'right' });
                y += 18;
                
                if (shipping > 0) {
                    doc.text('Shipping:', totalsX, y, { width: 120, align: 'right' });
                    doc.text(this.formatCurrency(shipping), valueX, y, { width: 70, align: 'right' });
                    y += 18;
                }
                
                if (discount > 0) {
                    doc.text('Discount:', totalsX, y, { width: 120, align: 'right' });
                    doc.fillColor('#059669').text(`- Rs. ${Math.round(discount)}/-`, valueX, y, { width: 70, align: 'right' });
                    doc.fillColor('#333');
                    y += 18;
                }
                
                // Grand Total with highlight
                y += 5;
                doc.rect(totalsX - 10, y - 5, 210, 25).fill('#f5f5f5').stroke('#1a1a2e');
                doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1a2e');
                doc.text('Grand Total:', totalsX, y, { width: 120, align: 'right' });
                doc.text(this.formatCurrency(grandTotal), valueX, y, { width: 70, align: 'right' });
                y += 35;
                
                // Amount in words
                doc.fontSize(9).font('Helvetica-Oblique').fillColor('#666');
                doc.text(`Amount in words: ${this.numberToWords(grandTotal)} Rupees Only`, 50, y, { width: 500 });
                y += 30;
                
                // Footer
                doc.fontSize(8).font('Helvetica').fillColor('#666');
                doc.text('Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', 50, y, { width: 400 });
                y += 20;
                doc.text('This is a computer generated invoice and does not require signature.', 50, y, { width: 400 });
                y += 25;
                
                doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e');
                doc.text('Thank you for shopping with Risbow!', 50, y, { width: 500, align: 'center' });
                
                doc.end();
            } catch (error) {
                console.error('[Invoice] PDF generation error:', error);
                reject(error);
            }
        });
    }

    private formatCurrency(amount: number): string {
        // Manually format with Indian numbering system to avoid PDF rendering issues
        const roundedAmount = Math.round(amount);
        const amountStr = roundedAmount.toString();
        const len = amountStr.length;
        
        // Format according to Indian numbering (lakhs system)
        let formatted = '';
        let count = 0;
        
        for (let i = len - 1; i >= 0; i--) {
            if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) {
                formatted = ',' + formatted;
            }
            formatted = amountStr[i] + formatted;
            count++;
        }
        
        return `Rs. ${formatted}/-`;
    }

    private numberToWords(num: number): string {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
            'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        
        if (num === 0) return 'Zero';
        
        const convert = (n: number): string => {
            if (n < 20) return ones[n];
            if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
            if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
            if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
            if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
            return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
        };
        
        return convert(Math.round(num));
    }
}
