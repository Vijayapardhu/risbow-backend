import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommissionService {
    private readonly logger = new Logger(CommissionService.name);
    private readonly PLATFORM_DEFAULT_RATE = 0.15; // 15%

    constructor(private prisma: PrismaService) { }

    /**
     * Calculate commission amount based on priority logic:
     * 1. Vendor override commission rate
     * 2. Category commission rate  
     * 3. Platform default rate (15%)
     * 
     * @param price - Price in paise (1 INR = 100 paise)
     * @param categoryId - Category ID
     * @param vendorId - Vendor ID
     * @returns Commission amount in paise
     */
    async calculateCommission(price: number, categoryId: string, vendorId: string): Promise<number> {
        try {
            // Priority 1: Fetch seller commission override from Vendor table
            const vendor = await this.prisma.vendor.findUnique({
                where: { id: vendorId },
                select: { commissionRate: true }
            });

            let commissionRate = vendor?.commissionRate;

            // Priority 2: If no vendor override, fetch commission rate from Category table
            if (commissionRate === null || commissionRate === 0.0) {
                const categoryComm = await this.prisma.categoryCommission.findUnique({
                    where: { categoryId },
                    select: { commissionRate: true, isActive: true }
                });

                if (categoryComm && categoryComm.isActive) {
                    commissionRate = categoryComm.commissionRate;
                }
            }

            // Priority 3: Use platform default if rates are not set or are 0
            if (commissionRate === null || commissionRate === 0.0) {
                commissionRate = this.PLATFORM_DEFAULT_RATE;
            }

            // Calculate commission in paise and round to nearest integer
            const commissionInPaise = Math.round(price * commissionRate);

            this.logger.debug(`Commission calculated: ${price} paise * ${commissionRate} = ${commissionInPaise} paise`);

            return commissionInPaise;
        } catch (error) {
            this.logger.error(`Error calculating commission: ${error.message}`);
            // Fallback to platform default rate in case of error
            return Math.round(price * this.PLATFORM_DEFAULT_RATE);
        }
    }

    /**
     * Calculate net vendor earnings after commission
     * @param totalPrice - Total price in paise
     * @param commissionAmount - Commission amount in paise
     * @returns Net vendor earnings in paise
     */
    calculateNetVendorEarnings(totalPrice: number, commissionAmount: number): number {
        return totalPrice - commissionAmount;
    }
}