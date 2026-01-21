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
exports.ReturnsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../shared/notifications.service");
let ReturnsService = class ReturnsService {
    constructor(prisma, notificationsService) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
    }
    async create(userId, dto) {
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId, userId },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.status !== 'DELIVERED') {
            throw new common_1.BadRequestException('Returns can only be requested for delivered orders');
        }
        const returnNumber = `RET-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        return this.prisma.returnRequest.create({
            data: {
                returnNumber,
                userId,
                orderId: dto.orderId,
                reason: dto.reason,
                description: dto.description,
                evidenceImages: dto.evidenceImages || [],
                evidenceVideo: dto.evidenceVideo,
                pickupAddress: dto.pickupAddress,
                status: 'PENDING_APPROVAL',
                items: {
                    create: dto.items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        reason: item.reason || dto.reason,
                        condition: item.condition,
                    })),
                },
                timeline: {
                    create: {
                        status: 'PENDING_APPROVAL',
                        action: 'RETURN_REQUESTED',
                        performedBy: 'CUSTOMER',
                        notes: 'Return request submitted by customer',
                    },
                },
            },
            include: { items: true },
        });
    }
    async findAll(query) {
        const { page = 1, limit = 10, status, search, userId } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (status && status !== 'ALL')
            where.status = status;
        if (userId)
            where.userId = userId;
        if (search) {
            where.OR = [
                { returnNumber: { contains: search, mode: 'insensitive' } },
                { orderId: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [total, data] = await Promise.all([
            this.prisma.returnRequest.count({ where }),
            this.prisma.returnRequest.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    items: { include: { product: true } },
                    user: { select: { name: true, email: true, mobile: true } },
                    order: { select: { id: true, items: true } },
                },
                orderBy: { requestedAt: 'desc' },
            }),
        ]);
        return {
            data,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        const returnReq = await this.prisma.returnRequest.findUnique({
            where: { id },
            include: {
                items: { include: { product: true } },
                user: true,
                order: true,
                timeline: { orderBy: { timestamp: 'desc' } },
                settlement: true,
                vendor: true,
            },
        });
        if (!returnReq)
            throw new common_1.NotFoundException('Return request not found');
        return returnReq;
    }
    async updateStatus(id, dto, adminId) {
        const returnReq = await this.prisma.returnRequest.findUnique({
            where: { id },
            include: { vendor: true }
        });
        if (!returnReq)
            throw new common_1.NotFoundException('Return request not found');
        const timelineEntry = {
            status: dto.status,
            action: `STATUS_UPDATE_TO_${dto.status}`,
            performedBy: 'ADMIN',
            notes: dto.adminNotes,
        };
        const updatedReturn = await this.prisma.returnRequest.update({
            where: { id },
            data: {
                status: dto.status,
                updatedAt: new Date(),
                timeline: {
                    create: timelineEntry,
                },
            },
            include: { timeline: true },
        });
        if (dto.status === 'APPROVED' && returnReq.vendor) {
            const vendorUser = await this.prisma.user.findUnique({
                where: { mobile: returnReq.vendor.mobile }
            });
            if (vendorUser) {
                await this.notificationsService.createNotification(vendorUser.id, 'Return Approved', `Return Request #${returnReq.returnNumber} has been approved. Please prepare for pickup/action.`, 'RETURN', 'VENDOR');
            }
        }
        return updatedReturn;
    }
    async shipReplacement(id, trackingId, adminId) {
        const returnReq = await this.prisma.returnRequest.findUnique({ where: { id } });
        if (!returnReq)
            throw new common_1.NotFoundException('Return request not found');
        return this.prisma.returnRequest.update({
            where: { id },
            data: {
                status: 'REPLACEMENT_SHIPPED',
                replacementTrackingId: trackingId,
                timeline: {
                    create: {
                        status: 'REPLACEMENT_SHIPPED',
                        action: 'REPLACEMENT_DISPATCHED',
                        performedBy: 'ADMIN',
                        notes: `Tracking ID: ${trackingId}`
                    }
                }
            }
        });
    }
};
exports.ReturnsService = ReturnsService;
exports.ReturnsService = ReturnsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], ReturnsService);
//# sourceMappingURL=returns.service.js.map