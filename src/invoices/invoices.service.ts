import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import puppeteer from 'puppeteer';
import bwipjs from 'bwip-js';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InvoicesService {
    constructor(private prisma: PrismaService) {}

    private async findChromeExecutable(): Promise<string | undefined> {
        // Check environment variable first
        if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
            return process.env.PUPPETEER_EXECUTABLE_PATH;
        }

        // Common Chrome/Chromium paths
        const possiblePaths = [
            // Render.com specific
            '/opt/render/.cache/puppeteer/chrome/linux-*/chrome-linux/chrome',
            '/opt/render/.cache/puppeteer/chrome/*/chrome-linux/chrome',
            // Linux
            '/usr/bin/google-chrome',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            // macOS
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            // Windows
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        ];

        for (const chromePath of possiblePaths) {
            try {
                // Handle glob patterns for Render.com
                if (chromePath.includes('*')) {
                    const basePath = chromePath.split('*')[0];
                    if (fs.existsSync(basePath)) {
                        const dirs = fs.readdirSync(basePath);
                        for (const dir of dirs) {
                            const fullPath = path.join(basePath, dir, 'chrome-linux', 'chrome');
                            if (fs.existsSync(fullPath)) {
                                return fullPath;
                            }
                        }
                    }
                } else if (fs.existsSync(chromePath)) {
                    return chromePath;
                }
            } catch (e) {
                // Continue to next path
            }
        }

        return undefined;
    }

    async generateInvoice(orderId: string): Promise<Buffer> {
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
            throw new NotFoundException('Order not found');
        }

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

        // Generate barcode for order ID (try-catch to handle errors gracefully)
        let barcodeDataUrl = '';
        try {
            const barcodeBuffer = await bwipjs.toBuffer({
                bcid: 'code128',
                text: order.id,
                scale: 3,
                height: 10,
                includetext: true,
                textxalign: 'center',
            });
            barcodeDataUrl = `data:image/png;base64,${barcodeBuffer.toString('base64')}`;
        } catch (barcodeError) {
            console.warn('Barcode generation failed:', barcodeError.message);
            // Continue without barcode
        }

        // Generate HTML for invoice
        const html = this.generateInvoiceHTML(order, items, vendorName, vendorAddress, vendorGST, barcodeDataUrl);

        // Try to generate PDF using Puppeteer
        let browser;
        try {
            // Launch options for Render.com and other cloud providers
            const launchOptions: any = {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process'
                ]
            };

            // Find Chrome executable
            const chromePath = await this.findChromeExecutable();
            if (chromePath) {
                console.log('Using Chrome at:', chromePath);
                launchOptions.executablePath = chromePath;
            } else {
                console.log('Using Puppeteer bundled Chrome');
            }

            browser = await puppeteer.launch(launchOptions);

            const page = await browser.newPage();
            
            // Set viewport
            await page.setViewport({ width: 794, height: 1123 }); // A4 at 96 DPI
            
            // Set content with shorter timeout
            await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
            
            // Small delay to ensure styles are applied
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
                preferCSSPageSize: true
            });

            return Buffer.from(pdf);
        } catch (puppeteerError) {
            console.error('Puppeteer PDF generation failed:', puppeteerError.message);
            console.log('Falling back to HTML invoice...');
            
            // Fallback: Return HTML as a simple "PDF" (browser can print to PDF)
            const htmlBuffer = Buffer.from(html, 'utf-8');
            return htmlBuffer;
        } finally {
            if (browser) {
                await browser.close().catch(err => console.error('Browser close error:', err));
            }
        }
    }

    private generateInvoiceHTML(order: any, items: any[], vendorName: string, vendorAddress: string, vendorGST: string, barcodeDataUrl: string): string {
        const invoiceNumber = `INV-${order.id.substring(0, 8).toUpperCase()}`;
        const orderNumber = order.orderNumber || `ORD-${order.id.substring(0, 8).toUpperCase()}`;
        const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN');
        
        // Calculate totals
        const invoiceItems = items.map((item: any, index: number) => {
            const unitPrice = item.price || item.unitPrice || 0;
            const quantity = item.quantity || 1;
            const taxableValue = unitPrice * quantity;
            const cgstRate = 9;
            const sgstRate = 9;
            const cgst = Math.round((taxableValue * cgstRate) / 100);
            const sgst = Math.round((taxableValue * sgstRate) / 100);
            
            return {
                sno: index + 1,
                name: item.productName || item.name || item.product?.title || 'Product',
                quantity,
                unitPrice,
                taxableValue,
                cgstRate,
                sgstRate,
                cgst,
                sgst,
                total: taxableValue + cgst + sgst
            };
        });

        const totalTaxable = invoiceItems.reduce((sum, item) => sum + item.taxableValue, 0);
        const totalCGST = invoiceItems.reduce((sum, item) => sum + item.cgst, 0);
        const totalSGST = invoiceItems.reduce((sum, item) => sum + item.sgst, 0);
        const shipping = order.shippingCharges || 0;
        const discount = order.coinsUsed || 0;
        const grandTotal = totalTaxable + totalCGST + totalSGST + shipping - discount;

        // Handle pagination - split items into pages (10 items per page)
        const itemsPerPage = 10;
        const totalPages = Math.ceil(invoiceItems.length / itemsPerPage);
        
        // Generate pages
        let pagesHTML = '';
        for (let page = 0; page < totalPages; page++) {
            const pageItems = invoiceItems.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
            const isLastPage = page === totalPages - 1;
            
            pagesHTML += this.generatePageHTML({
                page,
                totalPages,
                isLastPage,
                items: pageItems,
                order,
                invoiceNumber,
                orderNumber,
                orderDate,
                vendorName,
                vendorAddress,
                vendorGST,
                totals: { totalTaxable, totalCGST, totalSGST, shipping, discount, grandTotal },
                showTotals: isLastPage,
                barcodeDataUrl
            });
        }

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
            color: #333;
            font-size: 12px;
        }
        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm;
            page-break-after: always;
            position: relative;
        }
        .page:last-child {
            page-break-after: avoid;
        }
        
        /* Security Watermark */
        .security-watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 60px;
            color: rgba(200, 200, 200, 0.15);
            font-weight: bold;
            pointer-events: none;
            z-index: 0;
            letter-spacing: 10px;
        }
        
        /* Barcode styling */
        .barcode-container {
            margin-top: 10px;
            text-align: center;
            padding: 5px;
            background: #f9f9f9;
            border: 1px dashed #ddd;
            border-radius: 4px;
        }
        .barcode-container img {
            max-width: 100%;
            height: 50px;
        }
        .barcode-text {
            font-size: 9px;
            color: #666;
            margin-top: 2px;
            font-family: monospace;
        }
        
        /* Header */
        .header {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header-left h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 2px;
        }
        .header-left p {
            margin: 5px 0 0 0;
            opacity: 0.8;
            font-size: 11px;
        }
        .logo {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .logo-icon {
            width: 50px;
            height: 50px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 24px;
            color: #1a1a2e;
        }
        .logo-text {
            font-size: 24px;
            font-weight: 700;
        }
        .logo-sub {
            font-size: 10px;
            opacity: 0.7;
        }
        
        /* Info Grid */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            border: 2px solid #1a1a2e;
            border-top: none;
        }
        .info-box {
            padding: 15px;
            border-right: 1px solid #ddd;
        }
        .info-box:last-child {
            border-right: none;
        }
        .info-label {
            font-size: 10px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 8px;
        }
        .info-value {
            font-size: 13px;
            font-weight: 600;
            color: #1a1a2e;
        }
        .info-sub {
            font-size: 11px;
            color: #666;
            margin-top: 3px;
        }
        
        /* Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            border: 2px solid #1a1a2e;
        }
        .items-table th {
            background: #f5f5f5;
            padding: 10px 8px;
            text-align: left;
            font-size: 10px;
            font-weight: 600;
            color: #333;
            border-bottom: 2px solid #1a1a2e;
            border-right: 1px solid #ddd;
        }
        .items-table th:last-child {
            border-right: none;
        }
        .items-table td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
            border-right: 1px solid #eee;
            font-size: 11px;
        }
        .items-table td:last-child {
            border-right: none;
        }
        .items-table tr:last-child td {
            border-bottom: 2px solid #1a1a2e;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        /* Totals */
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
        }
        .totals-box {
            width: 280px;
            border: 2px solid #1a1a2e;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 15px;
            border-bottom: 1px solid #ddd;
        }
        .total-row:last-child {
            border-bottom: none;
            background: #f5f5f5;
            font-weight: 700;
            font-size: 14px;
        }
        
        /* Footer */
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #1a1a2e;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        .declaration {
            font-size: 10px;
            color: #666;
            max-width: 60%;
        }
        .declaration-title {
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }
        .signature {
            text-align: center;
        }
        .signature-line {
            width: 150px;
            border-top: 2px solid #333;
            margin-bottom: 5px;
        }
        .thank-you {
            text-align: center;
            margin-top: 20px;
            font-weight: 600;
            color: #1a1a2e;
        }
        
        /* Page number */
        .page-number {
            position: absolute;
            bottom: 10mm;
            right: 15mm;
            font-size: 10px;
            color: #999;
        }
        
        /* Amount in words */
        .amount-words {
            margin-top: 15px;
            padding: 10px;
            background: #f9f9f9;
            border: 1px solid #ddd;
            font-size: 11px;
            font-style: italic;
        }
    </style>
</head>
<body>
    ${pagesHTML}
</body>
</html>`;
    }

    private generatePageHTML({
        page,
        totalPages,
        isLastPage,
        items,
        order,
        invoiceNumber,
        orderNumber,
        orderDate,
        vendorName,
        vendorAddress,
        vendorGST,
        totals,
        showTotals,
        barcodeDataUrl
    }: any): string {
        const customerName = order.user?.name || order.customerName || 'Customer';
        const customerMobile = order.user?.mobile || order.customerMobile || '-';
        const customerEmail = order.user?.email || order.customerEmail || '-';
        
        const address = order.address || {};
        const shippingAddress = [
            address.addressLine1 || address.street || '',
            address.addressLine2 || '',
            address.city || '',
            address.state || '',
            address.country || 'India',
            address.pincode || address.postalCode || ''
        ].filter(Boolean).join(', ');

        const formatCurrency = (amount: number) => {
            return '₹' + amount.toLocaleString('en-IN');
        };

        const itemsHTML = items.map((item: any) => `
            <tr>
                <td class="text-center">${item.sno}</td>
                <td>${item.name}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.unitPrice)}</td>
                <td class="text-right">${formatCurrency(item.taxableValue)}</td>
                <td class="text-right">${item.cgstRate}%<br><small>${formatCurrency(item.cgst)}</small></td>
                <td class="text-right">${item.sgstRate}%<br><small>${formatCurrency(item.sgst)}</small></td>
                <td class="text-right"><strong>${formatCurrency(item.total)}</strong></td>
            </tr>
        `).join('');

        const totalsHTML = showTotals ? `
            <div class="totals-section">
                <div class="totals-box">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>${formatCurrency(totals.totalTaxable)}</span>
                    </div>
                    <div class="total-row">
                        <span>CGST (9%):</span>
                        <span>${formatCurrency(totals.totalCGST)}</span>
                    </div>
                    <div class="total-row">
                        <span>SGST (9%):</span>
                        <span>${formatCurrency(totals.totalSGST)}</span>
                    </div>
                    ${totals.shipping > 0 ? `
                    <div class="total-row">
                        <span>Shipping:</span>
                        <span>${formatCurrency(totals.shipping)}</span>
                    </div>
                    ` : ''}
                    ${totals.discount > 0 ? `
                    <div class="total-row">
                        <span style="color: #059669;">Discount:</span>
                        <span style="color: #059669;">-${formatCurrency(totals.discount)}</span>
                    </div>
                    ` : ''}
                    <div class="total-row">
                        <span>Grand Total:</span>
                        <span>${formatCurrency(totals.grandTotal)}</span>
                    </div>
                </div>
            </div>
            
            <div class="amount-words">
                Amount in words: ${this.numberToWords(totals.grandTotal)} Rupees Only
            </div>
            
            <div class="footer">
                <div class="declaration">
                    <div class="declaration-title">Declaration:</div>
                    <p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
                    <p style="margin-top: 10px;">This is a computer generated invoice and does not require signature.</p>
                </div>
                <div class="signature">
                    <div class="signature-line"></div>
                    <p>Authorized Signatory</p>
                </div>
            </div>
            
            <div class="thank-you">
                Thank you for shopping with Risbow!
            </div>
        ` : `
            <div style="text-align: center; margin-top: 30px; color: #999; font-size: 11px;">
                Continued on next page...
            </div>
        `;

        return `
    <div class="page">
        <div class="security-watermark">SECURE</div>
        <div class="header">
            <div class="header-left">
                <h1>TAX INVOICE</h1>
                <p>Original for Recipient</p>
            </div>
            <div class="logo">
                <div class="logo-icon">R</div>
                <div>
                    <div class="logo-text">RISBOW</div>
                    <div class="logo-sub">HyperLocal Multivendor</div>
                </div>
            </div>
        </div>
        
        <div class="info-grid">
            <div class="info-box">
                <div class="info-label">Sold By:</div>
                <div class="info-value">${vendorName}</div>
                <div class="info-sub">${vendorAddress}</div>
                <div class="info-sub" style="margin-top: 8px;"><strong>GSTIN:</strong> ${vendorGST}</div>
            </div>
            <div class="info-box">
                <div class="info-label">Invoice Details:</div>
                <div class="info-sub"><strong>Invoice #:</strong> ${invoiceNumber}</div>
                <div class="info-sub"><strong>Order #:</strong> ${orderNumber}</div>
                <div class="info-sub"><strong>Date:</strong> ${orderDate}</div>
                <div class="info-sub"><strong>Payment:</strong> ${order.payment?.provider || 'COD'}</div>
                ${barcodeDataUrl ? `
                <div class="barcode-container">
                    <img src="${barcodeDataUrl}" alt="Order Barcode" />
                    <div class="barcode-text">${order.id}</div>
                </div>
                ` : `
                <div style="margin-top: 10px; padding: 10px; background: #f5f5f5; border: 1px dashed #ddd; border-radius: 4px; text-align: center;">
                    <div style="font-size: 10px; color: #666; font-family: monospace;">Order ID: ${order.id}</div>
                </div>
                `}
            </div>
            <div class="info-box">
                <div class="info-label">Bill To:</div>
                <div class="info-value">${customerName}</div>
                <div class="info-sub">${shippingAddress || 'Address not available'}</div>
                <div class="info-sub" style="margin-top: 8px;"><strong>Phone:</strong> ${customerMobile}</div>
                <div class="info-sub"><strong>Email:</strong> ${customerEmail}</div>
            </div>
        </div>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 40px;">#</th>
                    <th>Item Description</th>
                    <th style="width: 50px;" class="text-center">Qty</th>
                    <th style="width: 80px;" class="text-right">Unit Price</th>
                    <th style="width: 80px;" class="text-right">Amount</th>
                    <th style="width: 80px;" class="text-right">CGST</th>
                    <th style="width: 80px;" class="text-right">SGST</th>
                    <th style="width: 90px;" class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>
        
        ${totalsHTML}
        
        ${totalPages > 1 ? `<div class="page-number">Page ${page + 1} of ${totalPages}</div>` : ''}
    </div>
        `;
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
