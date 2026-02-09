import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto, CampaignFilterDto } from './dto/campaign.dto';
import { AdminJwtAuthGuard } from './auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from './auth/guards/admin-permissions.guard';
import { AdminRole } from '@prisma/client';
import { AdminRoles } from './auth/decorators/admin-roles.decorator';

@ApiTags('Admin - Campaigns')
@Controller('admin/campaigns')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@ApiBearerAuth()
export class AdminCampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @AdminRoles(AdminRole.OPERATIONS_ADMIN)
  @ApiOperation({ summary: 'Create a new campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  async createCampaign(@Body() dto: CreateCampaignDto, @Request() req) {
    return this.campaignsService.createCampaign(dto, req.user?.id);
  }

  @Get()
  @AdminRoles(AdminRole.OPERATIONS_ADMIN)
  @ApiOperation({ summary: 'Get all campaigns with filters' })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
  async getCampaigns(@Query() filters: CampaignFilterDto) {
    return this.campaignsService.getCampaigns(filters);
  }

  @Get(':id')
  @AdminRoles(AdminRole.OPERATIONS_ADMIN)
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiResponse({ status: 200, description: 'Campaign retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getCampaignById(@Param('id') id: string) {
    return this.campaignsService.getCampaignById(id);
  }

  @Patch(':id')
  @AdminRoles(AdminRole.OPERATIONS_ADMIN)
  @ApiOperation({ summary: 'Update campaign' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async updateCampaign(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.updateCampaign(id, dto);
  }

  @Delete(':id')
  @AdminRoles(AdminRole.OPERATIONS_ADMIN)
  @ApiOperation({ summary: 'Delete campaign' })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async deleteCampaign(@Param('id') id: string) {
    return this.campaignsService.deleteCampaign(id);
  }

  @Post(':id/activate')
  @AdminRoles(AdminRole.OPERATIONS_ADMIN)
  @ApiOperation({ summary: 'Activate campaign manually' })
  @ApiResponse({ status: 200, description: 'Campaign activated successfully' })
  async activateCampaign(@Param('id') id: string) {
    return this.campaignsService.activateCampaign(id);
  }

  @Post(':id/pause')
  @AdminRoles(AdminRole.OPERATIONS_ADMIN)
  @ApiOperation({ summary: 'Pause active campaign' })
  @ApiResponse({ status: 200, description: 'Campaign paused successfully' })
  async pauseCampaign(@Param('id') id: string) {
    return this.campaignsService.pauseCampaign(id);
  }

  @Post(':id/end')
  @AdminRoles(AdminRole.OPERATIONS_ADMIN)
  @ApiOperation({ summary: 'End campaign manually' })
  @ApiResponse({ status: 200, description: 'Campaign ended successfully' })
  async endCampaign(@Param('id') id: string) {
    return this.campaignsService.endCampaign(id);
  }

  @Get(':id/analytics')
  @AdminRoles(AdminRole.OPERATIONS_ADMIN)
  @ApiOperation({ summary: 'Get campaign analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getCampaignAnalytics(@Param('id') id: string) {
    return this.campaignsService.getCampaignAnalytics(id);
  }
}
