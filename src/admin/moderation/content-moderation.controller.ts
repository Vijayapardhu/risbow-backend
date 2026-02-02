import {
  Controller,
  Get,
  Post,
  Put,
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
import { ContentModerationService } from './content-moderation.service';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { AdminPermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { RequirePermissions } from '../auth/decorators/admin-permissions.decorator';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { Permission } from '../rbac/admin-permissions.service';
import {
  ContentFlagType,
  FlagReason,
  FlagPriority,
  FlagStatus,
  ModerationAction,
  StrikeType,
} from '@prisma/client';
import { IsString, IsEnum, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// DTOs
class CreateFlagDto {
  @ApiProperty({ enum: ContentFlagType })
  @IsEnum(ContentFlagType)
  contentType: ContentFlagType;

  @ApiProperty()
  @IsString()
  contentId: string;

  @ApiProperty({ enum: FlagReason })
  @IsEnum(FlagReason)
  reason: FlagReason;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

class ModerateFlagDto {
  @ApiProperty({ enum: ModerationAction })
  @IsEnum(ModerationAction)
  action: ModerationAction;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  issueStrike?: boolean;

  @ApiProperty({ enum: StrikeType, required: false })
  @IsEnum(StrikeType)
  @IsOptional()
  strikeType?: StrikeType;
}

class BulkModerateDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  flagIds: string[];

  @ApiProperty({ enum: ModerationAction })
  @IsEnum(ModerationAction)
  action: ModerationAction;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

@ApiTags('Content Moderation')
@Controller('admin/moderation')
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@ApiBearerAuth()
export class ContentModerationController {
  constructor(private moderationService: ContentModerationService) {}

  @Get('queue')
  @RequirePermissions(Permission.CONTENT_READ)
  @ApiOperation({
    summary: 'Get moderation queue',
    description: 'Get flagged content queue with filters',
  })
  @ApiQuery({ name: 'contentType', required: false, enum: ContentFlagType })
  @ApiQuery({ name: 'reason', required: false, enum: FlagReason })
  @ApiQuery({ name: 'priority', required: false, enum: FlagPriority })
  @ApiQuery({ name: 'status', required: false, enum: FlagStatus })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Queue retrieved' })
  async getQueue(
    @Query('contentType') contentType?: ContentFlagType,
    @Query('reason') reason?: FlagReason,
    @Query('priority') priority?: FlagPriority,
    @Query('status') status?: FlagStatus,
    @Query('vendorId') vendorId?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.moderationService.getFlagQueue({
      contentType,
      reason,
      priority,
      status,
      vendorId,
      assignedTo,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('stats')
  @RequirePermissions(Permission.CONTENT_READ)
  @ApiOperation({
    summary: 'Get queue statistics',
    description: 'Get moderation queue statistics',
  })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getQueueStats() {
    return this.moderationService.getQueueStats();
  }

  @Get('my-queue')
  @RequirePermissions(Permission.CONTENT_MODERATE)
  @ApiOperation({
    summary: 'Get my assigned flags',
    description: 'Get flags assigned to current moderator',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Assigned flags retrieved' })
  async getMyQueue(
    @CurrentAdmin('id') adminId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.moderationService.getFlagQueue({
      assignedTo: adminId,
      status: FlagStatus.UNDER_REVIEW,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('performance/:adminId')
  @RequirePermissions(Permission.CONTENT_READ)
  @ApiOperation({
    summary: 'Get moderator performance',
    description: 'Get moderation performance statistics for an admin',
  })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiResponse({ status: 200, description: 'Performance stats retrieved' })
  async getModeratorPerformance(
    @Param('adminId') adminId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.moderationService.getModeratorPerformance(
      adminId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Post('flag')
  @RequirePermissions(Permission.CONTENT_MODERATE)
  @ApiOperation({
    summary: 'Create content flag',
    description: 'Manually flag content for moderation',
  })
  @ApiResponse({ status: 201, description: 'Flag created' })
  async createFlag(@Body() dto: CreateFlagDto) {
    return this.moderationService.createFlag(dto);
  }

  @Get('flag/:flagId/content')
  @RequirePermissions(Permission.CONTENT_READ)
  @ApiOperation({
    summary: 'Get content for review',
    description: 'Get the actual content being flagged for review',
  })
  @ApiResponse({ status: 200, description: 'Content retrieved' })
  async getContentForReview(
    @Query('contentType') contentType: ContentFlagType,
    @Query('contentId') contentId: string,
  ) {
    return this.moderationService.getContentForReview(contentType, contentId);
  }

  @Post('flag/:flagId/assign')
  @RequirePermissions(Permission.CONTENT_MODERATE)
  @ApiOperation({
    summary: 'Assign flag to self',
    description: 'Take ownership of a flag for review',
  })
  @ApiResponse({ status: 200, description: 'Flag assigned' })
  async assignFlag(
    @Param('flagId') flagId: string,
    @CurrentAdmin('id') adminId: string,
  ) {
    return this.moderationService.assignFlag(flagId, adminId);
  }

  @Post('flag/:flagId/moderate')
  @RequirePermissions(Permission.CONTENT_MODERATE)
  @ApiOperation({
    summary: 'Moderate flag',
    description: 'Take moderation action on a flagged item',
  })
  @ApiResponse({ status: 200, description: 'Flag moderated' })
  async moderateFlag(
    @Param('flagId') flagId: string,
    @Body() dto: ModerateFlagDto,
    @CurrentAdmin() admin: any,
  ) {
    return this.moderationService.moderateFlag(flagId, {
      ...dto,
      moderatedBy: admin.id,
      moderatedByEmail: admin.email,
    });
  }

  @Post('bulk-moderate')
  @RequirePermissions(Permission.CONTENT_MODERATE)
  @ApiOperation({
    summary: 'Bulk moderate flags',
    description: 'Take the same action on multiple flags',
  })
  @ApiResponse({ status: 200, description: 'Bulk moderation completed' })
  async bulkModerate(
    @Body() dto: BulkModerateDto,
    @CurrentAdmin() admin: any,
  ) {
    return this.moderationService.bulkModerate(
      dto.flagIds,
      dto.action,
      dto.notes || '',
      admin.id,
      admin.email,
    );
  }
}
