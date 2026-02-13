import { Controller, Get, Post, Body, UseGuards, Request, Param, ParseIntPipe, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WholesalersService } from './wholesalers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateInquiryDto, RespondInquiryDto } from './dto/inquiry.dto';

@ApiTags('Wholesalers')
@Controller('wholesalers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WholesalersController {
    constructor(private readonly wholesalersService: WholesalersService) {}

    @Post('register')
    @ApiOperation({ summary: 'Register a new wholesaler' })
    async register(@Body() dto: any) {
        return this.wholesalersService.registerWholesaler(dto);
    }

    @Get('dashboard')
    @Roles(UserRole.WHOLESALER, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get wholesaler dashboard stats' })
    async getDashboard(@Request() req: any) {
        return this.wholesalersService.getWholesalerDashboard(req.user.vendorId || req.user.id);
    }

    @Post('products/bulk-upload')
    @Roles(UserRole.WHOLESALER)
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Bulk upload wholesale products via CSV' })
    async bulkUploadProducts(
        @Request() req: any,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new Error('CSV file is required');
        }
        return this.wholesalersService.bulkUploadProducts(
            req.user.vendorId || req.user.id,
            file.buffer,
        );
    }

    @Post('products/:productId/moq')
    @Roles(UserRole.WHOLESALER)
    @ApiOperation({ summary: 'Set MOQ for a wholesale product' })
    async setMOQ(
        @Request() req: any,
        @Param('productId') productId: string,
        @Body('moq', ParseIntPipe) moq: number,
    ) {
        return this.wholesalersService.setProductMOQ(
            req.user.vendorId || req.user.id,
            productId,
            moq,
        );
    }

    @Post('products/:productId/pricing-tiers')
    @Roles(UserRole.WHOLESALER)
    @ApiOperation({ summary: 'Set wholesale pricing tiers for a product' })
    async setPricingTiers(
        @Request() req: any,
        @Param('productId') productId: string,
        @Body('tiers') tiers: Array<{ minQty: number; pricePerUnit: number }>,
    ) {
        return this.wholesalersService.setWholesalePricingTiers(
            req.user.vendorId || req.user.id,
            productId,
            tiers,
        );
    }

    @Get('inquiries')
    @Roles(UserRole.WHOLESALER)
    @ApiOperation({ summary: 'Get vendor inquiries for wholesaler products' })
    async getInquiries(@Request() req: any) {
        return this.wholesalersService.getVendorInquiries(req.user.vendorId || req.user.id);
    }

    @Post('inquiries')
    @Roles(UserRole.VENDOR)
    @ApiOperation({ summary: 'Create an inquiry to a wholesaler product (Vendor buyer)' })
    async createInquiry(@Request() req: any, @Body() dto: CreateInquiryDto) {
        return this.wholesalersService.createInquiry(req.user.id, dto);
    }

    @Get('inquiries/me')
    @Roles(UserRole.VENDOR)
    @ApiOperation({ summary: 'Get my inquiries (Vendor buyer)' })
    async getMyInquiries(@Request() req: any) {
        return this.wholesalersService.getMyInquiries(req.user.id);
    }

    @Post('inquiries/:id/respond')
    @Roles(UserRole.WHOLESALER)
    @ApiOperation({ summary: 'Respond to an inquiry (Wholesaler)' })
    async respondInquiry(@Request() req: any, @Param('id') inquiryId: string, @Body() dto: RespondInquiryDto) {
        const wholesalerVendorId = req.user.vendorId || req.user.id;
        return this.wholesalersService.respondToInquiry(wholesalerVendorId, inquiryId, dto);
    }

    @Post('inquiries/:id/accept')
    @Roles(UserRole.VENDOR)
    @ApiOperation({ summary: 'Accept a wholesaler\'s response to inquiry (Vendor buyer)' })
    async acceptInquiry(@Request() req: any, @Param('id') inquiryId: string) {
        return this.wholesalersService.acceptInquiry(req.user.id, inquiryId);
    }

    @Post('inquiries/:id/reject')
    @Roles(UserRole.VENDOR)
    @ApiOperation({ summary: 'Reject a wholesaler\'s response to inquiry (Vendor buyer)' })
    async rejectInquiry(@Request() req: any, @Param('id') inquiryId: string) {
        return this.wholesalersService.rejectInquiry(req.user.id, inquiryId);
    }

    @Get('analytics')
    @Roles(UserRole.WHOLESALER, UserRole.ADMIN)
    @ApiOperation({ summary: 'Get wholesaler analytics' })
    async getAnalytics(
        @Request() req: any,
        @Body('period') period?: '7d' | '30d' | '90d',
    ) {
        return this.wholesalersService.getWholesalerAnalytics(
            req.user.vendorId || req.user.id,
            period || '30d',
        );
    }
}
