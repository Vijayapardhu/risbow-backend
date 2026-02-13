import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { VendorPayoutsService } from './vendor-payouts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, PayoutStatus } from '@prisma/client';

@Controller('vendor-payouts')
export class VendorPayoutsController {
    constructor(private readonly payoutsService: VendorPayoutsService) { }

    @Get('admin/due')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async getDuePayouts() {
        return this.payoutsService.getDuePayouts();
    }

    @Get('admin/history')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async getAdminHistory(@Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: PayoutStatus | string) {
        return this.payoutsService.getAdminPayoutHistory({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            status
        });
    }

    @Post('admin/process')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async processPayout(
        @Request() req: any,
        @Body() body: { vendorId: string; amount: number; transactionId: string }
    ) {
        const adminId = req.user.id;
        return this.payoutsService.processPayout(adminId, body.vendorId, body.amount, body.transactionId);
    }

    @Get('history')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR, UserRole.WHOLESALER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async getMyHistory(@Request() req: any) {
        const vendorId = req.user.vendorId || req.user.id;
        return this.payoutsService.getPayoutHistory(vendorId);
    }

    @Get('balance')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR, UserRole.WHOLESALER)
    async getBalance(@Request() req: any) {
        const vendorId = req.user.vendorId || req.user.id;
        return this.payoutsService.getBalance(vendorId);
    }

    @Get('pending')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR, UserRole.WHOLESALER)
    async getPendingPayouts(@Request() req: any) {
        const vendorId = req.user.vendorId || req.user.id;
        return this.payoutsService.getPendingPayouts(vendorId);
    }

    @Post('request')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR, UserRole.WHOLESALER)
    async requestPayout(
        @Request() req: any,
        @Body() body: { amount: number }
    ) {
        const vendorId = req.user.vendorId || req.user.id;
        return this.payoutsService.requestPayout(vendorId, body.amount);
    }
}
