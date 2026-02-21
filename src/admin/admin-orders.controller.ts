import { Controller, Get, Patch, Query, Param, Body, UseGuards, Request, Post, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { DriversService } from '../drivers/drivers.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtAuthGuard } from './auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from './auth/guards/admin-permissions.guard';
import { AdminRoles } from './auth/decorators/admin-roles.decorator';
import { AdminRole, OrderStatus, DriverStatus } from '@prisma/client';
import { ArrivalProofService } from '../vendor-orders/arrival-proof.service';
import { PackingProofService } from '../vendor-orders/packing-proof.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFile } from '@nestjs/common';

@Controller('admin/orders')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
export class AdminOrdersController {
    constructor(
        private readonly ordersService: OrdersService,
        private readonly driversService: DriversService,
        private readonly prisma: PrismaService,
        private readonly arrivalProof: ArrivalProofService,
        private readonly packingProof: PackingProofService,
    ) { }

    @Get()
    async findAll(
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('search') search: string,
        @Query('status') status: OrderStatus,
        @Query('sort') sort: string,
        @Query('paymentStatus') paymentStatus: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('vendorId') vendorId: string
    ) {
        return this.ordersService.findAllOrders({
            page: Number(page) || 1,
            limit: Number(limit) || 10,
            search,
            status,
            sort,
            paymentStatus,
            startDate,
            endDate,
            vendorId
        });
    }

    // ── Literal routes MUST appear before @Get(':id') to avoid shadowing ──
    @Get('export')
    async exportOrdersJson(
        @Query('status') status?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '200',
    ) {
        const where: any = {};
        if (status) where.status = status.toUpperCase();
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(500, Number(limit) || 200);
        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
                select: {
                    id: true,
                    orderNumber: true,
                    status: true,
                    totalAmount: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.order.count({ where }),
        ]);
        return {
            data: orders,
            meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum), exportedAt: new Date().toISOString() },
        };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.ordersService.getOrderDetail(id);
    }

    @Get(':id/group')
    async findOrderGroup(@Param('id') id: string) {
        return this.ordersService.getOrderGroup(id);
    }

    @Patch(':id/status')
    async updateStatus(
        @Request() req: any,
        @Param('id') id: string,
        @Body('status') status: OrderStatus,
        @Body('notes') notes?: string,
    ) {
        return this.ordersService.updateOrderStatus(id, status, req.user?.id, req.user?.role, notes);
    }

    @Patch(':id/payment-status')
    async updatePaymentStatus(
        @Param('id') id: string,
        @Body('paymentStatus') paymentStatus: string,
        @Body('notes') notes?: string,
    ) {
        return this.ordersService.updatePaymentStatus(id, paymentStatus, notes);
    }

    // Driver Assignment Endpoints
    @Get(':id/available-drivers')
    async getAvailableDrivers(@Param('id') id: string) {
        // Check order exists
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                Delivery: { take: 1, orderBy: { createdAt: 'desc' } },
                address: true
            }
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Get all active and available drivers
        const drivers = await this.prisma.driver.findMany({
            where: {
                status: { in: [DriverStatus.ACTIVE, DriverStatus.VERIFIED] },
                isAvailable: true,
            },
            select: {
                id: true,
                driverId: true,
                name: true,
                mobile: true,
                vehicleType: true,
                vehicleNumber: true,
                isOnline: true,
            },
            orderBy: { name: 'asc' },
        });

        return {
            orderId: id,
            currentDriver: order.Delivery[0]?.driverId || null,
            drivers,
        };
    }

    @Post(':id/assign-driver')
    async assignDriver(
        @Param('id') id: string,
        @Body('driverId') driverId: string,
    ) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                Delivery: { take: 1, orderBy: { createdAt: 'desc' } },
                address: true,
            }
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Check if driver exists and is available
        const driver = await this.prisma.driver.findUnique({
            where: { id: driverId }
        });

        if (!driver) {
            throw new NotFoundException('Driver not found');
        }

        // Update order with driver assignment
        await this.prisma.order.update({
            where: { id },
            data: {
                isThirdPartyDelivery: false,
                courierPartner: null,
                trackingId: null,
            }
        });

        // Create or update delivery record
        if (order.Delivery && order.Delivery.length > 0) {
            await this.prisma.delivery.update({
                where: { id: order.Delivery[0].id },
                data: {
                    driverId,
                    status: 'ASSIGNED',
                }
            });
        } else {
            await this.driversService.createDelivery({
                orderId: id,
                driverId,
                pickupAddress: 'Vendor Warehouse',
                deliveryAddress: order.address ?
                    `${order.address.addressLine1}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}` :
                    'Customer Address',
            });
        }

        return {
            success: true,
            message: `Driver ${driver.name} assigned to order ${id}`,
            driver: {
                id: driver.id,
                name: driver.name,
                mobile: driver.mobile,
            }
        };
    }

    @Post(':id/assign-third-party')
    async assignThirdPartyDelivery(
        @Param('id') id: string,
        @Body('courierPartner') courierPartner: string,
        @Body('trackingId') trackingId: string,
    ) {
        if (!courierPartner || !trackingId) {
            throw new BadRequestException('Courier partner name and tracking ID are required');
        }

        const order = await this.prisma.order.findUnique({
            where: { id }
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Update order with third-party delivery info
        await this.prisma.order.update({
            where: { id },
            data: {
                isThirdPartyDelivery: true,
                courierPartner,
                trackingId,
                awbNumber: trackingId, // For backward compatibility
            }
        });

        return {
            success: true,
            message: `Third-party delivery assigned: ${courierPartner}`,
            courierPartner,
            trackingId,
        };
    }

    @Get(':id/tracking-info')
    async getTrackingInfo(@Param('id') id: string) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                Delivery: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        Driver: {
                            select: {
                                id: true,
                                name: true,
                                mobile: true,
                                vehicleType: true,
                                vehicleNumber: true,
                            }
                        }
                    }
                }
            }
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const latestDelivery = order.Delivery && order.Delivery.length > 0 ? order.Delivery[0] : null;

        return {
            orderId: id,
            isThirdPartyDelivery: order.isThirdPartyDelivery,
            courierPartner: order.courierPartner,
            trackingId: order.trackingId,
            awbNumber: order.awbNumber,
            driver: latestDelivery?.Driver || null,
            deliveryStatus: latestDelivery?.status || null,
        };
    }

    @Post(':id/mark-shipped')
    @UseInterceptors(FileInterceptor('video'))
    async markShipped(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
        @Request() req: any
    ) {
        // 1. Identify vendor (just picking first as simplified)
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) throw new NotFoundException('Order not found');

        const items = (order.itemsSnapshot as any[]) || [];
        const vendorId = items[0]?.vendorId;
        if (!vendorId) throw new BadRequestException('Vendor not found for order');

        // 2. Upload video proof if not already exists
        const hasProof = await this.packingProof.hasProof(id);
        if (!hasProof) {
            if (!file) {
                throw new BadRequestException('Packing video proof is mandatory. Please upload packing video.');
            }
            await this.packingProof.uploadPackingVideo({
                orderId: id,
                vendorId,
                userId: req.user.id,
                file
            });
        }

        // 3. Update status to SHIPPED
        return this.ordersService.updateOrderStatus(id, 'SHIPPED' as OrderStatus, req.user.id, req.user.role, 'Marked shipped via admin panel');
    }

    @Post(':id/mark-arrived')
    @UseInterceptors(FileInterceptor('video'))
    async markArrived(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
        @Request() req: any
    ) {
        // 1. Identify vendor (just picking first as simplified)
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) throw new NotFoundException('Order not found');

        const items = (order.itemsSnapshot as any[]) || [];
        const vendorId = items[0]?.vendorId;
        if (!vendorId) throw new BadRequestException('Vendor not found for order');

        // 2. Upload video proof
        await this.arrivalProof.uploadArrivalVideo({
            orderId: id,
            vendorId,
            userId: req.user.id,
            file
        });

        // 3. Update status to ARRIVED
        return this.ordersService.updateOrderStatus(id, 'ARRIVED' as OrderStatus, req.user.id, req.user.role, 'Marked arrived via webcam');
    }
}
