import { Controller, Post, Body, Param, UseGuards, Request, Get, Query } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { CreateRefundRequestDto, ProcessRefundDto } from './dto/refund.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard'; // If exists
// import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Refunds')
@Controller('refunds')
export class RefundsController {
    constructor(private readonly refundsService: RefundsService) { }

    @Post('request')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Request a refund for an order' })
    requestRefund(@Request() req, @Body() dto: CreateRefundRequestDto) {
        return this.refundsService.requestRefund(req.user.id, dto);
    }

    @Get('my-refunds')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user refunds' })
    getMyRefunds(@Request() req) {
        return this.refundsService.getRefunds(req.user.id);
    }

    // ADMIN ENDPOINTS

    @Get('admin/all') // Avoiding conflict with :id ? No, 'admin/all' is specific. 
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all refunds (Admin)' })
    getAllRefunds(@Request() req) {
        // TODO: Add role check or use RolesGuard
        return this.refundsService.getAllRefunds();
    }

    @Post(':id/process')
    @UseGuards(JwtAuthGuard)
    // @Roles('ADMIN') // TODO: Enable RBAC
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Process a refund (Admin)' })
    processRefund(@Request() req, @Param('id') id: string, @Body() dto: ProcessRefundDto) {
        return this.refundsService.processRefund(req.user.id, id, dto);
    }
}
