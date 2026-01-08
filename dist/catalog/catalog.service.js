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
exports.CatalogService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CatalogService = class CatalogService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createProduct(dto) {
        const vendorId = dto.vendorId || 'msg_vendor_placeholder';
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (vendor) {
            const currentCount = await this.prisma.product.count({ where: { vendorId } });
            if (currentCount >= vendor.skuLimit) {
                throw new common_1.BadRequestException(`Upgrade to PRO! You reached your limit of ${vendor.skuLimit} items.`);
            }
        }
        return this.prisma.product.create({
            data: {
                title: dto.title,
                description: dto.description,
                price: dto.price,
                offerPrice: dto.offerPrice,
                stock: dto.stock || 0,
                categoryId: dto.categoryId,
                vendorId: vendorId,
                isWholesale: dto.isWholesale || false,
                wholesalePrice: dto.wholesalePrice,
                moq: dto.moq || 1,
            },
        });
    }
    async findAll(filters) {
        const where = {};
        if (filters.category && filters.category !== 'All') {
            where.categoryId = filters.category;
        }
        if (filters.price_min !== undefined || filters.price_max !== undefined || filters.price_lt !== undefined) {
            where.price = {};
            if (filters.price_min !== undefined)
                where.price.gte = filters.price_min;
            if (filters.price_max !== undefined)
                where.price.lte = filters.price_max;
            if (filters.price_lt !== undefined)
                where.price.lt = filters.price_lt;
        }
        if (filters.search) {
            where.title = { contains: filters.search, mode: 'insensitive' };
        }
        let orderBy = { createdAt: 'desc' };
        if (filters.sort) {
            switch (filters.sort) {
                case 'price_asc':
                    orderBy = { price: 'asc' };
                    break;
                case 'price_desc':
                    orderBy = { price: 'desc' };
                    break;
                case 'newest':
                    orderBy = { createdAt: 'desc' };
                    break;
                default: orderBy = { createdAt: 'desc' };
            }
        }
        return this.prisma.product.findMany({
            where,
            orderBy,
            take: 50,
        });
    }
    async getEligibleGifts(cartValue) {
        if (cartValue < 2000) {
            return [];
        }
        return this.prisma.giftSKU.findMany({
            where: { stock: { gt: 0 } },
        });
    }
    async findOne(id) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                reviews: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: { id: true, name: true }
                        }
                    }
                }
            }
        });
        if (!product) {
            throw new common_1.BadRequestException('Product not found');
        }
        const avgRating = product.reviews.length > 0
            ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
            : 0;
        return Object.assign(Object.assign({}, product), { averageRating: Math.round(avgRating * 10) / 10, reviewCount: product.reviews.length });
    }
    async getCategories() {
        return this.prisma.category.findMany({
            orderBy: { name: 'asc' }
        });
    }
    async processBulkUpload(csvContent) {
        const lines = csvContent.split('\n').filter(Boolean);
        let count = 0;
        for (const line of lines) {
            const [title, price, category] = line.split(',');
            if (title && price && category) {
                await this.prisma.product.create({
                    data: {
                        title: title.trim(),
                        price: parseInt(price) || 0,
                        categoryId: category.trim(),
                        vendorId: 'bulk_upload_vendor',
                        stock: 100
                    }
                });
                count++;
            }
        }
        return { uploaded: count, message: 'Bulk upload processed' };
    }
};
exports.CatalogService = CatalogService;
exports.CatalogService = CatalogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CatalogService);
//# sourceMappingURL=catalog.service.js.map