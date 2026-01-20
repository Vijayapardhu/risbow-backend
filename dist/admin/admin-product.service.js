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
const category_spec_service_1 = require("../catalog/category-spec.service");
let AdminProductService = class AdminProductService {
    constructor(prisma, categorySpecService) {
        this.prisma = prisma;
        this.categorySpecService = categorySpecService;
    }
    async getProductList(params) {
        const { search, period, page = 1, limit = 50 } = params;
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 50;
        const skip = (pageNum - 1) * limitNum;
        const where = {};
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { id: { contains: search } },
            ];
        }
        try {
            let products = await this.prisma.product.findMany({
                where,
                skip,
                take: limitNum,
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                    vendor: true,
                    reviews: {
                        select: { rating: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
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
                const reviews = Array.isArray(product.reviews) ? product.reviews : [];
                const images = Array.isArray(product.images) ? product.images : [];
                const vendor = product.vendor || null;
                const avgRating = reviews.length > 0
                    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                    : 0;
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
                    categoryId: product.categoryId || null,
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
                    totalStock: product.stock ?? 0,
                    stockRisk: (product.stock ?? 0) < 10,
                    views: 0,
                    cartRate: 0,
                    conversion: 0,
                    rating: Math.round(avgRating * 10) / 10,
                    reviewCount: reviews.length,
                    returnRate: 0,
                    revenue: 0,
                    commission: 0,
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
        }
        catch (error) {
            console.error('Error in getProductList:', error);
            return {
                insights: { totalActive: 0, multiVendor: 0, priceConflicts: 0, lowStock: 0, suppressed: 0 },
                products: [],
                pagination: { page: pageNum, limit: limitNum, total: 0 },
            };
        }
    }
    async getProductDetail(id) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                vendor: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        parentId: true,
                    }
                },
                specValues: {
                    include: {
                        spec: true
                    }
                }
            },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
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
        if (productData.specs && productData.specs.length > 0) {
            await this.categorySpecService.validateProductSpecs(productData.categoryId, productData.specs);
        }
        const data = {
            title: productData.title,
            description: productData.description,
            price: productData.price,
            categoryId: productData.categoryId,
            vendorId: productData.vendorId,
        };
        if (productData.offerPrice !== undefined)
            data.offerPrice = productData.offerPrice;
        if (productData.stock !== undefined)
            data.stock = productData.stock;
        if (productData.sku !== undefined)
            data.sku = productData.sku;
        if (productData.images !== undefined)
            data.images = productData.images;
        if (productData.brandName !== undefined)
            data.brandName = productData.brandName;
        if (productData.tags !== undefined)
            data.tags = productData.tags;
        if (productData.weight !== undefined)
            data.weight = productData.weight;
        if (productData.weightUnit !== undefined)
            data.weightUnit = productData.weightUnit;
        if (productData.length !== undefined)
            data.length = productData.length;
        if (productData.width !== undefined)
            data.width = productData.width;
        if (productData.height !== undefined)
            data.height = productData.height;
        if (productData.dimensionUnit !== undefined)
            data.dimensionUnit = productData.dimensionUnit;
        if (productData.shippingClass !== undefined)
            data.shippingClass = productData.shippingClass;
        if (productData.metaTitle !== undefined)
            data.metaTitle = productData.metaTitle;
        if (productData.metaDescription !== undefined)
            data.metaDescription = productData.metaDescription;
        if (productData.metaKeywords !== undefined)
            data.metaKeywords = productData.metaKeywords;
        if (productData.isWholesale !== undefined)
            data.isWholesale = productData.isWholesale;
        if (productData.wholesalePrice !== undefined)
            data.wholesalePrice = productData.wholesalePrice;
        if (productData.moq !== undefined)
            data.moq = productData.moq;
        if (productData.isActive !== undefined)
            data.isActive = productData.isActive;
        if (productData.isCancelable !== undefined)
            data.isCancelable = productData.isCancelable;
        if (productData.isReturnable !== undefined)
            data.isReturnable = productData.isReturnable;
        if (productData.requiresOTP !== undefined)
            data.requiresOTP = productData.requiresOTP;
        if (productData.isInclusiveTax !== undefined)
            data.isInclusiveTax = productData.isInclusiveTax;
        if (productData.isAttachmentRequired !== undefined)
            data.isAttachmentRequired = productData.isAttachmentRequired;
        if (productData.minOrderQuantity !== undefined)
            data.minOrderQuantity = productData.minOrderQuantity;
        if (productData.quantityStepSize !== undefined)
            data.quantityStepSize = productData.quantityStepSize;
        if (productData.totalAllowedQuantity !== undefined)
            data.totalAllowedQuantity = productData.totalAllowedQuantity;
        if (productData.basePreparationTime !== undefined)
            data.basePreparationTime = productData.basePreparationTime;
        if (productData.storageInstructions !== undefined)
            data.storageInstructions = productData.storageInstructions;
        if (productData.storageInstructions !== undefined)
            data.storageInstructions = productData.storageInstructions;
        if (productData.allergenInformation !== undefined)
            data.allergenInformation = productData.allergenInformation;
        if (productData.attributes !== undefined)
            data.attributes = productData.attributes;
        if (productData.costPrice !== undefined)
            data.costPrice = productData.costPrice;
        if (productData.rulesSnapshot !== undefined)
            data.rulesSnapshot = productData.rulesSnapshot;
        if (productData.shippingDetails !== undefined)
            data.shippingDetails = productData.shippingDetails;
        if (productData.mediaGallery !== undefined)
            data.mediaGallery = productData.mediaGallery;
        if (productData.variants !== undefined)
            data.variants = productData.variants;
        const product = await this.prisma.product.create({
            data,
        });
        if (productData.specs && productData.specs.length > 0) {
            await this.categorySpecService.saveProductSpecs(product.id, productData.specs);
        }
        return product;
    }
    async updateProduct(id, productData) {
        const existingProduct = await this.prisma.product.findUnique({
            where: { id },
        });
        if (!existingProduct) {
            throw new common_1.NotFoundException(`Product with ID ${id} not found`);
        }
        if (productData.specs && productData.specs.length > 0) {
            const categoryId = productData.categoryId || existingProduct.categoryId;
            await this.categorySpecService.validateProductSpecs(categoryId, productData.specs);
        }
        const data = {};
        if (productData.title !== undefined)
            data.title = productData.title;
        if (productData.description !== undefined)
            data.description = productData.description;
        if (productData.price !== undefined)
            data.price = productData.price;
        if (productData.offerPrice !== undefined)
            data.offerPrice = productData.offerPrice;
        if (productData.categoryId !== undefined)
            data.categoryId = productData.categoryId;
        if (productData.stock !== undefined)
            data.stock = productData.stock;
        if (productData.vendorId !== undefined)
            data.vendorId = productData.vendorId;
        if (productData.sku !== undefined)
            data.sku = productData.sku;
        if (productData.images !== undefined)
            data.images = productData.images;
        if (productData.brandName !== undefined)
            data.brandName = productData.brandName;
        if (productData.tags !== undefined)
            data.tags = productData.tags;
        if (productData.weight !== undefined)
            data.weight = productData.weight;
        if (productData.weightUnit !== undefined)
            data.weightUnit = productData.weightUnit;
        if (productData.length !== undefined)
            data.length = productData.length;
        if (productData.width !== undefined)
            data.width = productData.width;
        if (productData.height !== undefined)
            data.height = productData.height;
        if (productData.dimensionUnit !== undefined)
            data.dimensionUnit = productData.dimensionUnit;
        if (productData.shippingClass !== undefined)
            data.shippingClass = productData.shippingClass;
        if (productData.metaTitle !== undefined)
            data.metaTitle = productData.metaTitle;
        if (productData.metaDescription !== undefined)
            data.metaDescription = productData.metaDescription;
        if (productData.metaKeywords !== undefined)
            data.metaKeywords = productData.metaKeywords;
        if (productData.isWholesale !== undefined)
            data.isWholesale = productData.isWholesale;
        if (productData.wholesalePrice !== undefined)
            data.wholesalePrice = productData.wholesalePrice;
        if (productData.moq !== undefined)
            data.moq = productData.moq;
        if (productData.isActive !== undefined)
            data.isActive = productData.isActive;
        if (productData.variants !== undefined)
            data.variants = productData.variants;
        if (productData.isCancelable !== undefined)
            data.isCancelable = productData.isCancelable;
        if (productData.isReturnable !== undefined)
            data.isReturnable = productData.isReturnable;
        if (productData.requiresOTP !== undefined)
            data.requiresOTP = productData.requiresOTP;
        if (productData.isInclusiveTax !== undefined)
            data.isInclusiveTax = productData.isInclusiveTax;
        if (productData.isAttachmentRequired !== undefined)
            data.isAttachmentRequired = productData.isAttachmentRequired;
        if (productData.minOrderQuantity !== undefined)
            data.minOrderQuantity = productData.minOrderQuantity;
        if (productData.quantityStepSize !== undefined)
            data.quantityStepSize = productData.quantityStepSize;
        if (productData.totalAllowedQuantity !== undefined)
            data.totalAllowedQuantity = productData.totalAllowedQuantity;
        if (productData.basePreparationTime !== undefined)
            data.basePreparationTime = productData.basePreparationTime;
        if (productData.storageInstructions !== undefined)
            data.storageInstructions = productData.storageInstructions;
        if (productData.storageInstructions !== undefined)
            data.storageInstructions = productData.storageInstructions;
        if (productData.allergenInformation !== undefined)
            data.allergenInformation = productData.allergenInformation;
        if (productData.attributes !== undefined)
            data.attributes = productData.attributes;
        if (productData.costPrice !== undefined)
            data.costPrice = productData.costPrice;
        if (productData.rulesSnapshot !== undefined)
            data.rulesSnapshot = productData.rulesSnapshot;
        if (productData.shippingDetails !== undefined)
            data.shippingDetails = productData.shippingDetails;
        if (productData.mediaGallery !== undefined)
            data.mediaGallery = productData.mediaGallery;
        try {
            const product = await this.prisma.product.update({
                where: { id },
                data,
                include: {
                    vendor: true,
                    category: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                },
            });
            if (productData.specs !== undefined) {
                await this.categorySpecService.saveProductSpecs(id, productData.specs);
            }
            return product;
        }
        catch (error) {
            console.error('Error updating product:', error);
            throw new common_1.NotFoundException(`Failed to update product with ID ${id}`);
        }
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        category_spec_service_1.CategorySpecService])
], AdminProductService);
//# sourceMappingURL=admin-product.service.js.map