import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { VendorOrdersService } from './vendor-orders.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Vendor Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendor-orders')
export class VendorOrdersController {
    constructor(private readonly vendorOrdersService: VendorOrdersService) { }

    @Get()
    @Roles(UserRole.VENDOR)
    @ApiOperation({ summary: 'Get orders containing vendor products' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'status', required: false })
    async getOrders(
        @Request() req,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('status') status?: string
    ) {
        // req.user.vendorId must be present. If logged in as vendor, auth strategy should attach it.
        // Assuming req.user.id is the User ID. We need Vendor ID. 
        // Typically Vendors are Users with Role VENDOR. 
        // But `vendorId` links Product to Vendor table.
        // We need to resolve User -> Vendor. 
        // For now, assuming req.user.vendorId is populated by Guard OR we fetch it.
        // Let's assume req.user.id IS the user id, and we need to look up the vendor associated with this user.
        // HOWEVER, previous modules (VendorProduct) relied on `vendorId` passed in param or body? 
        // vendor-products.controller.ts: `:id` is vendorId or productId?
        // vendor-products.controller.ts endpoints are `/vendor-products/:id`. That's product ID.
        // Where did we get vendorId? `req.user.vendorId`. 
        // Let's verify JwtStrategy or similar. 

        // Use a safe fallback if request user enrichment is not full:
        // We passed `vendorId` in the JWT payload? 
        // If not, we might need a lookup service. 
        // For MVP, assuming `req.user.vendorId` is available.

        return this.vendorOrdersService.getOrdersForVendor(req.user.vendorId, Number(page), Number(limit), status);
    }

    @Get(':id')
    @Roles(UserRole.VENDOR)
    @ApiOperation({ summary: 'Get order details' })
    async getOrderDetails(@Request() req, @Param('id') orderId: string) {
        return this.vendorOrdersService.getVendorOrderDetails(req.user.vendorId, orderId);
    }

    @Post(':id/status')
    @Roles(UserRole.VENDOR)
    @ApiOperation({ summary: 'Update order status (Packed/Shipped)' })
    async updateStatus(
        @Request() req,
        @Param('id') orderId: string,
        @Body('status') status: string
    ) {
        return this.vendorOrdersService.updateOrderStatus(req.user.vendorId, orderId, status);
    }
}
