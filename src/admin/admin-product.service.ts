import { Injectable } from '@nestjs/common';
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
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { id: { contains: search } },
            ];
        }

        // Get products with vendor count
            try {
        const products = await this.prisma.product.findMany({
            where,
            skip,
            take: limit,
            include: {
                category: true,
                vendor: true,
                reviews: {
                    select: {
                        rating: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Calculate insights
        const totalActive = await this.prisma.product.count({
            where: { isActive: true },
        });

        // Transform products with intelligence and GST calculation
            const transformedProducts = products.map(product => {
                // Defensive defaults in case legacy rows have nulls
                const reviews = Array.isArray(product.reviews) ? product.reviews : [];
                const images = Array.isArray(product.images) ? product.images : [];
                const vendor = product.vendor || null;

                const avgRating = reviews.length > 0
                    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                    : 0;

                // Calculate prices with 18% GST, guard against null
                const basePrice = product.price ?? 0;
                const basePriceWithGST = basePrice * 1.18;
                const offerPriceWithGST = product.offerPrice ? (product.offerPrice * 1.18) : null;

                return {
                    id: product.id,
                    title: product.title,
                    description: product.description,
                    image: images[0] || null,
                    images,
                    category: product.category?.name || 'Uncategorized',
                    categoryId: product.categoryId,
                    vendorCount: 1, // Single vendor in current schema
                    recommendedVendor: vendor ? {
                        id: vendor.id,
                        name: vendor.name,
                        email: vendor.email,
                        reason: 'Primary vendor',
                    } : null,
                    lowestPrice: offerPriceWithGST || basePriceWithGST,
                    highestPrice: basePriceWithGST,
                    basePrice: basePrice, // Without GST for reference
                    gstAmount: basePrice * 0.18,
                    gstPercentage: 18,
                    priceVariance: 0,
                    priceAnomaly: false,
                    totalStock: product.stock ?? 0,
                    stockRisk: (product.stock ?? 0) < 10,
                    views: 0, // Mock - implement with analytics
                    cartRate: 0,
                    conversion: 0,
                    rating: Math.round(avgRating * 10) / 10,
                    reviewCount: reviews.length,
                    returnRate: 0, // Mock
                    revenue: 0, // Mock
                    commission: 0, // Mock
                    status: product.isActive ? 'active' : 'inactive',
                    sku: product.sku,
                    vendorId: product.vendorId,
                    vendor: vendor ? {
                        id: vendor.id,
                        name: vendor.name,
                        email: vendor.email,
                        mobile: vendor.mobile,
                        role: vendor.role,
                        kycStatus: vendor.kycStatus,
                    } : null,
                    createdAt: product.createdAt,
                    updatedAt: product.updatedAt,
                };
            });

        return {
            insights: {
                totalActive,
                multiVendor: 0, // Not implemented in current schema
                priceConflicts: 0,
                lowStock: await this.prisma.product.count({ where: { stock: { lt: 10 } } }),
                suppressed: await this.prisma.product.count({ where: { isActive: false } }),
            },
            products: transformedProducts,
            pagination: {
                page,
                limit,
                total: await this.prisma.product.count({ where }),
            },
        };
            } catch (error) {
                console.error('Error in getProductList:', error);
                throw error;
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
            throw new Error('Product not found');
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
