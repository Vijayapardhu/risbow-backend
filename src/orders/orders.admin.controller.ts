import { Controller, Get, Patch, Query, Param, Body, UseGuards, Request, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { DriversService } from '../drivers/drivers.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OrderStatus, DriverStatus } from '@prisma/client';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class OrdersAdminController {
    constructor(
        private readonly ordersService: OrdersService,
        private readonly driversService: DriversService,
        private readonly prisma: PrismaService,
    ) { }

    @Get()
    async findAll(
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('search') search: string,
        @Query('status') status: OrderStatus,
        @Query('sort') sort: string
    ) {
        return this.ordersService.findAllOrders({
            page: Number(page) || 1,
            limit: Number(limit) || 10,
            search,
            status,
            sort
        });
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.ordersService.getOrderDetail(id);
    }

    @Patch(':id/status')
    async updateStatus(
        @Request() req,
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
            return { error: 'Order not found' };
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
            return { error: 'Order not found' };
        }

        // Check if driver exists and is available
        const driver = await this.prisma.driver.findUnique({
            where: { id: driverId }
        });

        if (!driver) {
            return { error: 'Driver not found' };
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
            return { error: 'Courier partner name and tracking ID are required' };
        }

        const order = await this.prisma.order.findUnique({
            where: { id }
        });

        if (!order) {
            return { error: 'Order not found' };
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
            return { error: 'Order not found' };
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
}
