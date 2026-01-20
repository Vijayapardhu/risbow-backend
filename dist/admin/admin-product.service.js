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
            const totalActive = await this.prisma.product.count({ where: { visibility: 'PUBLISHED' } });
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
                    suppressed: await this.prisma.product.count({ where: { visibility: { in: ['DRAFT', 'BLOCKED'] } } }),
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
        const variationsCreateInput = productData.variations?.map(v => ({
            sku: v.sku || `${productData.title.slice(0, 3)}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
            attributes: v.attributes,
            mrp: v.mrp,
            sellingPrice: v.sellingPrice,
            stock: v.stock || 0,
            status: v.status || 'ACTIVE',
            weight: v.weight,
            dimensions: v.dimensions,
            mediaOverrides: v.mediaOverrides,
        }));
        const data = {
            title: productData.title,
            description: productData.description,
            price: productData.price,
            categoryId: productData.categoryId,
            vendorId: productData.vendorId,
            defaultVariationId: productData.defaultVariationId,
            attributes: productData.attributes,
            costPrice: productData.costPrice,
            rulesSnapshot: productData.rulesSnapshot,
            shippingDetails: productData.shippingDetails,
            mediaGallery: productData.mediaGallery,
            visibility: productData.visibility || (productData.isActive ? 'PUBLISHED' : 'DRAFT'),
            sku: productData.sku,
            brandName: productData.brandName,
            tags: productData.tags,
            images: productData.images,
            weight: productData.weight,
            weightUnit: productData.weightUnit,
            length: productData.length,
            width: productData.width,
            height: productData.height,
            dimensionUnit: productData.dimensionUnit,
            shippingClass: productData.shippingClass,
            metaTitle: productData.metaTitle,
            metaDescription: productData.metaDescription,
            metaKeywords: productData.metaKeywords,
            isWholesale: productData.isWholesale,
            wholesalePrice: productData.wholesalePrice,
            moq: productData.moq,
            isCancelable: productData.isCancelable,
            isReturnable: productData.isReturnable,
            requiresOTP: productData.requiresOTP,
            isInclusiveTax: productData.isInclusiveTax,
            isAttachmentRequired: productData.isAttachmentRequired,
            minOrderQuantity: productData.minOrderQuantity,
            quantityStepSize: productData.quantityStepSize,
            totalAllowedQuantity: productData.totalAllowedQuantity,
            basePreparationTime: productData.basePreparationTime,
            storageInstructions: productData.storageInstructions,
            allergenInformation: productData.allergenInformation,
            productVariations: variationsCreateInput ? {
                create: variationsCreateInput
            } : undefined,
            hasVariations: !!(variationsCreateInput && variationsCreateInput.length > 0)
        };
        if ('variations' in data) {
            delete data['variations'];
        }
        console.log('DEBUG DATA TO PRISMA:', JSON.stringify(data, null, 2));
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
        const data = { ...productData };
        delete data.specs;
        delete data.variants;
        if (productData.visibility)
            data.visibility = productData.visibility;
        Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
        try {
            const product = await this.prisma.product.update({
                where: { id },
                data,
                include: {
                    vendor: true,
                    category: { select: { id: true, name: true } },
                    productVariations: true,
                },
            });
            if (productData.specs) {
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
            include: { vendor: true },
        });
        if (!product)
            return [];
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