import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BannerCampaignsService } from './banner-campaigns.service';
import { CreateBannerCampaignDto } from './dto/create-banner-campaign.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Banner Campaigns')
@Controller('banner-campaigns')
@ApiBearerAuth()
export class BannerCampaignsController {
  constructor(private readonly bannerCampaignsService: BannerCampaignsService) {}

  @Post('banner/:bannerId')
  @ApiOperation({ summary: 'Create a banner campaign (Vendor only)' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  async createCampaign(
    @Param('bannerId') bannerId: string,
    @Body() dto: CreateBannerCampaignDto,
    @CurrentUser() user: any,
  ) {
    return this.bannerCampaignsService.createCampaign(user.id, bannerId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get all campaigns for the current vendor' })
  @ApiResponse({ status: 200, description: 'List of vendor campaigns' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  async getMyCampaigns(@CurrentUser() user: any) {
    return this.bannerCampaignsService.getVendorCampaigns(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a campaign by ID' })
  @ApiResponse({ status: 200, description: 'Campaign details' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getCampaignById(@Param('id') id: string) {
    return this.bannerCampaignsService.getCampaignById(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get campaign statistics (impressions, clicks, CTR)' })
  @ApiResponse({ status: 200, description: 'Campaign statistics' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getCampaignStats(@Param('id') id: string) {
    return this.bannerCampaignsService.getCampaignStats(id);
  }
}
