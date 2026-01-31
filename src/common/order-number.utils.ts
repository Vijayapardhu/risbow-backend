import { PrismaService } from '../prisma/prisma.service';

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Generates an order number in the format: RISYEARMMMXXXX
 * Example: RIS2026JAN0001
 * 
 * - RIS: Fixed prefix
 * - YEAR: 4-digit year (e.g., 2026)
 * - MMM: 3-letter month name (JAN, FEB, MAR, etc.)
 * - XXXX: 4-digit serial number with leading zeros (0001-9999)
 * 
 * The serial resets every month
 */
export async function generateOrderNumber(prisma: PrismaService): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const monthName = MONTH_NAMES[now.getMonth()];
    const prefix = `RIS${year}${monthName}`;
    
    // Get the start of the current month
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Find the last order number for this month
    const lastOrder = await prisma.order.findFirst({
        where: {
            orderNumber: {
                startsWith: prefix,
            },
            createdAt: {
                gte: startOfMonth,
                lte: endOfMonth,
            },
        },
        orderBy: {
            orderNumber: 'desc',
        },
    });
    
    let serialNumber = 1;
    
    if (lastOrder && lastOrder.orderNumber) {
        // Extract the serial number from the last order
        // Format is RIS2026JAN0001, so we take the last 4 characters
        const lastSerial = parseInt(lastOrder.orderNumber.slice(-4), 10);
        if (!isNaN(lastSerial)) {
            serialNumber = lastSerial + 1;
        }
    }
    
    // Format serial with leading zeros (4 digits)
    const serial = String(serialNumber).padStart(4, '0');
    
    return `${prefix}${serial}`;
}

/**
 * Validates if a string matches the RIS order number format
 * Format: RISYYYYMMMXXXX (e.g., RIS2026JAN0001)
 */
export function isValidOrderNumber(orderNumber: string): boolean {
    const pattern = /^RIS\d{4}[A-Z]{3}\d{4}$/;
    return pattern.test(orderNumber);
}

/**
 * Extracts components from an order number
 * Format: RISYYYYMMMXXXX (e.g., RIS2026JAN0001)
 */
export function parseOrderNumber(orderNumber: string): { year: number; month: string; serial: number } | null {
    const pattern = /^RIS(\d{4})([A-Z]{3})(\d{4})$/;
    const match = orderNumber.match(pattern);
    
    if (!match) {
        return null;
    }
    
    const year = parseInt(match[1], 10);
    const month = match[2];
    const serial = parseInt(match[3], 10);
    
    if (isNaN(year) || isNaN(serial)) {
        return null;
    }
    
    return { year, month, serial };
}
