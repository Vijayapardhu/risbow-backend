import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationsAdminService } from './notifications-admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class NotificationsAdminController {
  constructor(private readonly notificationsService: NotificationsAdminService) {}

  @Get()
  findAllCampaigns(@Query() query: { page?: number; limit?: number; status?: string }) {
    return this.notificationsService.findAllCampaigns(query);
  }

  @Get('stats')
  getStats() {
    return this.notificationsService.getStats();
  }

  @Post('send')
  @HttpCode(HttpStatus.OK)
  sendNotification(@Body() data: {
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
  sendBulkNotification(
    @Body() data: { title: string; body: string; targetAudience: any },
    @CurrentUser('id') adminId: string
  ) {
    return this.notificationsService.sendBulkNotification({ ...data, createdBy: adminId });
  }

  // Templates
  @Get('templates')
  getTemplates(@Query() query: { page?: number; limit?: number; isActive?: boolean }) {
    return this.notificationsService.findAllTemplates(query);
  }

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  createTemplate(@Body() data: { name: string; title: string; body: string; imageUrl?: string; action?: string; data?: any }) {
    return this.notificationsService.createTemplate(data);
  }

  @Patch('templates/:id')
  updateTemplate(
    @Param('id') id: string,
    @Body() data: Partial<{ name: string; title: string; body: string; imageUrl?: string; action?: string; isActive?: boolean }>
  ) {
    return this.notificationsService.updateTemplate(id, data);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.notificationsService.deleteTemplate(id);
  }
}
