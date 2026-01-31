import { PrismaService } from '../prisma/prisma.service';

/**
 * Generates an order number in the format: RIS-YEAR-MONTH-SERIAL
 * Example: RIS-2026-01-0001
 * 
 * The serial resets every month and is 4 digits with leading zeros
 */
export async function generateOrderNumber(prisma: PrismaService): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Get the start of the current month
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Find the last order number for this month
    const lastOrder = await prisma.order.findFirst({
        where: {
            orderNumber: {
                startsWith: `RIS-${year}-${month}-`,
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
        const parts = lastOrder.orderNumber.split('-');
        if (parts.length === 4) {
            const lastSerial = parseInt(parts[3], 10);
            if (!isNaN(lastSerial)) {
                serialNumber = lastSerial + 1;
            }
        }
    }
    
    // Format serial with leading zeros (4 digits)
    const serial = String(serialNumber).padStart(4, '0');
    
    return `RIS-${year}-${month}-${serial}`;
}

/**
 * Validates if a string matches the RIS order number format
 */
export function isValidOrderNumber(orderNumber: string): boolean {
    const pattern = /^RIS-\d{4}-\d{2}-\d{4}$/;
    return pattern.test(orderNumber);
}

/**
 * Extracts components from an order number
 */
export function parseOrderNumber(orderNumber: string): { year: number; month: number; serial: number } | null {
    const parts = orderNumber.split('-');
    if (parts.length !== 4 || parts[0] !== 'RIS') {
        return null;
    }
    
    const year = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10);
    const serial = parseInt(parts[3], 10);
    
    if (isNaN(year) || isNaN(month) || isNaN(serial)) {
        return null;
    }
    
    return { year, month, serial };
}
