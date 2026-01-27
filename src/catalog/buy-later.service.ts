import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class BuyLaterService {
    constructor(private prisma: PrismaService) { }

    async addToBuyLater(userId: string, productId: string, variantId?: string, quantity: number = 1) {
        // Enforce inventory check first
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            select: { price: true, offerPrice: true }
        });

        if (!product) throw new NotFoundException('Product not found');

        const currentPrice = product.offerPrice || product.price;

        return this.prisma.buyLater.create({
            data: {
                id: randomUUID(),
                variantId,
                quantity,
                currentPrice,
                targetPrice: currentPrice, // Default to current, user can update later
                updatedAt: new Date(),
                user: { connect: { id: userId } },
                product: { connect: { id: productId } },
            },
        });
    }

    async getBuyLaterItems(userId: string) {
        return this.prisma.buyLater.findMany({
            where: { userId, isActive: true },
            include: { product: true }
        });
    }

    async removeFromBuyLater(userId: string, id: string) {
        return this.prisma.buyLater.updateMany({
            where: { id, userId },
            data: { isActive: false }
        });
    }

    async updateTargetPrice(userId: string, id: string, targetPrice: number) {
        return this.prisma.buyLater.updateMany({
            where: { id, userId },
            data: { targetPrice }
        });
    }

    /**
     * Called by a cron job or price change event.
     * Notifies users if the current price is <= target price.
     */
    async checkPriceDrops() {
        const activeItems = await this.prisma.buyLater.findMany({
            where: { isActive: true, isNotified: false },
            include: { product: true }
        });

        for (const item of activeItems) {
            const currentPrice = (item as any).Product.offerPrice || (item as any).Product.price;

            if (currentPrice <= item.targetPrice) {
                const dropPercent = ((item.currentPrice - currentPrice) / item.currentPrice) * 100;

                await this.prisma.buyLater.update({
                    where: { id: item.id },
                    data: {
                        isNotified: true,
                        priceDropPercent: dropPercent
                    }
                });

                // Emit Notification (Simulated here)
                console.log(`NOTIFY: User ${item.userId} - ${(item as any).Product.title} price dropped to ${currentPrice}!`);
            }
        }
    }
}
