import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Request } from '@nestjs/common';
import { VendorReturnsService } from './vendor-returns.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Vendor Returns')
@ApiBearerAuth()
@Controller('vendor-returns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('VENDOR')
export class VendorReturnsController {
    constructor(private readonly vendorReturnsService: VendorReturnsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all returns for vendor' })
    findAll(@Request() req: any, @Query() query: any) {
        const vendorId = req.user.vendorId || req.user.id;
        return this.vendorReturnsService.findAllForVendor(vendorId, query);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get return statistics for vendor' })
    getStats(@Request() req: any) {
        const vendorId = req.user.vendorId || req.user.id;
        return this.vendorReturnsService.getStatsForVendor(vendorId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get return details' })
    findOne(@Request() req: any, @Param('id') id: string) {
        const vendorId = req.user.vendorId || req.user.id;
        return this.vendorReturnsService.findOneForVendor(vendorId, id);
    }

    @Post(':id/accept')
    @ApiOperation({ summary: 'Accept return request' })
    acceptReturn(@Request() req: any, @Param('id') id: string) {
        const vendorId = req.user.vendorId || req.user.id;
        return this.vendorReturnsService.acceptReturn(vendorId, id);
    }

    @Post(':id/reject')
    @ApiOperation({ summary: 'Reject return request' })
    rejectReturn(@Request() req: any, @Param('id') id: string, @Body('reason') reason: string) {
        const vendorId = req.user.vendorId || req.user.id;
        return this.vendorReturnsService.rejectReturn(vendorId, id, reason);
    }

    @Post(':id/received')
    @ApiOperation({ summary: 'Mark return as received' })
    markReceived(@Request() req: any, @Param('id') id: string) {
        const vendorId = req.user.vendorId || req.user.id;
        return this.vendorReturnsService.markReceived(vendorId, id);
    }

    @Post(':id/refund')
    @ApiOperation({ summary: 'Initiate refund' })
    initiateRefund(@Request() req: any, @Param('id') id: string) {
        const vendorId = req.user.vendorId || req.user.id;
        return this.vendorReturnsService.initiateRefund(vendorId, id);
    }

    @Post(':id/complete')
    @ApiOperation({ summary: 'Complete return process' })
    completeReturn(@Request() req: any, @Param('id') id: string) {
        const vendorId = req.user.vendorId || req.user.id;
        return this.vendorReturnsService.completeReturn(vendorId, id);
    }
}
