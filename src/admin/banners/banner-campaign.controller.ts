import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BannerCampaignService } from './banner-campaign.service';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { AdminPermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { RequirePermissions } from '../auth/decorators/admin-permissions.decorator';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { Permission } from '../rbac/admin-permissions.service';
import { IsString, IsEnum, IsOptional, IsNumber, IsDateString, IsObject, IsArray, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// BannerCampaignStatus enum since it's not exported from Prisma
enum BannerCampaignStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

// DTOs
class CreateCampaignDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  vendorId?: string;

  @ApiProperty()
  @IsString()
  bannerId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  position: string;

  @ApiProperty()
  @IsString()
  imageUrl: string;

  @ApiProperty()
  @IsString()
  targetUrl: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  budget?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  dailyBudget?: number;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  targetAudience?: Record<string, any>;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsOptional()
  categories?: string[];

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  priority?: number;

  id?: string;
}

class UpdateCampaignDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  targetUrl?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  budget?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  dailyBudget?: number;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  targetAudience?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  priority?: number;
}

class UpdatePricingDto {
  @ApiProperty()
  @IsString()
  position: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  dailyRate: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  cpcRate: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  cpmRate: number;
}

@ApiTags('Banner Campaigns')
@Controller('admin/banners')
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@ApiBearerAuth()
export class BannerCampaignController {
  constructor(private campaignService: BannerCampaignService) {}

  @Get('positions')
  @RequirePermissions(Permission.BANNER_READ)
  @ApiOperation({
    summary: 'Get banner positions',
    description: 'Get all available banner positions with specifications',
  })
  @ApiResponse({ status: 200, description: 'Positions retrieved' })
  getBannerPositions() {
    return this.campaignService.getBannerPositions();
  }

  @Get('pricing')
  @RequirePermissions(Permission.BANNER_READ)
  @ApiOperation({
    summary: 'Get banner pricing',
    description: 'Get pricing for all banner positions',
  })
  @ApiResponse({ status: 200, description: 'Pricing retrieved' })
  async getAllPricing() {
    return this.campaignService.getAllPricing();
  }

  @Put('pricing')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  @ApiOperation({
    summary: 'Update banner pricing',
    description: 'Update pricing for a banner position',
  })
  @ApiResponse({ status: 200, description: 'Pricing updated' })
  async updatePricing(
    @Body() dto: UpdatePricingDto,
    @CurrentAdmin('id') adminId: string,
  ) {
    return this.campaignService.updatePricing(
      dto.position,
      dto.dailyRate,
      dto.cpcRate,
      dto.cpmRate,
      adminId,
    );
  }

  @Post()
  @RequirePermissions(Permission.BANNER_CREATE)
  @ApiOperation({
    summary: 'Create banner campaign',
    description: 'Create a new banner campaign',
  })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  async createCampaign(
    @Body() dto: CreateCampaignDto,
    @CurrentAdmin('id') adminId: string,
  ) {
    return this.campaignService.createCampaign({
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      createdBy: adminId,
    });
  }

  @Get()
  @RequirePermissions(Permission.BANNER_READ)
  @ApiOperation({
    summary: 'Get campaigns',
    description: 'Get banner campaigns with filters',
  })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: BannerCampaignStatus })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'position', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved' })
  async getCampaigns(
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: BannerCampaignStatus,
    @Query('type') type?: string,
    @Query('position') position?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.campaignService.getCampaigns({
      vendorId,
      status,
      type,
      position,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('pending')
  @RequirePermissions(Permission.BANNER_APPROVE)
  @ApiOperation({
    summary: 'Get pending campaigns',
    description: 'Get campaigns pending approval',
  })
  @ApiResponse({ status: 200, description: 'Pending campaigns retrieved' })
  async getPendingCampaigns(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.campaignService.getPendingCampaigns(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  @RequirePermissions(Permission.BANNER_READ)
  @ApiOperation({
    summary: 'Get campaign analytics',
    description: 'Get detailed campaign analytics',
  })
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
  async getCampaignAnalytics(@Param('id') id: string) {
    return this.campaignService.getCampaignAnalytics(id);
  }

  @Put(':id')
  @RequirePermissions(Permission.BANNER_UPDATE)
  @ApiOperation({
    summary: 'Update campaign',
    description: 'Update an existing campaign',
  })
  @ApiResponse({ status: 200, description: 'Campaign updated' })
  async updateCampaign(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentAdmin('id') adminId: string,
  ) {
    return this.campaignService.updateCampaign(id, {
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      updatedBy: adminId,
    });
  }

  @Post(':id/approve')
  @RequirePermissions(Permission.BANNER_APPROVE)
  @ApiOperation({
    summary: 'Approve campaign',
    description: 'Approve a pending campaign',
  })
  @ApiResponse({ status: 200, description: 'Campaign approved' })
  async approveCampaign(
    @Param('id') id: string,
    @CurrentAdmin() admin: any,
  ) {
    return this.campaignService.approveCampaign(id, admin.id, admin.email);
  }

  @Post(':id/reject')
  @RequirePermissions(Permission.BANNER_APPROVE)
  @ApiOperation({
    summary: 'Reject campaign',
    description: 'Reject a pending campaign',
  })
  @ApiResponse({ status: 200, description: 'Campaign rejected' })
  async rejectCampaign(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentAdmin() admin: any,
  ) {
    return this.campaignService.rejectCampaign(id, reason, admin.id, admin.email);
  }

  @Post(':id/pause')
  @RequirePermissions(Permission.BANNER_UPDATE)
  @ApiOperation({
    summary: 'Pause campaign',
    description: 'Pause a running campaign',
  })
  @ApiResponse({ status: 200, description: 'Campaign paused' })
  async pauseCampaign(
    @Param('id') id: string,
    @CurrentAdmin('id') adminId: string,
  ) {
    return this.campaignService.pauseCampaign(id, adminId);
  }

  @Post(':id/resume')
  @RequirePermissions(Permission.BANNER_UPDATE)
  @ApiOperation({
    summary: 'Resume campaign',
    description: 'Resume a paused campaign',
  })
  @ApiResponse({ status: 200, description: 'Campaign resumed' })
  async resumeCampaign(
    @Param('id') id: string,
    @CurrentAdmin('id') adminId: string,
  ) {
    return this.campaignService.resumeCampaign(id, adminId);
  }

  @Delete(':id')
  @RequirePermissions(Permission.BANNER_DELETE)
  @ApiOperation({
    summary: 'Cancel campaign',
    description: 'Cancel a campaign',
  })
  @ApiResponse({ status: 200, description: 'Campaign cancelled' })
  async cancelCampaign(
    @Param('id') id: string,
    @CurrentAdmin('id') adminId: string,
  ) {
    return this.campaignService.cancelCampaign(id, adminId);
  }

  @Post('process/start-scheduled')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  @ApiOperation({
    summary: 'Start scheduled campaigns',
    description: 'Process and start scheduled campaigns (cron job)',
  })
  @ApiResponse({ status: 200, description: 'Scheduled campaigns started' })
  async startScheduledCampaigns() {
    return this.campaignService.startScheduledCampaigns();
  }

  @Post('process/complete-expired')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  @ApiOperation({
    summary: 'Complete expired campaigns',
    description: 'Process and complete expired campaigns (cron job)',
  })
  @ApiResponse({ status: 200, description: 'Expired campaigns completed' })
  async completeExpiredCampaigns() {
    return this.campaignService.completeExpiredCampaigns();
  }
}
