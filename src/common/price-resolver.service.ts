import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PriceResolverService {
    constructor(private prisma: PrismaService) { }

    /**
     * Resolves the current price for a product or variant.
     * Takes offerPrice if available, otherwise base price.
     */
    async resolvePrice(productId: string, variantId?: string): Promise<number> {
        // Backwards compatible wrapper (no location context)
        const out = await this.resolvePriceDetailed({ productId, variantId });
        return out.unitPrice;
    }

    /**
     * Location-aware price resolution (for geo-targeted promotions).
     * NOTE: This does not apply shipping promos; it only computes the unit price.
     */
    async resolvePriceDetailed(args: {
        productId: string;
        variantId?: string;
        location?: { lat: number; lng: number; pincode?: string };
    }): Promise<{ unitPrice: number; appliedLocalPromotionId?: string | null }> {
        const { productId, variantId } = args;
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: { ProductVariant: true }
        });

        if (!product) {
            throw new NotFoundException(`Product ${productId} not found`);
        }

        let basePrice: number;

        if (variantId) {
            const variants = (product as any).ProductVariant as any[] | undefined;
            const variant = (variants || []).find((v) => v.id === variantId);
            if (!variant) {
                throw new NotFoundException(`Variant ${variantId} not found for product ${productId}`);
            }
            // Use variant price if set, otherwise fallback to product price
            basePrice = (variant.price ?? null) !== null ? Number(variant.price) : (product.offerPrice || product.price);
        } else {
            basePrice = product.offerPrice || product.price;
        }

        const promo = args.location
            ? await this.getBestLocalPromotion({
                productId: product.id,
                vendorId: product.vendorId,
                categoryId: product.categoryId,
                price: basePrice,
                location: args.location,
            })
            : null;

        return {
            unitPrice: promo?.unitPrice ?? basePrice,
            appliedLocalPromotionId: promo?.promotionId ?? null,
        };
    }

    private async getBestLocalPromotion(args: {
        productId: string;
        vendorId: string;
        categoryId: string;
        price: number;
        location: { lat: number; lng: number; pincode?: string };
    }): Promise<{ unitPrice: number; promotionId: string } | null> {
        const now = new Date();
        const promos = await this.prisma.localPromotion.findMany({
            where: {
                isActive: true,
                effectiveFrom: { lte: now },
                OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
                AND: [
                    {
                        OR: [
                            { productId: args.productId },
                            { categoryId: args.categoryId },
                            { vendorId: args.vendorId },
                            // global promo (no scope)
                            { AND: [{ productId: null }, { categoryId: null }, { vendorId: null }] },
                        ],
                    },
                ],
            } as any,
            take: 50,
            orderBy: { createdAt: 'desc' },
        });

        const toRad = (x: number) => (x * Math.PI) / 180;
        const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
            const R = 6371;
            const dLat = toRad(b.lat - a.lat);
            const dLng = toRad(b.lng - a.lng);
            const s1 = Math.sin(dLat / 2);
            const s2 = Math.sin(dLng / 2);
            const q = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
            return 2 * R * Math.asin(Math.sqrt(q));
        };

        let best: { unitPrice: number; promotionId: string; discount: number } | null = null;
        for (const p of promos as any[]) {
            // Location filter
            if (p.targetType === 'RADIUS') {
                if (p.centerLat == null || p.centerLng == null || p.radiusKm == null) continue;
                const d = distanceKm(
                    { lat: args.location.lat, lng: args.location.lng },
                    { lat: Number(p.centerLat), lng: Number(p.centerLng) },
                );
                if (d > Number(p.radiusKm)) continue;
            } else if (p.targetType === 'PINCODE_SET') {
                const pincodes = Array.isArray(p.pincodes) ? p.pincodes : (p.pincodes ? (p.pincodes as any) : []);
                const pin = args.location.pincode;
                if (!pin || !Array.isArray(pincodes) || !pincodes.includes(pin)) continue;
            }

            // Compute discount (unit only)
            let discount = 0;
            if (p.percentOff) discount = Math.floor((args.price * Number(p.percentOff)) / 100);
            if (p.flatOffAmount) discount = Math.max(discount, Number(p.flatOffAmount));
            if (discount <= 0) continue;

            const unitPrice = Math.max(0, args.price - discount);
            if (!best || discount > best.discount) {
                best = { unitPrice, promotionId: p.id, discount };
            }
        }

        return best ? { unitPrice: best.unitPrice, promotionId: best.promotionId } : null;
    }

    /**
     * Calculates tax (GST) for a given amount.
     * Default is 18% GST.
     */
    calculateTax(amount: number, rate: number = 0.18): number {
        return Math.round(amount * rate);
    }
}
