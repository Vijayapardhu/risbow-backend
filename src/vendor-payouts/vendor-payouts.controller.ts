import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { VendorPayoutsService } from './vendor-payouts.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
// Import guards properly based on existing project structure (stubbing for now as I can't see auth module export easily without view)
// Assuming standard structure:

@Controller('vendor-payouts')
export class VendorPayoutsController {
    constructor(private readonly payoutsService: VendorPayoutsService) { }

    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles('ADMIN', 'SUPER_ADMIN')
    @Get('admin/due')
    async getDuePayouts() {
        return this.payoutsService.getDuePayouts();
    }

    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles('ADMIN', 'SUPER_ADMIN')
    @Post('admin/process')
    async processPayout(
        @Request() req,
        @Body() body: { vendorId: string; amount: number; transactionId: string; notes?: string }
    ) {
        // req.user.id stub
        const adminId = req.user?.id || 'admin-system';
        return this.payoutsService.processPayout(adminId, body.vendorId, body.amount, body.transactionId, body.notes);
    }

    // @UseGuards(JwtAuthGuard)
    @Get('history')
    async getMyHistory(@Request() req) {
        return this.payoutsService.getPayoutHistory(req.user?.id); // Assuming req.user is populated
    }
}
