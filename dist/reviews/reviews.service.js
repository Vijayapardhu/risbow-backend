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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReviewsService = class ReviewsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, productId, dto) {
        const existingReview = await this.prisma.review.findFirst({
            where: { userId, productId, status: 'ACTIVE' }
        });
        if (existingReview) {
            throw new common_1.BadRequestException('You have already reviewed this product.');
        }
        const deliveredOrders = await this.prisma.order.findMany({
            where: {
                userId,
                status: 'DELIVERED',
            },
            select: { items: true }
        });
        const hasPurchased = deliveredOrders.some(order => {
            const items = order.items;
            return items.some(item => item.productId === productId);
        });
        if (!hasPurchased) {
            throw new common_1.ForbiddenException('You can only review products you have purchased and received (Delivered).');
        }
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            select: { vendorId: true }
        });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        return this.prisma.review.create({
            data: {
                userId,
                productId,
                vendorId: product.vendorId,
                rating: dto.rating,
                comment: dto.comment,
                images: dto.images || [],
                isVerified: true,
                status: 'ACTIVE'
            }
        });
    }
    async findAllByProduct(productId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [reviews, total] = await this.prisma.$transaction([
            this.prisma.review.findMany({
                where: { productId, status: 'ACTIVE' },
                include: { user: { select: { id: true, name: true } } },
                orderBy: [
                    { helpfulCount: 'desc' },
                    { createdAt: 'desc' }
                ],
                skip,
                take: limit,
            }),
            this.prisma.review.count({ where: { productId, status: 'ACTIVE' } })
        ]);
        return {
            data: reviews,
            meta: { total, page, limit, pages: Math.ceil(total / limit) }
        };
    }
    async getVendorReviews(vendorId) {
        const aggregations = await this.prisma.review.aggregate({
            where: { vendorId, status: 'ACTIVE' },
            _avg: { rating: true },
            _count: { rating: true }
        });
        return {
            vendorId,
            averageRating: aggregations._avg.rating || 0,
            totalReviews: aggregations._count.rating
        };
    }
    async findOne(id) {
        const review = await this.prisma.review.findUnique({ where: { id } });
        if (!review)
            throw new common_1.NotFoundException('Review not found');
        return review;
    }
    async update(userId, id, dto) {
        const review = await this.findOne(id);
        if (review.userId !== userId) {
            throw new common_1.ForbiddenException('You can only edit your own reviews');
        }
        return this.prisma.review.update({
            where: { id },
            data: { ...dto }
        });
    }
    async remove(userId, id) {
        const review = await this.findOne(id);
        if (review.userId !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own reviews');
        }
        return this.prisma.review.update({
            where: { id },
            data: { status: 'DELETED' }
        });
    }
    async voteHelpful(userId, id) {
        const review = await this.findOne(id);
        if (review.userId === userId) {
            throw new common_1.BadRequestException('You cannot vote your own review as helpful');
        }
        return this.prisma.review.update({
            where: { id },
            data: { helpfulCount: { increment: 1 } }
        });
    }
    async report(userId, id, dto) {
        await this.prisma.report.create({
            data: {
                reporterId: userId,
                targetType: 'REVIEW',
                targetId: id,
                reason: dto.reason,
                description: dto.details,
                status: 'PENDING'
            }
        });
        return this.prisma.review.update({
            where: { id },
            data: { status: 'REPORTED' }
        });
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map