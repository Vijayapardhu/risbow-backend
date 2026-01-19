import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminProductService {
    constructor(private prisma: PrismaService) { }

    async getProductList(params: {
        search?: string;
        period?: string;
        page?: number;
        limit?: number;
    }) {
        const { search, period, page = 1, limit = 50 } = params;
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 50;
        const skip = (pageNum - 1) * limitNum;

        // Build where clause
        const where: any = {};
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { id: { contains: search } },
            ];
        }

        try {
            let products: any[] = await this.prisma.product.findMany({
                where,
                skip,
                take: limitNum,
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            // isActive: true, // DB Migration Mismatch: Column missing in Prod
                        }
                    },
                    vendor: true,
                    reviews: {
                        select: { rating: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            // Fallback: if include causes trouble, retry without relations
            if (!products || products.length === 0) {
                products = await this.prisma.product.findMany({
                    where,
                    skip,
                    take: limitNum,
                    orderBy: { createdAt: 'desc' },
                });
            }

            const totalActive = await this.prisma.product.count({ where: { isActive: true } });

            const transformedProducts = products.map(product => {
                const reviews = Array.isArray((product as any).reviews) ? (product as any).reviews : [];
                const images = Array.isArray((product as any).images) ? (product as any).images : [];
                const vendor = (product as any).vendor || null;

                const avgRating = reviews.length > 0
                    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                    : 0;

                const basePrice = (product as any).price ?? 0;
                const basePriceWithGST = basePrice * 1.18;
                const offerPriceWithGST = (product as any).offerPrice ? ((product as any).offerPrice * 1.18) : null;

                return {
                    id: product.id,
                    title: (product as any).title,
                    description: (product as any).description,
                    image: images[0] || null,
                    images,
                    category: (product as any).category?.name || 'Uncategorized',
                    categoryId: (product as any).categoryId || null,
                    vendorCount: 1,
                    recommendedVendor: vendor ? {
                        id: vendor.id,
                        name: vendor.name,
                        email: vendor.email,
                        reason: 'Primary vendor',
                    } : null,
                    lowestPrice: offerPriceWithGST || basePriceWithGST,
                    highestPrice: basePriceWithGST,
                    basePrice: basePrice,
                    gstAmount: basePrice * 0.18,
                    gstPercentage: 18,
                    priceVariance: 0,
                    priceAnomaly: false,
                    totalStock: (product as any).stock ?? 0,
                    stockRisk: ((product as any).stock ?? 0) < 10,
                    views: 0,
                    cartRate: 0,
                    conversion: 0,
                    rating: Math.round(avgRating * 10) / 10,
                    reviewCount: reviews.length,
                    returnRate: 0,
                    revenue: 0,
                    commission: 0,
                    status: (product as any).isActive ? 'active' : 'inactive',
                    sku: (product as any).sku,
                    vendorId: (product as any).vendorId,
                    vendor: vendor ? {
                        id: vendor.id,
                        name: vendor.name,
                        email: vendor.email,
                        mobile: vendor.mobile,
                        role: vendor.role,
                        kycStatus: vendor.kycStatus,
                    } : null,
                    createdAt: (product as any).createdAt,
                    updatedAt: (product as any).updatedAt,
                };
            });

            return {
                insights: {
                    totalActive,
                    multiVendor: 0,
                    priceConflicts: 0,
                    lowStock: await this.prisma.product.count({ where: { stock: { lt: 10 } } }),
                    suppressed: await this.prisma.product.count({ where: { isActive: false } }),
                },
                products: transformedProducts,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: await this.prisma.product.count({ where }),
                },
            };
        } catch (error) {
            console.error('Error in getProductList:', error);
            // Return minimal safe response instead of 500
            return {
                insights: { totalActive: 0, multiVendor: 0, priceConflicts: 0, lowStock: 0, suppressed: 0 },
                products: [],
                pagination: { page: pageNum, limit: limitNum, total: 0 },
            };
        }
    }

    async getProductDetail(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                vendor: true,
                category: true,
                reviews: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                cartItems: true,
                wishlists: true,
            },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        // Calculate prices with 18% GST
        const basePrice = product.price;
        const priceWithGST = basePrice * 1.18;
        const offerPriceWithGST = product.offerPrice ? (product.offerPrice * 1.18) : null;

        return {
            ...product,
            basePrice: basePrice,
            priceWithGST: priceWithGST,
            offerPriceWithGST: offerPriceWithGST,
            gstAmount: basePrice * 0.18,
            gstPercentage: 18,
        };
    }

    async createProduct(productData: any) {
        return this.prisma.product.create({
            data: productData,
        });
    }

    async updateProduct(id: string, productData: any) {
        return this.prisma.product.update({
            where: { id },
            data: productData,
        });
    }

    async deleteProduct(id: string) {
        return this.prisma.product.delete({
            where: { id },
        });
    }

    async getVendorOffers(productId: string) {
        // In current schema, products belong to single vendor
        // This would be expanded with vendor_product_offers table
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: {
                vendor: true,
            },
        });

        if (!product) {
            return [];
        }

        return [
            {
                vendorId: product.vendorId,
                vendorName: product.vendor.name,
                price: product.price,
                offerPrice: product.offerPrice,
                stock: product.stock,
                isActive: product.isActive,
            },
        ];
    }

    async getProductAnalytics(productId: string, period?: string) {
        // Mock analytics - implement with product_analytics table
        return {
            views: 1234,
            addToCart: 156,
            purchases: 45,
            conversionRate: 3.6,
            revenue: 45000,
            avgOrderValue: 1000,
        };
    }
}
