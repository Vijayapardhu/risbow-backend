import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateReturnStatusDto } from './dto/update-return.dto';
import { NotificationsService } from '../shared/notifications.service';
import { InventoryService } from '../inventory/inventory.service';
import { ReturnStatus } from '@prisma/client';

@Injectable()
export class ReturnsService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
        private inventoryService: InventoryService
    ) { }

    // ... existing create and findAll methods ...

    async create(userId: string, dto: CreateReturnDto) {
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId, userId },
        });

        if (!order) throw new NotFoundException('Order not found');

        if (order.status !== 'DELIVERED') {
            throw new BadRequestException('Returns can only be requested for delivered orders');
        }

        const returnNumber = `RET-${Date.now()}-${order.id.slice(-4)}`.toUpperCase();

        // Retrieve vendorId from first item's product
        const orderItems = Array.isArray(order.items) ? (order.items as any[]) : [];
        const firstProductId = orderItems[0]?.productId;
        let vendorId = null;
        if (firstProductId) {
            const product = await this.prisma.product.findUnique({ where: { id: firstProductId } });
            vendorId = product?.vendorId;
        }

        return this.prisma.returnRequest.create({
            data: {
                returnNumber,
                userId,
                orderId: dto.orderId,
                vendorId,
                reason: dto.reason,
                description: dto.description,
                evidenceImages: dto.evidenceImages || [],
                evidenceVideo: dto.evidenceVideo,
                pickupAddress: dto.pickupAddress,
                status: ReturnStatus.PENDING_APPROVAL,
                items: {
                    create: dto.items.map((item) => ({
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                        reason: item.reason || dto.reason,
                        condition: item.condition,
                    })),
                },
                timeline: {
                    create: {
                        status: ReturnStatus.PENDING_APPROVAL,
                        action: 'RETURN_REQUESTED',
                        performedBy: 'CUSTOMER',
                        actorId: userId,
                        notes: 'Return request submitted by customer',
                    },
                },
            },
            include: { items: true },
        });
    }

    async findAll(query: any) {
        const { page = 1, limit = 10, status, search, userId } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (status && status !== 'ALL') where.status = status;
        if (userId) where.userId = userId;
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
                    order: { select: { id: true, items: true } }, // Fetch basic order info
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

    async findOne(id: string) {
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

        if (!returnReq) throw new NotFoundException('Return request not found');
        return returnReq;
    }

    async updateStatus(id: string, dto: UpdateReturnStatusDto, adminId: string) {
        const returnReq = await this.prisma.returnRequest.findUnique({
            where: { id },
            include: { vendor: true, items: true }
        });
        if (!returnReq) throw new NotFoundException('Return request not found');

        // Create Audit Log Entry
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
                    create: {
                        ...timelineEntry,
                        actorId: adminId,
                    },
                },
            },
            include: { timeline: true },
        });

        // INVENTORY LOGIC: Phase 6.1 (Restock on QC Pass)
        if (dto.status === ReturnStatus.QC_PASSED && returnReq.status !== ReturnStatus.QC_PASSED) {
            for (const item of returnReq.items) {
                await this.inventoryService.restoreStock(item.productId, item.quantity, item.variantId || undefined);
            }
        }

        // NOTIFICATION LOGIC: Alert Vendor if Approved
        if (dto.status === ReturnStatus.APPROVED && returnReq.vendor) {
            // Find User associated with Vendor Mobile
            const vendorUser = await this.prisma.user.findUnique({
                where: { mobile: returnReq.vendor.mobile }
            });

            if (vendorUser) {
                await this.notificationsService.createNotification(
                    vendorUser.id,
                    'Return Approved',
                    `Return Request #${returnReq.returnNumber} has been approved. Please prepare for pickup/action.`,
                    'RETURN', // NotificationType.RETURN ideally
                    'VENDOR'  // NotificationRole.VENDOR ideally
                );
            }
        }

        return updatedReturn;
    }

    async shipReplacement(id: string, trackingId: string, adminId: string) {
        const returnReq = await this.prisma.returnRequest.findUnique({ where: { id } });
        if (!returnReq) throw new NotFoundException('Return request not found');

        return this.prisma.returnRequest.update({
            where: { id },
            data: {
                status: ReturnStatus.REPLACEMENT_SHIPPED,
                replacementTrackingId: trackingId,
                timeline: {
                    create: {
                        status: ReturnStatus.REPLACEMENT_SHIPPED,
                        action: 'REPLACEMENT_DISPATCHED',
                        performedBy: 'ADMIN',
                        actorId: adminId,
                        notes: `Tracking ID: ${trackingId}`
                    }
                }
            }
        });
    }
}
