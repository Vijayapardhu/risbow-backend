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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { AdminRoles } from '../auth/decorators/admin-roles.decorator';
import { RequirePermissions } from '../auth/decorators/admin-permissions.decorator';
import { Permission } from '../rbac/admin-permissions.service';
import { AdminBannersService } from './admin-banners.service';
import {
  CreateBannerDto,
  UpdateBannerDto,
  ToggleBannerStatusDto,
  BannerQueryDto,
  BannerResponseDto,
  BannerListResponseDto,
  BannerStatsDto,
} from './dto/admin-banner.dto';

@ApiTags('Admin - Banners')
@Controller('admin/banners')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@ApiBearerAuth()
export class AdminBannersController {
  constructor(private readonly adminBannersService: AdminBannersService) {}

  @Get()
  @ApiOperation({ summary: 'List all banners with optional filtering' })
  @ApiResponse({
    status: 200,
    description: 'List of banners retrieved successfully',
    type: BannerListResponseDto,
  })
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.CONTENT_MODERATOR)
  @RequirePermissions(Permission.BANNER_READ)
  async findAll(@Query() query: BannerQueryDto) {
    return this.adminBannersService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get banner statistics' })
  @ApiResponse({
    status: 200,
    description: 'Banner statistics retrieved successfully',
    type: BannerStatsDto,
  })
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.CONTENT_MODERATOR, AdminRole.ANALYTICS_VIEWER)
  @RequirePermissions(Permission.BANNER_READ)
  async getStats() {
    return this.adminBannersService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get banner by ID' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({
    status: 200,
    description: 'Banner retrieved successfully',
    type: BannerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.CONTENT_MODERATOR)
  @RequirePermissions(Permission.BANNER_READ)
  async findOne(@Param('id') id: string) {
    return this.adminBannersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new banner' })
  @ApiResponse({
    status: 201,
    description: 'Banner created successfully',
    type: BannerResponseDto,
  })
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.CONTENT_MODERATOR)
  @RequirePermissions(Permission.BANNER_CREATE)
  async create(@Body() createBannerDto: CreateBannerDto) {
    return this.adminBannersService.create(createBannerDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing banner' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({
    status: 200,
    description: 'Banner updated successfully',
    type: BannerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.CONTENT_MODERATOR)
  @RequirePermissions(Permission.BANNER_UPDATE)
  async update(
    @Param('id') id: string,
    @Body() updateBannerDto: UpdateBannerDto,
  ) {
    return this.adminBannersService.update(id, updateBannerDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Toggle banner active status' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({
    status: 200,
    description: 'Banner status updated successfully',
    type: BannerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.CONTENT_MODERATOR)
  @RequirePermissions(Permission.BANNER_UPDATE)
  async toggleStatus(
    @Param('id') id: string,
    @Body() toggleStatusDto: ToggleBannerStatusDto,
  ) {
    return this.adminBannersService.toggleStatus(id, toggleStatusDto.isActive);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a banner' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 204, description: 'Banner deleted successfully' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
  @RequirePermissions(Permission.BANNER_DELETE)
  async remove(@Param('id') id: string) {
    await this.adminBannersService.remove(id);
  }
}
