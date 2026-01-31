import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';

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

        // Generate PDF using PDFKit
        return this.generatePDF(order, items, vendorName, vendorAddress, vendorGST);
    }

    private generatePDF(order: any, items: any[], vendorName: string, vendorAddress: string, vendorGST: string): Promise<Buffer> {
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

                // Header
                doc.fontSize(24).font('Helvetica-Bold').text('TAX INVOICE', 50, 50);
                doc.fontSize(12).font('Helvetica').text('Original for Recipient', 50, 80);
                
                // Risbow Logo/Brand
                doc.fontSize(20).font('Helvetica-Bold').text('RISBOW', 400, 50, { align: 'right' });
                doc.fontSize(10).font('Helvetica').text('HyperLocal Multivendor', 400, 75, { align: 'right' });
                
                // Separator line
                doc.moveTo(50, 100).lineTo(550, 100).stroke();
                
                // Seller Info
                doc.fontSize(10).font('Helvetica-Bold').text('SOLD BY:', 50, 120);
                doc.fontSize(12).font('Helvetica-Bold').text(vendorName, 50, 135);
                doc.fontSize(10).font('Helvetica').text(vendorAddress, 50, 150);
                doc.fontSize(10).font('Helvetica').text(`GSTIN: ${vendorGST}`, 50, 165);
                
                // Invoice Details
                doc.fontSize(10).font('Helvetica-Bold').text('INVOICE DETAILS:', 300, 120);
                doc.fontSize(10).font('Helvetica').text(`Invoice #: ${invoiceNumber}`, 300, 135);
                doc.fontSize(10).font('Helvetica').text(`Order #: ${orderNumber}`, 300, 150);
                doc.fontSize(10).font('Helvetica').text(`Date: ${orderDate}`, 300, 165);
                doc.fontSize(10).font('Helvetica').text(`Payment: ${order.payment?.provider || 'COD'}`, 300, 180);
                doc.fontSize(8).font('Helvetica').text(`Order ID: ${order.id}`, 300, 195);
                
                // Bill To
                doc.fontSize(10).font('Helvetica-Bold').text('BILL TO:', 50, 220);
                doc.fontSize(12).font('Helvetica-Bold').text(customerName, 50, 235);
                doc.fontSize(10).font('Helvetica').text(shippingAddress || 'Address not available', 50, 250, { width: 250 });
                doc.fontSize(10).font('Helvetica').text(`Phone: ${customerMobile}`, 50, 280);
                doc.fontSize(10).font('Helvetica').text(`Email: ${customerEmail}`, 50, 295);
                
                // Separator line
                doc.moveTo(50, 320).lineTo(550, 320).stroke();
                
                // Table Header
                let y = 340;
                doc.fontSize(9).font('Helvetica-Bold');
                doc.text('#', 50, y, { width: 30, align: 'center' });
                doc.text('Item', 80, y, { width: 200 });
                doc.text('Qty', 280, y, { width: 40, align: 'center' });
                doc.text('Price', 320, y, { width: 70, align: 'right' });
                doc.text('Amount', 390, y, { width: 70, align: 'right' });
                doc.text('CGST', 460, y, { width: 40, align: 'right' });
                doc.text('SGST', 500, y, { width: 40, align: 'right' });
                
                y += 20;
                doc.moveTo(50, y).lineTo(550, y).stroke();
                y += 10;
                
                // Table Items
                let totalTaxable = 0;
                let totalCGST = 0;
                let totalSGST = 0;
                
                doc.fontSize(8).font('Helvetica');
                items.forEach((item: any, index: number) => {
                    const unitPrice = item.price || item.unitPrice || 0;
                    const quantity = item.quantity || 1;
                    const taxableValue = unitPrice * quantity;
                    const cgst = Math.round((taxableValue * 9) / 100);
                    const sgst = Math.round((taxableValue * 9) / 100);
                    
                    totalTaxable += taxableValue;
                    totalCGST += cgst;
                    totalSGST += sgst;
                    
                    const productName = item.productName || item.name || 'Product';
                    
                    doc.text((index + 1).toString(), 50, y, { width: 30, align: 'center' });
                    doc.text(productName.substring(0, 35), 80, y, { width: 200 });
                    doc.text(quantity.toString(), 280, y, { width: 40, align: 'center' });
                    doc.text(`₹${unitPrice.toLocaleString('en-IN')}`, 320, y, { width: 70, align: 'right' });
                    doc.text(`₹${taxableValue.toLocaleString('en-IN')}`, 390, y, { width: 70, align: 'right' });
                    doc.text(`₹${cgst}`, 460, y, { width: 40, align: 'right' });
                    doc.text(`₹${sgst}`, 500, y, { width: 40, align: 'right' });
                    
                    y += 20;
                    
                    // Add new page if needed
                    if (y > 700) {
                        doc.addPage();
                        y = 50;
                    }
                });
                
                // Separator line
                doc.moveTo(50, y).lineTo(550, y).stroke();
                y += 15;
                
                // Totals
                const shipping = order.shippingCharges || 0;
                const discount = order.coinsUsed || 0;
                const grandTotal = totalTaxable + totalCGST + totalSGST + shipping - discount;
                
                doc.fontSize(10).font('Helvetica');
                doc.text('Subtotal:', 350, y, { width: 100, align: 'right' });
                doc.text(`₹${totalTaxable.toLocaleString('en-IN')}`, 450, y, { width: 100, align: 'right' });
                y += 20;
                
                doc.text('CGST (9%):', 350, y, { width: 100, align: 'right' });
                doc.text(`₹${totalCGST.toLocaleString('en-IN')}`, 450, y, { width: 100, align: 'right' });
                y += 20;
                
                doc.text('SGST (9%):', 350, y, { width: 100, align: 'right' });
                doc.text(`₹${totalSGST.toLocaleString('en-IN')}`, 450, y, { width: 100, align: 'right' });
                y += 20;
                
                if (shipping > 0) {
                    doc.text('Shipping:', 350, y, { width: 100, align: 'right' });
                    doc.text(`₹${shipping.toLocaleString('en-IN')}`, 450, y, { width: 100, align: 'right' });
                    y += 20;
                }
                
                if (discount > 0) {
                    doc.text('Discount:', 350, y, { width: 100, align: 'right' });
                    doc.text(`-₹${discount.toLocaleString('en-IN')}`, 450, y, { width: 100, align: 'right' });
                    y += 20;
                }
                
                // Grand Total
                doc.fontSize(12).font('Helvetica-Bold');
                doc.text('Grand Total:', 350, y, { width: 100, align: 'right' });
                doc.text(`₹${grandTotal.toLocaleString('en-IN')}`, 450, y, { width: 100, align: 'right' });
                y += 30;
                
                // Amount in words
                doc.fontSize(9).font('Helvetica-Oblique');
                doc.text(`Amount in words: ${this.numberToWords(grandTotal)} Rupees Only`, 50, y, { width: 500 });
                y += 40;
                
                // Footer
                doc.fontSize(9).font('Helvetica');
                doc.text('Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', 50, y, { width: 400 });
                y += 30;
                
                doc.text('This is a computer generated invoice and does not require signature.', 50, y, { width: 400 });
                y += 30;
                
                doc.fontSize(10).font('Helvetica-Bold');
                doc.text('Thank you for shopping with Risbow!', 50, y, { width: 500, align: 'center' });
                
                doc.end();
            } catch (error) {
                console.error('[Invoice] PDF generation error:', error);
                reject(error);
            }
        });
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
