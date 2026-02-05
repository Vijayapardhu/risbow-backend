import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VendorNotificationsService } from './vendor-notifications.service';
import {
  VendorNotificationQueryDto,
  VendorNotificationResponseDto,
  UnreadCountResponseDto,
  MarkReadResponseDto,
  VendorNotificationType,
} from './dto/vendor-notification.dto';

@ApiTags('Vendor Notifications')
@ApiBearerAuth()
@Controller('vendors/notifications')
@UseGuards(JwtAuthGuard)
export class VendorNotificationsController {
  constructor(
    private readonly vendorNotificationsService: VendorNotificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for vendor' })
  @ApiResponse({
    status: 200,
    description: 'List of notifications with pagination',
    type: [VendorNotificationResponseDto],
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: VendorNotificationType,
    description: 'Filter by notification type',
  })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean, description: 'Filter by read status' })
  async findAll(@Request() req, @Query() query: VendorNotificationQueryDto) {
    return this.vendorNotificationsService.findAll(req.user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'Unread notification count',
    type: UnreadCountResponseDto,
  })
  async getUnreadCount(@Request() req) {
    return this.vendorNotificationsService.getUnreadCount(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: MarkReadResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Notification does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Request() req, @Param('id') id: string) {
    return this.vendorNotificationsService.markAsRead(req.user.id, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    type: MarkReadResponseDto,
  })
  async markAllAsRead(@Request() req) {
    return this.vendorNotificationsService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 403, description: 'Notification does not belong to vendor' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async delete(@Request() req, @Param('id') id: string) {
    return this.vendorNotificationsService.delete(req.user.id, id);
  }
}
