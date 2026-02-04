import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateReturnStatusDto } from './dto/update-return.dto';
import { NotificationsService } from '../shared/notifications.service';
import { InventoryService } from '../inventory/inventory.service';
import { ReturnStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class ReturnsService {
    private readonly logger = new Logger(ReturnsService.name);

    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
        private inventoryService: InventoryService
    ) { }

    async create(userId: string, dto: CreateReturnDto) {
        const order = await this.prisma.order.findUnique({
            where: { id: dto.orderId, userId },
        });

        if (!order) throw new NotFoundException('Order not found');

        if (order.status !== 'DELIVERED') {
            throw new BadRequestException('Returns can only be requested for delivered orders');
        }

        const returnNumber = `RET-${Date.now()}-${order.id.slice(-4)}`.toUpperCase();

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
            include: { ReturnRequestItem: true },
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
                    ReturnRequestItem: { include: { Product: true } },
                    User: { select: { name: true, email: true, mobile: true } },
                    Order: { select: { id: true, items: true } },
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
                ReturnRequestItem: { include: { Product: true } },
                User: true,
                Order: true,
                timeline: { orderBy: { timestamp: 'desc' } },
                settlement: true,
                Vendor: true,
            },
        });

        if (!returnReq) throw new NotFoundException('Return request not found');
        return returnReq;
    }

    async updateStatus(id: string, dto: UpdateReturnStatusDto, adminId: string) {
        const returnReq = await this.prisma.returnRequest.findUnique({
            where: { id },
            include: { Vendor: true, ReturnRequestItem: true, Order: true }
        });
        if (!returnReq) throw new NotFoundException('Return request not found');

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

        if (dto.status === ReturnStatus.QC_PASSED && returnReq.status !== ReturnStatus.QC_PASSED) {
            for (const item of returnReq.items) {
                await this.inventoryService.restoreStock(item.productId, item.quantity, item.variantId || undefined);
            }
        }

        if (dto.status === ReturnStatus.APPROVED && returnReq.vendor) {
            const vendorUser = await this.prisma.user.findUnique({
                where: { mobile: returnReq.vendor.mobile }
            });

            if (vendorUser) {
                await this.notificationsService.createNotification(
                    vendorUser.id,
                    'Return Approved',
                    `Return Request #${returnReq.returnNumber} has been approved.`,
                    'RETURN',
                    'VENDOR'
                );
            }
        }

        if (dto.status === ReturnStatus.APPROVED && returnReq.status !== ReturnStatus.APPROVED) {
            await this.createReplacementOrder(returnReq.id);
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

    private async createReplacementOrder(returnId: string): Promise<any> {
        const returnReq = await this.prisma.returnRequest.findUnique({
            where: { id: returnId },
            include: { order: true, items: true }
        });

        if (!returnReq || !returnReq.order) {
            throw new NotFoundException('Return request or associated order not found');
        }

        try {
            const replacementOrder = await this.prisma.$transaction(async (tx) => {
                const newOrder = await tx.order.create({
                    data: {
                        userId: returnReq.userId,
                        roomId: returnReq.order.roomId,
                        addressId: returnReq.order.addressId,
                        items: returnReq.order.items as any,
                        totalAmount: 0,
                        coinsUsed: 0,
                        status: 'CONFIRMED',
                        discountAmount: 0,
                        shippingCharges: 0
                    }
                });

                await (tx as any).replacementOrder.create({
                    data: {
                        originalOrderId: returnReq.orderId,
                        returnId: returnReq.id,
                        newOrderId: newOrder.id
                    }
                });

                for (const item of returnReq.items) {
                    await this.inventoryService.deductStock(
                        item.productId,
                        item.quantity,
                        item.variantId || undefined,
                        tx
                    );
                }

                return newOrder;
            });

            this.logger.log(`Replacement order created: ${replacementOrder.id}`);
            return replacementOrder;
        } catch (error) {
            this.logger.error(`Failed to create replacement order: ${error.message}`);
            throw error;
        }
    }

    async submitQCChecklist(orderId: string, inspectorId: string, checklist: any) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');

        const qc = await (this.prisma as any).returnQCChecklist.upsert({
            where: { orderId },
            update: {
                inspectorId,
                status: true,
                isOriginalPackaging: checklist.isOriginalPackaging,
                isUnused: checklist.isUnused,
                allAccessoriesPresent: checklist.allAccessoriesPresent,
                hasPhysicalDamage: checklist.hasPhysicalDamage,
                imeiMatch: checklist.imeiMatch,
                photos: checklist.photos || [],
                notes: checklist.notes
            },
            create: {
                orderId,
                inspectorId,
                status: true,
                isOriginalPackaging: checklist.isOriginalPackaging,
                isUnused: checklist.isUnused,
                allAccessoriesPresent: checklist.allAccessoriesPresent,
                hasPhysicalDamage: checklist.hasPhysicalDamage,
                imeiMatch: checklist.imeiMatch,
                photos: checklist.photos || [],
                notes: checklist.notes
            }
        });

        if (!checklist.hasPhysicalDamage && checklist.isUnused && checklist.allAccessoriesPresent) {
            await this.prisma.order.update({
                where: { id: orderId },
                data: { status: 'RETURN_RECEIVED' as any }
            });
            this.logger.log(`QC Passed for order ${orderId}. Status: RETURN_RECEIVED`);
        } else {
            this.logger.warn(`QC Failed for order ${orderId}.`);
        }

        return qc;
    }
}