import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { NotificationsAdminService } from './notifications-admin.service';
import { AdminJwtAuthGuard } from '../admin/auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin/auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from '../admin/auth/guards/admin-permissions.guard';
import { AdminRoles } from '../admin/auth/decorators/admin-roles.decorator';
import { AdminRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateNotificationDto, UpdateNotificationDto, BroadcastNotificationDto, ListNotificationsQueryDto } from './dto';

@ApiTags('Admin - Notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN)
export class NotificationsAdminController {
  constructor(private readonly notificationsService: NotificationsAdminService) {}

  // Individual Notifications CRUD
  @Get()
  @ApiOperation({ summary: 'List all notifications' })
  @ApiResponse({ status: 200, description: 'List of notifications retrieved successfully' })
  async findAll(
    @Query() query: ListNotificationsQueryDto
  ) {
    return this.notificationsService.findAllNotifications({
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
      userId: query.userId,
      type: query.type,
      isRead: query.isRead === 'true' ? true : query.isRead === 'false' ? false : undefined,
      search: query.search
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.createNotification(dto);
  }

  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send broadcast notification to all users' })
  @ApiResponse({ status: 200, description: 'Broadcast notification sent successfully' })
  async broadcast(
    @Body() dto: BroadcastNotificationDto,
    @CurrentUser('id') adminId: string
  ) {
    return this.notificationsService.broadcastNotification({ ...dto, createdBy: adminId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(@Param('id') id: string) {
    return this.notificationsService.findNotificationById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update notification' })
  @ApiResponse({ status: 200, description: 'Notification updated successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationDto
  ) {
    return this.notificationsService.updateNotification(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async delete(@Param('id') id: string) {
    return this.notificationsService.deleteNotification(id);
  }

  // Campaigns
  @Get('campaigns')
  @ApiOperation({ summary: 'List all notification campaigns' })
  async findAllCampaigns(@Query() query: { page?: number; limit?: number; status?: string }) {
    return this.notificationsService.findAllCampaigns(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get notification statistics' })
  async getStats() {
    return this.notificationsService.getStats();
  }

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send notification to specific users' })
  async sendNotification(@Body() data: {
    title: string;
    body: string;
    imageUrl?: string;
    userIds?: string[];
    targetAudience?: any;
  }) {
    return this.notificationsService.sendNotification(data);
  }

  @Post('send-bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send bulk notification' })
  async sendBulkNotification(
    @Body() data: { title: string; body: string; targetAudience: any },
    @CurrentUser('id') adminId: string
  ) {
    return this.notificationsService.sendBulkNotification({ ...data, createdBy: adminId });
  }

  // Templates
  @Get('templates')
  @ApiOperation({ summary: 'List all notification templates' })
  async getTemplates(@Query() query: { page?: number; limit?: number; isActive?: boolean }) {
    return this.notificationsService.findAllTemplates(query);
  }

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new notification template' })
  async createTemplate(@Body() data: { name: string; title: string; body: string; imageUrl?: string; action?: string; data?: any }) {
    return this.notificationsService.createTemplate(data);
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: 'Update notification template' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() data: Partial<{ name: string; title: string; body: string; imageUrl?: string; action?: string; isActive?: boolean }>
  ) {
    return this.notificationsService.updateTemplate(id, data);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete notification template' })
  async deleteTemplate(@Param('id') id: string) {
    return this.notificationsService.deleteTemplate(id);
  }
}
