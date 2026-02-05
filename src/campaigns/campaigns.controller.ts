import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CampaignsService } from '../admin/campaigns.service';

@ApiTags('Campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get all active campaigns (public)' })
  @ApiResponse({ status: 200, description: 'Active campaigns retrieved successfully' })
  async getActiveCampaigns() {
    return this.campaignsService.getActiveCampaigns();
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get campaign discount for a product' })
  @ApiResponse({ status: 200, description: 'Campaign discount info retrieved' })
  async getProductCampaignDiscount(@Param('productId') productId: string) {
    return this.campaignsService.getProductCampaignDiscount(productId);
  }

  @Post(':id/impression')
  @ApiOperation({ summary: 'Track campaign impression' })
  @ApiResponse({ status: 200, description: 'Impression tracked' })
  async trackImpression(@Param('id') id: string) {
    await this.campaignsService.incrementImpression(id);
    return { message: 'Impression tracked' };
  }

  @Post(':id/click')
  @ApiOperation({ summary: 'Track campaign click' })
  @ApiResponse({ status: 200, description: 'Click tracked' })
  async trackClick(@Param('id') id: string) {
    await this.campaignsService.incrementClick(id);
    return { message: 'Click tracked' };
  }
}
