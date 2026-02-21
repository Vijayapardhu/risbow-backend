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

    async generateInvoice(orderId: string, vendorId?: string): Promise<Buffer> {
        console.log(`[Invoice] Starting generation for order: ${orderId}, vendorId: ${vendorId}`);

        try {
            if (!orderId || orderId.trim() === '') {
                throw new Error('Order ID is required');
            }

            // Fetch order with all details
            // Try finding by ID first, then by orderNumber
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
                            Product: true
                        }
                    }
                }
            });

            // If not found by ID, try by orderNumber
            if (!order && orderId) {
                order = await this.prisma.order.findFirst({
                    where: { 
                        OR: [
                            { orderNumber: { equals: orderId, mode: 'insensitive' } },
                            { orderNumber: { contains: orderId, mode: 'insensitive' } }
                        ]
                    },
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, mobile: true }
                        },
                        address: true,
                        payment: true,
                        OrderItem: {
                            include: {
                                Product: true
                            }
                        }
                    }
                });
            }

            // If vendorId is provided, verify the order belongs to that vendor
            if (!order && vendorId) {
                order = await this.prisma.order.findFirst({
                    where: { 
                        OR: [
                            { id: orderId },
                            { orderNumber: { equals: orderId, mode: 'insensitive' } }
                        ]
                    },
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, mobile: true }
                        },
                        address: true,
                        payment: true,
                        OrderItem: {
                            include: {
                                Product: true
                            }
                        }
                    }
                });
            }

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
        let items: any[] = [];
        if (order.OrderItem && order.OrderItem.length > 0) {
            items = order.OrderItem.map(item => ({
                ...item,
                productTitle: item.Product?.title,
                vendorId: item.Product?.vendorId,
                price: item.price || item.Product?.price
            }));
        } else if (Array.isArray(order.itemsSnapshot)) {
             items = order.itemsSnapshot;
        }

        // Group items by vendor
        const itemsByVendor = items.reduce<Record<string, any[]>>((groups, item) => {
            const vendorId = item.vendorId || 'default';
            if (!groups[vendorId]) {
                groups[vendorId] = [];
            }
            groups[vendorId].push(item);
            return groups;
        }, {});

        // Get vendor details for each vendor group
        const vendorGroups: { vendorId: string; vendorName: string; vendorAddress: string; vendorGST: string; items: any[] }[] = await Promise.all(
            Object.entries(itemsByVendor).map(async ([vendorId, vendorItems]) => {
                let vendorName = 'Risbow Store';
                let vendorAddress = 'Risbow HQ, Bangalore, Karnataka - 560001';
                let vendorGST = '29AABCU9603R1ZM';

                if (vendorId !== 'default' && vendorItems[0]?.vendorId) {
                    const vendor = await this.prisma.vendor.findUnique({
                        where: { id: vendorItems[0].vendorId },
                        select: { name: true, storeName: true, pincode: true, gstNumber: true }
                    });
                    if (vendor) {
                        vendorName = vendor.storeName || vendor.name || 'Risbow Store';
                        vendorAddress = vendor.pincode ? `Pincode: ${vendor.pincode}` : vendorAddress;
                        vendorGST = vendor.gstNumber || vendorGST;
                    }
                }

                return {
                    vendorId,
                    vendorName,
                    vendorAddress,
                    vendorGST,
                    items: vendorItems
                };
            })
        );

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

        // Generate PDF - single vendor or multi-vendor
        if (vendorGroups.length === 1) {
            const vendorGroup = vendorGroups[0];
            return this.generatePDF(order, vendorGroup.items, vendorGroup.vendorName, vendorGroup.vendorAddress, vendorGroup.vendorGST, barcodeBuffer);
        } else {
            return this.generateMultiVendorPDF(order, vendorGroups, barcodeBuffer);
        }
        } catch (error) {
            console.error(`[Invoice] Error generating invoice for order ${orderId}:`, error);
            throw error;
        }
    }

    /**
     * Generates a unique short invoice number
     * Format: INV-YYMMDD-XXXX (e.g., INV-260131-0001)
     */
    private async generateUniqueInvoiceNumber(maxRetries = 5): Promise<string> {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
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
            const invoiceNumber = `${datePrefix}-${serial}`;
            
            // Check if this invoice number already exists
            const existing = await this.prisma.order.findFirst({
                where: { invoiceNumber }
            });
            
            if (!existing) {
                return invoiceNumber;
            }
            
            // If it exists, retry with a new number
            console.log(`[Invoice] Collision detected for ${invoiceNumber}, retrying...`);
        }
        
        // Fallback: generate a timestamp-based unique number
        return `INV-${Date.now()}`;
    }

    private generatePDF(order: any, items: any[], vendorName: string, vendorAddress: string, vendorGST: string, barcodeBuffer: Buffer | null): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                console.log('[Invoice] Creating PDF with PDFKit...');
                
                const doc = new PDFDocument({ 
                    size: 'A4', 
                    margin: 40,
                    bufferPages: true,
                    info: { Title: 'Tax Invoice' } 
                });
                const chunks: Buffer[] = [];
                
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(chunks);
                    console.log('[Invoice] PDF generated, size:', pdfBuffer.length, 'bytes');
                    resolve(pdfBuffer);
                });
                doc.on('error', reject);

                // Colors & Config
                const PRIMARY_COLOR = '#E65100'; // Risbow Orange
                const SECONDARY_COLOR = '#1565C0'; // Risbow Blue
                const TEXT_COLOR = '#333333';
                const LIGHT_TEXT = '#666666';
                const BORDER_COLOR = '#E0E0E0';
                const currency = 'INR';
                const locale = 'en-IN';

                const invoiceNumber = order.invoiceNumber || `INV-${order.orderNumber || order.id.slice(0, 8)}`;
                const orderNumber = order.orderNumber || order.id.slice(0, 8);
                const invoiceDate = new Date(order.confirmedAt || order.createdAt).toLocaleDateString(locale);

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
                // Left Column: FROM (Risbow/Vendor)
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
                doc.font('Helvetica').text(`Order No: ${orderNumber}`, detailsX, y + 27);
                doc.text(`Invoice Date: ${invoiceDate}`, detailsX, y + 39);
                doc.text(`Payment Mode: ${order.payment?.provider || 'Prepaid'}`, detailsX, y + 51);
                
                // Barcode under payment info if available
                if (barcodeBuffer) {
                    doc.image(barcodeBuffer, detailsX, y + 65, { width: 100, height: 25 });
                }

                y += 100;

                // --- MIDDLE SECTION: BILL TO & SOLD BY ---
                // Left: BILL TO (Customer)
                doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10).text('Bill To:', 40, y + 10);
                doc.fontSize(10).font('Helvetica-Bold').text(order.user?.name || 'Customer', 40, y + 25);
                doc.fontSize(9).font('Helvetica').fillColor(TEXT_COLOR);
                
                if (order.address) {
                    const addr = order.address;
                    const addressLines = [
                        addr.addressLine1 || addr.street,
                        addr.addressLine2,
                        `${addr.city}, ${addr.state} - ${addr.pincode || addr.postalCode}`
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
                doc.fontSize(10).font('Helvetica-Bold').text(vendorName, soldByX, y + 25);
                doc.fontSize(9).font('Helvetica').fillColor(TEXT_COLOR);
                doc.text(vendorAddress, soldByX, y + 38, { width: 200 });
                if (vendorGST) doc.text(`GSTIN: ${vendorGST}`, soldByX, y + 55);

                y += 100;

                // --- ITEMS TABLE ---
                const colX = {
                    sn: 40,
                    desc: 70,
                    hsn: 250,
                    qty: 300,
                    rate: 340,
                    taxable: 400,
                    total: 510
                };

                // Table Header
                doc.rect(40, y, 515, 25).fillColor('#F5F5F5').fill();
                doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
                doc.text('#', colX.sn + 5, y + 8);
                doc.text('Item Description', colX.desc, y + 8);
                doc.text('HSN', colX.hsn, y + 8);
                doc.text('Qty', colX.qty, y + 8, { width: 30, align: 'center' });
                doc.text('Rate', colX.rate, y + 8, { width: 50, align: 'right' });
                doc.text('Taxable', colX.taxable, y + 8, { width: 50, align: 'right' });
                doc.text('Total', colX.total, y + 8, { width: 45, align: 'right' });

                y += 25;

                // Table Rows
                let subtotal = 0;
                let totalTax = 0;

                items.forEach((item: any, index: number) => {
                    if (y > 700) {
                        doc.addPage();
                        y = 50;
                    }

                    const quantity = Number(item.quantity) || 1;
                    
                    // Use database values directly to match Admin Panel
                    // Admin Panel "Item Total" = Taxable Amount (Subtotal)
                    const itemSubtotal = Number(item.subtotal) || 0;
                    const itemTax = Number(item.tax) || 0;
                    
                    // If subtotal is missing (legacy data), fallback to simple calc
                    // But for new orders, item.subtotal is reliable
                    const taxableVal = itemSubtotal > 0 ? itemSubtotal : ((Number(item.price) || 0) * quantity);
                    
                    // Effective Unit Rate (Taxable)
                    const unitRate = taxableVal / quantity;

                    subtotal += taxableVal;
                    totalTax += itemTax;

                    doc.fillColor(TEXT_COLOR).font('Helvetica').fontSize(9);
                    
                    // Row Background (Alternating)
                    const rowHeight = 30;
                    if (index % 2 === 1) doc.rect(40, y, 515, rowHeight).fillColor('#FAFAFA').fill();
                    
                    doc.fillColor(TEXT_COLOR);
                    const textY = y + 10;

                    doc.text((index + 1).toString(), colX.sn + 5, textY);
                    
                    const productName = item.productName || item.productTitle || item.title || item.name || item.product?.title || 'Product';
                    doc.text(productName, colX.desc, textY, { width: 170, ellipsis: true });
                    
                    doc.text('-', colX.hsn, textY); // HSN placeholder
                    doc.text(quantity.toString(), colX.qty, textY, { width: 30, align: 'center' });
                    
                    // Rate (Taxable Unit Price)
                    doc.text(this.formatCurrency(unitRate), colX.rate, textY, { width: 50, align: 'right' });
                    
                    // Taxable Value
                    doc.text(this.formatCurrency(taxableVal), colX.taxable, textY, { width: 50, align: 'right' });
                    
                    // Total (Displaying Taxable Amount to match Admin UI Subtotal logic)
                    doc.font('Helvetica-Bold').text(this.formatCurrency(taxableVal), colX.total, textY, { width: 45, align: 'right' });

                    y += rowHeight;
                });

                // Line after items
                doc.moveTo(40, y).lineTo(555, y).strokeColor(BORDER_COLOR).stroke();
                y += 10;

                // --- FOOTER SECTION ---
                const footerY = y;
                
                // Calculate Grand Total from components to ensure exact match with displayed values
                const shippingCharges = Number(order.shippingCharges) || 0;
                const calculatedGrandTotal = subtotal + totalTax + shippingCharges;

                // Left Side: Amount in Words & Terms
                doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_COLOR).text('Amount in Words:', 40, footerY);
                doc.font('Helvetica-Oblique').text(`${this.numberToWords(Math.round(calculatedGrandTotal))} Rupees Only`, 40, footerY + 12);

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
                doc.text(this.formatCurrency(subtotal), valX, totalsY, { width: 105, align: 'right' });
                totalsY += 15;

                // CGST (9%) - Split total tax
                doc.text('CGST (9%):', labelX, totalsY, { width: 100, align: 'right' });
                doc.text(this.formatCurrency(totalTax / 2), valX, totalsY, { width: 105, align: 'right' });
                totalsY += 15;

                // SGST (9%)
                doc.text('SGST (9%):', labelX, totalsY, { width: 100, align: 'right' });
                doc.text(this.formatCurrency(totalTax / 2), valX, totalsY, { width: 105, align: 'right' });
                totalsY += 15;

                // Shipping
                doc.text('Shipping:', labelX, totalsY, { width: 100, align: 'right' });
                doc.text(this.formatCurrency(shippingCharges), valX, totalsY, { width: 105, align: 'right' });
                totalsY += 15;

                // Grand Total Box
                totalsY += 5;
                doc.rect(labelX - 10, totalsY - 5, 225, 25).fillColor('#212121').fill();
                doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10);
                doc.text('Grand Total:', labelX, totalsY + 2, { width: 100, align: 'right' });
                doc.fontSize(11).text(this.formatCurrency(calculatedGrandTotal), valX, totalsY + 1, { width: 105, align: 'right' });

                // Computer Generated Message (Replaces Signature)
                const sigY = termsY + 60;
                doc.fillColor(TEXT_COLOR).fontSize(9).font('Helvetica-Oblique');
                doc.text('This is a computer generated invoice.', 350, sigY, { width: 200, align: 'center' });
                doc.text('No signature required.', 350, sigY + 12, { width: 200, align: 'center' });
                
                doc.end();
            } catch (error) {
                console.error('[Invoice] PDF generation error:', error);
                reject(error);
            }
        });
    }

    private generateMultiVendorPDF(
        order: any, 
        vendorGroups: { vendorId: string; vendorName: string; vendorAddress: string; vendorGST: string; items: any[] }[],
        barcodeBuffer: Buffer | null
    ): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                console.log('[Invoice] Creating multi-vendor PDF with PDFKit...');
                
                const doc = new PDFDocument({ 
                    size: 'A4', 
                    margin: 40,
                    bufferPages: true,
                    info: { Title: 'Tax Invoice - Multiple Vendors' } 
                });
                const chunks: Buffer[] = [];
                
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(chunks);
                    console.log('[Invoice] Multi-vendor PDF generated, size:', pdfBuffer.length, 'bytes');
                    resolve(pdfBuffer);
                });
                doc.on('error', reject);

                // Colors & Config
                const PRIMARY_COLOR = '#E65100';
                const SECONDARY_COLOR = '#1565C0';
                const TEXT_COLOR = '#333333';
                const LIGHT_TEXT = '#666666';
                const BORDER_COLOR = '#E0E0E0';
                const locale = 'en-IN';

                const invoiceNumber = order.invoiceNumber || `INV-${order.orderNumber || order.id.slice(0, 8)}`;
                const orderNumber = order.orderNumber || order.id.slice(0, 8);
                const invoiceDate = new Date(order.confirmedAt || order.createdAt).toLocaleDateString(locale);

                // Generate a page for each vendor
                vendorGroups.forEach((vendorGroup, vendorIndex) => {
                    if (vendorIndex > 0) {
                        doc.addPage();
                    }

                    const items = vendorGroup.items;
                    const vendorName = vendorGroup.vendorName;
                    const vendorAddress = vendorGroup.vendorAddress;
                    const vendorGST = vendorGroup.vendorGST;

                    // --- HEADER ---
                    const logoPath = 'c:\\office\\risbow-frontend\\assets\\images\\logo.png';
                    if (fs.existsSync(logoPath)) {
                        doc.image(logoPath, 40, 40, { width: 120 });
                    } else {
                        doc.fontSize(20).fillColor(SECONDARY_COLOR).font('Helvetica-Bold').text('Risbow', 40, 50);
                    }

                    // Title - show page number for multi-vendor
                    doc.fontSize(20).fillColor('#EF5350').font('Helvetica-Bold').text('TAX INVOICE', 350, 45, { align: 'right' });
                    doc.fontSize(9).fillColor(LIGHT_TEXT).font('Helvetica').text(`Page ${vendorIndex + 1} of ${vendorGroups.length}`, 350, 70, { align: 'right' });
                    doc.fontSize(9).fillColor(LIGHT_TEXT).text('Original for Recipient', 430, 70, { align: 'right' });

                    // Separator
                    doc.moveTo(40, 90).lineTo(555, 90).strokeColor(SECONDARY_COLOR).lineWidth(2).stroke();

                    let y = 110;

                    // --- TOP SECTION ---
                    doc.fontSize(10).fillColor(LIGHT_TEXT).font('Helvetica').text('From:', 40, y);
                    doc.fontSize(11).fillColor('#000000').font('Helvetica-Bold').text('RISBOW Private Limited', 40, y + 15);
                    doc.fontSize(9).fillColor(TEXT_COLOR).font('Helvetica');
                    doc.text('Bangalore, Karnataka - 560001', 40, y + 30);
                    doc.text('GSTIN: 29AABCU9603R1ZM', 40, y + 42);
                    doc.text('Email: support@risbow.com', 40, y + 54);

                    const detailsX = 350;
                    doc.fontSize(10).fillColor(LIGHT_TEXT).text('Invoice Details:', detailsX, y);
                    doc.fontSize(9).fillColor(TEXT_COLOR);
                    doc.font('Helvetica-Bold').text(`Invoice No: ${invoiceNumber}`, detailsX, y + 15);
                    doc.font('Helvetica').text(`Order No: ${orderNumber}`, detailsX, y + 27);
                    doc.text(`Invoice Date: ${invoiceDate}`, detailsX, y + 39);
                    doc.text(`Vendor: ${vendorName}`, detailsX, y + 51);
                    
                    if (barcodeBuffer) {
                        doc.image(barcodeBuffer, detailsX, y + 65, { width: 100, height: 25 });
                    }

                    y += 100;

                    // --- BILL TO & SOLD BY ---
                    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10).text('Bill To:', 40, y + 10);
                    doc.fontSize(10).font('Helvetica-Bold').text(order.user?.name || 'Customer', 40, y + 25);
                    doc.fontSize(9).font('Helvetica').fillColor(TEXT_COLOR);
                    
                    if (order.address) {
                        const addr = order.address;
                        const addressLines = [
                            addr.addressLine1 || addr.street,
                            addr.addressLine2,
                            `${addr.city}, ${addr.state} - ${addr.pincode || addr.postalCode}`
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

                    const soldByX = 350;
                    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10).text('Sold By:', soldByX, y + 10);
                    doc.fontSize(10).font('Helvetica-Bold').text(vendorName, soldByX, y + 25);
                    doc.fontSize(9).font('Helvetica').fillColor(TEXT_COLOR);
                    doc.text(vendorAddress, soldByX, y + 38, { width: 200 });
                    if (vendorGST) doc.text(`GSTIN: ${vendorGST}`, soldByX, y + 55);

                    y += 100;

                    // --- ITEMS TABLE ---
                    const colX = {
                        sn: 40,
                        desc: 70,
                        hsn: 250,
                        qty: 300,
                        rate: 340,
                        taxable: 400,
                        total: 510
                    };

                    doc.rect(40, y, 515, 25).fillColor('#F5F5F5').fill();
                    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
                    doc.text('#', colX.sn + 5, y + 8);
                    doc.text('Item Description', colX.desc, y + 8);
                    doc.text('HSN', colX.hsn, y + 8);
                    doc.text('Qty', colX.qty, y + 8, { width: 30, align: 'center' });
                    doc.text('Rate', colX.rate, y + 8, { width: 50, align: 'right' });
                    doc.text('Taxable', colX.taxable, y + 8, { width: 50, align: 'right' });
                    doc.text('Total', colX.total, y + 8, { width: 45, align: 'right' });

                    y += 25;

                    let subtotal = 0;
                    let totalTax = 0;

                    items.forEach((item: any, index: number) => {
                        if (y > 700) {
                            doc.addPage();
                            y = 50;
                        }

                        const quantity = Number(item.quantity) || 1;
                        const itemSubtotal = Number(item.subtotal) || 0;
                        const itemTax = Number(item.tax) || 0;
                        const taxableVal = itemSubtotal > 0 ? itemSubtotal : ((Number(item.price) || 0) * quantity);
                        const unitRate = taxableVal / quantity;

                        subtotal += taxableVal;
                        totalTax += itemTax;

                        doc.fillColor(TEXT_COLOR).font('Helvetica').fontSize(9);
                        
                        const rowHeight = 30;
                        if (index % 2 === 1) doc.rect(40, y, 515, rowHeight).fillColor('#FAFAFA').fill();
                        
                        doc.fillColor(TEXT_COLOR);
                        const textY = y + 10;

                        doc.text((index + 1).toString(), colX.sn + 5, textY);
                        
                        const productName = item.productName || item.productTitle || item.title || item.name || item.product?.title || 'Product';
                        doc.text(productName, colX.desc, textY, { width: 170, ellipsis: true });
                        
                        doc.text('-', colX.hsn, textY);
                        doc.text(quantity.toString(), colX.qty, textY, { width: 30, align: 'center' });
                        doc.text(this.formatCurrency(unitRate), colX.rate, textY, { width: 50, align: 'right' });
                        doc.text(this.formatCurrency(taxableVal), colX.taxable, textY, { width: 50, align: 'right' });
                        doc.font('Helvetica-Bold').text(this.formatCurrency(taxableVal), colX.total, textY, { width: 45, align: 'right' });

                        y += rowHeight;
                    });

                    doc.moveTo(40, y).lineTo(555, y).strokeColor(BORDER_COLOR).stroke();
                    y += 10;

                    // --- FOOTER SECTION ---
                    const footerY = y;
                    const shippingCharges = Number(order.shippingCharges) || 0;
                    const vendorShipping = shippingCharges / vendorGroups.length;
                    const calculatedGrandTotal = subtotal + totalTax + vendorShipping;

                    doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_COLOR).text('Amount in Words:', 40, footerY);
                    doc.font('Helvetica-Oblique').text(`${this.numberToWords(Math.round(calculatedGrandTotal))} Rupees Only`, 40, footerY + 12);

                    const termsY = footerY + 40;
                    doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_COLOR).text('Terms & Conditions:', 40, termsY);
                    doc.fontSize(8).font('Helvetica').fillColor(LIGHT_TEXT);
                    doc.text('1. Goods once sold cannot be returned or exchanged.', 40, termsY + 12);
                    doc.text('2. Warranty is as per manufacturer terms.', 40, termsY + 24);
                    doc.text('3. This is a computer generated invoice and does not require signature.', 40, termsY + 36);

                    let totalsY = footerY;
                    const labelX = 340;
                    const valX = 450;
                    
                    doc.fontSize(9).font('Helvetica').fillColor(TEXT_COLOR);
                    doc.text('Taxable Amount:', labelX, totalsY, { width: 100, align: 'right' });
                    doc.text(this.formatCurrency(subtotal), valX, totalsY, { width: 105, align: 'right' });
                    totalsY += 15;

                    doc.text('CGST (9%):', labelX, totalsY, { width: 100, align: 'right' });
                    doc.text(this.formatCurrency(totalTax / 2), valX, totalsY, { width: 105, align: 'right' });
                    totalsY += 15;

                    doc.text('SGST (9%):', labelX, totalsY, { width: 100, align: 'right' });
                    doc.text(this.formatCurrency(totalTax / 2), valX, totalsY, { width: 105, align: 'right' });
                    totalsY += 15;

                    doc.text('Shipping:', labelX, totalsY, { width: 100, align: 'right' });
                    doc.text(this.formatCurrency(vendorShipping), valX, totalsY, { width: 105, align: 'right' });
                    totalsY += 15;

                    totalsY += 5;
                    doc.rect(labelX - 10, totalsY - 5, 225, 25).fillColor('#212121').fill();
                    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10);
                    doc.text('Total:', labelX, totalsY + 2, { width: 100, align: 'right' });
                    doc.fontSize(11).text(this.formatCurrency(calculatedGrandTotal), valX, totalsY + 1, { width: 105, align: 'right' });

                    const sigY = termsY + 60;
                    doc.fillColor(TEXT_COLOR).fontSize(9).font('Helvetica-Oblique');
                    doc.text('This is a computer generated invoice.', 350, sigY, { width: 200, align: 'center' });
                    doc.text('No signature required.', 350, sigY + 12, { width: 200, align: 'center' });
                });

                doc.end();
            } catch (error) {
                console.error('[Invoice] Multi-vendor PDF generation error:', error);
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
