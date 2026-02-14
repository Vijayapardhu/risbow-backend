import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import * as fs from 'fs';
import * as path from 'path';
import { generateShortInvoiceNumber } from '../common/invoice-number.utils';

@Injectable()
export class InvoicesService {
    constructor(private prisma: PrismaService) {}

    async generateInvoice(orderId: string): Promise<Buffer> {
        console.log(`[Invoice] Starting generation for order: ${orderId}`);

        try {
            if (!orderId || orderId.trim() === '') {
                throw new Error('Order ID is required');
            }

            // Fetch order with all details
            let order = await this.prisma.order.findUnique({
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
                                select: { id: true, title: true, sku: true, images: true }
                            },
                            Vendor: {
                                select: { id: true, name: true, storeName: true }
                            }
                        }
                    }
                }
            });

            if (!order) {
                throw new NotFoundException(`Order not found: ${orderId}`);
            }

            console.log(`[Invoice] Found order: ${order.id}, status: ${order.status}, orderNumber: ${order.orderNumber}`);

            // Only allow invoice generation for confirmed or later status
            const allowedStatuses = ['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'PAID'];
            const currentStatus = order.status?.toString().toUpperCase() || '';
            if (!allowedStatuses.includes(currentStatus)) {
                throw new BadRequestException(`Invoice can only be generated for confirmed orders. Current status: ${order.status}`);
            }

            // Generate order number if not exists (for old orders)
            if (!order.orderNumber) {
                const tempOrderNumber = `RIS${new Date().getFullYear()}${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][new Date().getMonth()]}${order.id.substring(0, 4).toUpperCase()}`;
                order = { ...order, orderNumber: tempOrderNumber };
                console.log(`[Invoice] Using fallback order number: ${tempOrderNumber}`);
            }

        // Generate and store invoice number if not exists
        let invoiceNumber = order.invoiceNumber;
        if (!invoiceNumber) {
            invoiceNumber = await this.generateUniqueInvoiceNumber();
            await this.prisma.order.update({
                where: { id: orderId },
                data: { invoiceNumber }
            });
            console.log(`[Invoice] Generated invoice number: ${invoiceNumber}`);
        }

        // Fetch updated order with invoice number
        order = { ...order, invoiceNumber };

        // Get vendor info from order items
        const items = Array.isArray(order.itemsSnapshot) ? order.itemsSnapshot : [];
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

        // Generate barcode using order number (not internal ID)
        let barcodeBuffer: Buffer | null = null;
        const barcodeText = order.orderNumber || order.id;
        try {
            barcodeBuffer = await bwipjs.toBuffer({
                bcid: 'code128',
                text: barcodeText,
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
        } catch (error) {
            console.error(`[Invoice] Error generating invoice for order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Generates a unique short invoice number
     * Format: INV-YYMMDD-XXXX (e.g., INV-260131-0001)
     */
    private async generateUniqueInvoiceNumber(): Promise<string> {
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const datePrefix = `INV-${year}${month}${day}`;
        
        // Get start and end of today
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        
        // Find the highest invoice number for today
        const lastOrder = await this.prisma.order.findFirst({
            where: {
                invoiceNumber: {
                    startsWith: datePrefix,
                },
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            orderBy: {
                invoiceNumber: 'desc',
            },
        });
        
        let serialNumber = 1;
        
        if (lastOrder && lastOrder.invoiceNumber) {
            // Extract the serial number from the last invoice
            // Format is INV-YYMMDD-XXXX
            const parts = lastOrder.invoiceNumber.split('-');
            if (parts.length === 3) {
                const lastSerial = parseInt(parts[2], 10);
                if (!isNaN(lastSerial)) {
                    serialNumber = lastSerial + 1;
                }
            }
        }
        
        // Format serial with leading zeros (4 digits)
        const serial = String(serialNumber).padStart(4, '0');
        
        return `${datePrefix}-${serial}`;
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

                const invoiceNumber = order.invoiceNumber || `INV-${order.orderNumber || order.id.substring(0, 8).toUpperCase()}`;
                const orderNumber = order.orderNumber || `ORD-${order.id.substring(0, 8).toUpperCase()}`;
                // Use confirmedAt date for invoice, fallback to updatedAt or createdAt
                const invoiceDate = order.confirmedAt || order.updatedAt || order.createdAt;
                const orderDate = new Date(invoiceDate).toLocaleDateString('en-IN');
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
                    doc.fontSize(7).font('Helvetica').fillColor('#666').text(orderNumber, 220, midColY + 42, { width: 120, align: 'center' });
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

    /**
     * Secure invoice generation with better data fetching
     */
    async generateInvoiceSecure(orderId: string): Promise<{ pdfBuffer: Buffer; invoiceNumber: string }> {
        console.log(`[SecureInvoice] Generating for order: ${orderId}`);

        if (!orderId || orderId.trim() === '') {
            throw new Error('Order ID is required');
        }

        // Fetch order with comprehensive data
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
            throw new Error(`Order not found: ${orderId}`);
        }

        // Generate invoice number
        let invoiceNumber = order.invoiceNumber;
        if (!invoiceNumber) {
            invoiceNumber = await this.generateUniqueInvoiceNumber();
            await this.prisma.order.update({
                where: { id: orderId },
                data: { invoiceNumber }
            });
        }

        // Get vendor info from itemsSnapshot
        let vendorName = 'Risbow Store';
        let vendorAddress = 'Bangalore, Karnataka';
        let vendorGST = '29AABCU9603R1ZM';

        const items = Array.isArray(order.itemsSnapshot) ? order.itemsSnapshot : [];
        if (items.length > 0) {
            const firstItem = items[0] as any;
            if (firstItem.vendorId) {
                const vendor = await this.prisma.vendor.findUnique({
                    where: { id: firstItem.vendorId },
                    select: { name: true, storeName: true, pincode: true, gstNumber: true }
                });
                if (vendor) {
                    vendorName = vendor.storeName || vendor.name || 'Risbow Store';
                    vendorAddress = vendor.pincode ? `Pincode: ${vendor.pincode}` : 'Bangalore, Karnataka';
                    vendorGST = vendor.gstNumber || vendorGST;
                }
            }
        }

        // Generate barcode
        let barcodeBuffer: Buffer | null = null;
        const barcodeText = order.orderNumber || order.id;
        try {
            barcodeBuffer = await bwipjs.toBuffer({
                bcid: 'code128',
                text: barcodeText,
                scale: 3,
                height: 10,
                includetext: true,
                textxalign: 'center',
            });
        } catch (err) {
            console.warn('[SecureInvoice] Barcode generation failed:', err.message);
        }

        // Generate QR code for verification
        let qrBuffer: Buffer | null = null;
        try {
            qrBuffer = await bwipjs.toBuffer({
                bcid: 'qrcode',
                text: `RISBOW|INV|${invoiceNumber}|${order.orderNumber}`,
                scale: 3,
                height: 50,
            });
        } catch (err) {
            console.warn('[SecureInvoice] QR generation failed:', err.message);
        }

        // Generate the professional PDF
        const pdfBuffer = await this.generateProfessionalPDF(order, invoiceNumber, vendorName, vendorAddress, vendorGST, barcodeBuffer, qrBuffer);

        return { pdfBuffer, invoiceNumber };
    }

    private generateProfessionalPDF(
        order: any, 
        invoiceNumber: string, 
        vendorName: string, 
        vendorAddress: string, 
        vendorGST: string, 
        barcodeBuffer: Buffer | null,
        qrBuffer: Buffer | null
    ): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 40, size: 'A4' });
                const chunks: Buffer[] = [];
                
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                const orderNumber = order.orderNumber || `ORD-${order.id.substring(0, 8).toUpperCase()}`;
                const invoiceDate = order.confirmedAt || order.updatedAt || order.createdAt;
                const orderDate = new Date(invoiceDate).toLocaleDateString('en-IN', { 
                    day: '2-digit', month: 'long', year: 'numeric' 
                });
                const customerName = order.user?.name || 'Customer';
                const customerMobile = order.user?.mobile || '-';
                const customerEmail = order.user?.email || '-';
                
                const address = order.address || {};
                const shippingAddress = [
                    address.addressLine1 || address.street || '',
                    address.addressLine2 || '',
                    address.city || '',
                    address.state || '',
                    address.pincode || address.postalCode || ''
                ].filter(Boolean).join(', ');

                // ==================== HEADER ====================
                doc.fontSize(28).font('Helvetica-Bold').fillColor('#1a1a2e');
                doc.text('RISBOW', 40, 30);
                
                doc.fontSize(10).font('Helvetica').fillColor('#666');
                doc.text('E-Commerce Platform', 40, 58);
                
                doc.fontSize(22).font('Helvetica-Bold').fillColor('#FD4A6E');
                doc.text('TAX INVOICE', 400, 30, { align: 'right' });
                
                doc.fontSize(9).font('Helvetica').fillColor('#666');
                doc.text('Original for Recipient', 400, 55, { align: 'right' });
                
                doc.moveTo(40, 80).lineTo(560, 80).strokeColor('#1a1a2e').lineWidth(2).stroke();
                
                // ==================== COMPANY & INVOICE INFO ====================
                let yPos = 100;
                
                doc.fontSize(10).font('Helvetica-Bold').fillColor('#333');
                doc.text('From:', 40, yPos);
                doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e');
                doc.text('RISBOW Private Limited', 40, yPos + 14);
                
                doc.fontSize(9).font('Helvetica').fillColor('#666');
                doc.text('Bangalore, Karnataka - 560001', 40, yPos + 28);
                doc.text('GSTIN: 29AABCU9603R1ZM', 40, yPos + 40);
                doc.text('CIN: U72900KA2020PTC123456', 40, yPos + 52);
                
                doc.fontSize(10).font('Helvetica-Bold').fillColor('#333');
                doc.text('Invoice Details:', 200, yPos);
                
                doc.fontSize(9).font('Helvetica').fillColor('#333');
                doc.text(`Invoice #: ${invoiceNumber}`, 200, yPos + 14);
                doc.text(`Order #: ${orderNumber}`, 200, yPos + 26);
                doc.text(`Invoice Date: ${orderDate}`, 200, yPos + 38);
                doc.text(`Payment: ${order.payment?.provider || 'COD'}`, 200, yPos + 50);
                
                if (barcodeBuffer) {
                    doc.image(barcodeBuffer, 200, yPos + 58, { width: 100, height: 30 });
                }
                
                doc.fontSize(10).font('Helvetica-Bold').fillColor('#333');
                doc.text('Bill To:', 400, yPos);
                
                doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e');
                doc.text(customerName, 400, yPos + 14);
                
                doc.fontSize(9).font('Helvetica').fillColor('#333');
                if (shippingAddress) {
                    doc.text(shippingAddress, 400, yPos + 28, { width: 160 });
                }
                doc.text(`Ph: ${customerMobile}`, 400, yPos + 55);
                if (customerEmail !== '-') {
                    doc.text(customerEmail, 400, yPos + 67);
                }
                
                yPos = 190;
                
                // ==================== ITEMS TABLE ====================
                doc.moveTo(40, yPos).lineTo(560, yPos).strokeColor('#ccc').lineWidth(1).stroke();
                yPos += 10;
                
                doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a1a2e');
                doc.text('#', 45, yPos, { width: 25, align: 'center' });
                doc.text('Item Description', 75, yPos, { width: 220 });
                doc.text('HSN', 300, yPos, { width: 50, align: 'center' });
                doc.text('Qty', 355, yPos, { width: 35, align: 'center' });
                doc.text('Rate', 395, yPos, { width: 60, align: 'right' });
                doc.text('Taxable', 460, yPos, { width: 60, align: 'right' });
                
                yPos += 15;
                doc.moveTo(40, yPos).lineTo(560, yPos).strokeColor('#ccc').lineWidth(1).stroke();
                yPos += 8;
                
                const items = Array.isArray(order.itemsSnapshot) ? order.itemsSnapshot : [];
                let totalTaxable = 0;
                let totalCGST = 0;
                let totalSGST = 0;
                
                doc.fontSize(8).font('Helvetica').fillColor('#333');
                
                items.forEach((item: any, index: number) => {
                    const unitPrice = (item.price || item.unitPrice || 0) / 100;
                    const quantity = item.quantity || 1;
                    const taxableValue = unitPrice * quantity;
                    const cgst = taxableValue * 0.09;
                    const sgst = taxableValue * 0.09;
                    
                    totalTaxable += taxableValue;
                    totalCGST += cgst;
                    totalSGST += sgst;
                    
                    const itemName = item.productName || item.productTitle || 'Product';
                    
                    doc.text(String(index + 1), 45, yPos, { width: 25, align: 'center' });
                    doc.text(itemName.substring(0, 40), 75, yPos, { width: 220 });
                    doc.text('-', 300, yPos, { width: 50, align: 'center' });
                    doc.text(String(quantity), 355, yPos, { width: 35, align: 'center' });
                    doc.text(this.formatCurrency(unitPrice * 100), 395, yPos, { width: 60, align: 'right' });
                    doc.text(this.formatCurrency(taxableValue * 100), 460, yPos, { width: 60, align: 'right' });
                    
                    yPos += 18;
                    
                    if (yPos > 700) {
                        doc.addPage();
                        yPos = 40;
                    }
                });
                
                yPos += 5;
                doc.moveTo(40, yPos).lineTo(560, yPos).strokeColor('#1a1a2e').lineWidth(1).stroke();
                yPos += 15;
                
                // ==================== TOTALS ====================
                const shipping = (order.shippingCharges || 0) / 100;
                const discount = (order.coinsUsed || 0) / 100;
                const grandTotal = totalTaxable + totalCGST + totalSGST + shipping - discount;
                
                const totalsX = 350;
                
                doc.fontSize(10).font('Helvetica').fillColor('#333');
                doc.text('Taxable Amount:', totalsX, yPos, { width: 100, align: 'right' });
                doc.text(this.formatCurrency(totalTaxable * 100), totalsX + 105, yPos, { width: 60, align: 'right' });
                yPos += 16;
                
                doc.text('CGST (9%):', totalsX, yPos, { width: 100, align: 'right' });
                doc.text(this.formatCurrency(totalCGST * 100), totalsX + 105, yPos, { width: 60, align: 'right' });
                yPos += 16;
                
                doc.text('SGST (9%):', totalsX, yPos, { width: 100, align: 'right' });
                doc.text(this.formatCurrency(totalSGST * 100), totalsX + 105, yPos, { width: 60, align: 'right' });
                yPos += 16;
                
                if (shipping > 0) {
                    doc.text('Shipping:', totalsX, yPos, { width: 100, align: 'right' });
                    doc.text(this.formatCurrency(shipping * 100), totalsX + 105, yPos, { width: 60, align: 'right' });
                    yPos += 16;
                }
                
                if (discount > 0) {
                    doc.fillColor('#059669');
                    doc.text('Discount:', totalsX, yPos, { width: 100, align: 'right' });
                    doc.text(`-${this.formatCurrency(discount * 100)}`, totalsX + 105, yPos, { width: 60, align: 'right' });
                    doc.fillColor('#333');
                    yPos += 16;
                }
                
                yPos += 5;
                doc.rect(totalsX - 10, yPos - 3, 220, 28).fillAndStroke('#1a1a2e', '#1a1a2e');
                doc.fontSize(12).font('Helvetica-Bold').fillColor('#fff');
                doc.text('Grand Total:', totalsX, yPos + 2, { width: 100, align: 'right' });
                doc.text(this.formatCurrency(grandTotal * 100), totalsX + 105, yPos + 2, { width: 60, align: 'right' });
                yPos += 40;
                
                doc.fontSize(9).font('Helvetica-Oblique').fillColor('#666');
                doc.text(`Amount in Words: ${this.numberToWords(grandTotal)} Rupees Only`, 40, yPos, { width: 500 });
                yPos += 25;
                
                // ==================== FOOTER ====================
                doc.moveTo(40, yPos).lineTo(560, yPos).strokeColor('#ccc').lineWidth(0.5).stroke();
                yPos += 15;
                
                doc.fontSize(9).font('Helvetica-Bold').fillColor('#333');
                doc.text('Terms & Conditions:', 40, yPos);
                yPos += 15;
                
                doc.fontSize(8).font('Helvetica').fillColor('#666');
                const terms = [
                    '1. Goods once sold will not be taken back or exchanged.',
                    '2. Warranty is as per manufacturer terms.',
                    '3. E&O.E.',
                    '4. Dispute subject to Bangalore jurisdiction.',
                ];
                terms.forEach(term => {
                    doc.text(term, 40, yPos, { width: 350 });
                    yPos += 12;
                });
                
                if (qrBuffer) {
                    doc.image(qrBuffer, 450, yPos - 30, { width: 60, height: 60 });
                }
                
                doc.fontSize(8).font('Helvetica').fillColor('#666');
                doc.text('Scan QR to verify', 450, yPos + 35, { width: 60, align: 'center' });
                
                yPos += 50;
                doc.fontSize(8).font('Helvetica').fillColor('#666');
                doc.text('Declaration: We declare that this invoice shows the actual price of the goods described.', 40, yPos, { width: 350 });
                yPos += 15;
                doc.text('This is a computer generated invoice and does not require physical signature.', 40, yPos, { width: 350 });
                
                yPos += 25;
                doc.fontSize(11).font('Helvetica-Bold').fillColor('#FD4A6E');
                doc.text('Thank you for shopping with RISBOW!', 40, yPos, { width: 500, align: 'center' });
                
                doc.moveTo(40, 780).lineTo(560, 780).strokeColor('#1a1a2e').lineWidth(1).stroke();
                doc.fontSize(7).font('Helvetica').fillColor('#999');
                doc.text('RISBOW Private Limited | www.risbow.com | support@risbow.com', 40, 785, { width: 520, align: 'center' });
                
                doc.end();
            } catch (error) {
                console.error('[ProfessionalInvoice] PDF generation error:', error);
                reject(error);
            }
        });
    }
}
