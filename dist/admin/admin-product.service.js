"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminProductService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AdminProductService = class AdminProductService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProductList(params) {
        const { search, period, page = 1, limit = 50 } = params;
        const skip = (page - 1) * limit;
        const where = {};
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { id: { contains: search } },
            ];
        }
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
        const totalActive = await this.prisma.product.count({
            where: { isActive: true },
        });
        const transformedProducts = products.map(product => {
            const avgRating = product.reviews.length > 0
                ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
                : 0;
            const basePrice = product.price;
            const basePriceWithGST = basePrice * 1.18;
            const offerPriceWithGST = product.offerPrice ? (product.offerPrice * 1.18) : null;
            return {
                id: product.id,
                title: product.title,
                description: product.description,
                image: product.images[0] || null,
                images: product.images || [],
                category: product.category?.name || 'Uncategorized',
                categoryId: product.categoryId,
                vendorCount: 1,
                recommendedVendor: product.vendor ? {
                    id: product.vendor.id,
                    name: product.vendor.name,
                    email: product.vendor.email,
                    reason: 'Primary vendor',
                } : null,
                lowestPrice: offerPriceWithGST || basePriceWithGST,
                highestPrice: basePriceWithGST,
                basePrice: basePrice,
                gstAmount: basePrice * 0.18,
                gstPercentage: 18,
                priceVariance: 0,
                priceAnomaly: false,
                totalStock: product.stock,
                stockRisk: product.stock < 10,
                views: 0,
                cartRate: 0,
                conversion: 0,
                rating: Math.round(avgRating * 10) / 10,
                reviewCount: product.reviews.length,
                returnRate: 0,
                revenue: 0,
                commission: 0,
                status: product.isActive ? 'active' : 'inactive',
                sku: product.sku,
                vendorId: product.vendorId,
                vendor: product.vendor ? {
                    id: product.vendor.id,
                    name: product.vendor.name,
                    email: product.vendor.email,
                    mobile: product.vendor.mobile,
                    role: product.vendor.role,
                    kycStatus: product.vendor.kycStatus,
                } : null,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt,
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
                page,
                limit,
                total: await this.prisma.product.count({ where }),
            },
        };
    }
    async getProductDetail(id) {
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
    async createProduct(productData) {
        return this.prisma.product.create({
            data: productData,
        });
    }
    async updateProduct(id, productData) {
        return this.prisma.product.update({
            where: { id },
            data: productData,
        });
    }
    async deleteProduct(id) {
        return this.prisma.product.delete({
            where: { id },
        });
    }
    async getVendorOffers(productId) {
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
    async getProductAnalytics(productId, period) {
        return {
            views: 1234,
            addToCart: 156,
            purchases: 45,
            conversionRate: 3.6,
            revenue: 45000,
            avgOrderValue: 1000,
        };
    }
};
exports.AdminProductService = AdminProductService;
exports.AdminProductService = AdminProductService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminProductService);
//# sourceMappingURL=admin-product.service.js.map