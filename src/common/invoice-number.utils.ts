import { PrismaService } from '../prisma/prisma.service';

/**
 * Generates a short invoice number in the format: INV-YY-XXXXXX
 * Example: INV-26-000001
 * 
 * - INV: Fixed prefix
 * - YY: 2-digit year (e.g., 26 for 2026)
 * - XXXXXX: 6-digit sequential number with leading zeros (000001-999999)
 * 
 * The serial resets every year
 */
export async function generateInvoiceNumber(prisma: PrismaService): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const shortYear = String(year).slice(-2); // Last 2 digits of year
    const prefix = `INV-${shortYear}`;
    
    // Get the start and end of the current year
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
    
    // Find the last invoice number for this year
    // We need to query orders that have an invoice number
    const lastOrder = await prisma.order.findFirst({
        where: {
            orderNumber: {
                startsWith: prefix,
            },
            createdAt: {
                gte: startOfYear,
                lte: endOfYear,
            },
        },
        orderBy: {
            orderNumber: 'desc',
        },
    });
    
    let serialNumber = 1;
    
    if (lastOrder && lastOrder.orderNumber) {
        // Extract the serial number from the last order
        // Format is INV-26-000001, so we extract the number after the last dash
        const match = lastOrder.orderNumber.match(/INV-\d{2}-(\d{6})$/);
        if (match) {
            const lastSerial = parseInt(match[1], 10);
            if (!isNaN(lastSerial)) {
                serialNumber = lastSerial + 1;
            }
        }
    }
    
    // Format serial with leading zeros (6 digits)
    const serial = String(serialNumber).padStart(6, '0');
    
    return `${prefix}-${serial}`;
}

/**
 * Alternative: Generates a short invoice number based on order number
 * Format: INV-ORDERNUMBER
 * Example: INV-RIS2026JAN0001
 */
export function generateInvoiceNumberFromOrder(orderNumber: string): string {
    if (!orderNumber) {
        // Fallback to timestamp-based short code
        const timestamp = Date.now().toString(36).toUpperCase();
        return `INV-${timestamp.slice(-6)}`;
    }
    return `INV-${orderNumber}`;
}

/**
 * Generates a simple short invoice number
 * Format: INV-YYMMDD-XXXX
 * Example: INV-260131-0001
 */
export async function generateShortInvoiceNumber(prisma: PrismaService): Promise<string> {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `INV-${year}${month}${day}`;
    
    // Get start and end of today
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    // Count orders created today to determine next serial
    const count = await prisma.order.count({
        where: {
            createdAt: {
                gte: startOfDay,
                lte: endOfDay,
            },
        },
    });
    
    // Use count + 1 as serial
    const serial = String(count + 1).padStart(4, '0');
    
    return `${datePrefix}-${serial}`;
}

/**
 * Validates if a string matches the invoice number format
 */
export function isValidInvoiceNumber(invoiceNumber: string): boolean {
    // Matches INV-YY-XXXXXX or INV-ORDERNUMBER or INV-YYMMDD-XXXX
    const pattern = /^INV-((\d{2}-\d{6})|([A-Z0-9]+)|(\d{6}-\d{4}))$/;
    return pattern.test(invoiceNumber);
}
