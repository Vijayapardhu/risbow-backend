import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { VendorPayoutsService } from './vendor-payouts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('vendor-payouts')
export class VendorPayoutsController {
    constructor(private readonly payoutsService: VendorPayoutsService) { }

    @Get('admin/due')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async getDuePayouts() {
        return this.payoutsService.getDuePayouts();
    }

    @Post('admin/process')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async processPayout(
        @Request() req,
        @Body() body: { vendorId: string; amount: number; transactionId: string; notes?: string }
    ) {
        const adminId = req.user.id;
        return this.payoutsService.processPayout(adminId, body.vendorId, body.amount, body.transactionId, body.notes);
    }

    @Get('history')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR, UserRole.WHOLESALER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async getMyHistory(@Request() req) {
        const vendorId = req.user.vendorId || req.user.id;
        return this.payoutsService.getPayoutHistory(vendorId);
    }

    @Get('balance')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR, UserRole.WHOLESALER)
    async getBalance(@Request() req) {
        const vendorId = req.user.vendorId || req.user.id;
        return this.payoutsService.getBalance(vendorId);
    }

    @Get('pending')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR, UserRole.WHOLESALER)
    async getPendingPayouts(@Request() req) {
        const vendorId = req.user.vendorId || req.user.id;
        return this.payoutsService.getPendingPayouts(vendorId);
    }

    @Post('request')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR, UserRole.WHOLESALER)
    async requestPayout(
        @Request() req,
        @Body() body: { amount: number; notes?: string }
    ) {
        const vendorId = req.user.vendorId || req.user.id;
        return this.payoutsService.requestPayout(vendorId, body.amount, body.notes);
    }
}
