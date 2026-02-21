import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PromotionsService } from './promotions.service';

@ApiTags('Vendor Campaigns')
@Controller('vendor-campaigns')
@UseGuards(JwtAuthGuard)
export class VendorCampaignsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('available')
  @ApiOperation({ summary: 'Get available campaigns for vendor' })
  async getAvailableCampaigns(@Request() req: any) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.promotionsService.getAvailableCampaigns(vendorId);
  }

  @Get('enrollments')
  @ApiOperation({ summary: 'Get vendor campaign enrollments' })
  async getEnrollments(@Request() req: any) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.promotionsService.getVendorEnrollments(vendorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details' })
  async getCampaign(@Param('id') id: string) {
    return this.promotionsService.getCampaignById(id);
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'Get products in campaign' })
  async getCampaignProducts(@Param('id') id: string) {
    return this.promotionsService.getCampaignProducts(id);
  }

  @Post(':id/enroll')
  @ApiOperation({ summary: 'Enroll in a campaign' })
  async enrollInCampaign(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.promotionsService.enrollInCampaign(vendorId, id, dto);
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave a campaign' })
  async leaveCampaign(@Request() req: any, @Param('id') id: string) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.promotionsService.leaveCampaign(vendorId, id);
  }

  @Patch(':id/products/:productId')
  @ApiOperation({ summary: 'Update campaign product' })
  async updateCampaignProduct(
    @Request() req: any,
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Body() dto: any
  ) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.promotionsService.updateCampaignProduct(vendorId, id, productId, dto);
  }

  @Delete(':id/products/:productId')
  @ApiOperation({ summary: 'Remove product from campaign' })
  async removeCampaignProduct(
    @Request() req: any,
    @Param('id') id: string,
    @Param('productId') productId: string
  ) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.promotionsService.removeCampaignProduct(vendorId, id, productId);
  }
}
