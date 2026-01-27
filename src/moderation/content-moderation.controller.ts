import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ContentModerationService } from './content-moderation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Content Moderation')
@Controller('moderation')
@ApiBearerAuth()
export class ContentModerationController {
  constructor(private readonly contentModerationService: ContentModerationService) {}

  @Post('flag')
  @ApiOperation({ summary: 'Flag content (Story or Reel) for moderation review' })
  @ApiResponse({ status: 201, description: 'Content flagged successfully' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  @UseGuards(JwtAuthGuard)
  async flagContent(
    @Request() req: any,
    @Body() body: { contentType: 'STORY' | 'REEL'; contentId: string; reason: string },
  ) {
    return this.contentModerationService.flagContent(
      body.contentType,
      body.contentId,
      body.reason,
      req.user.id,
    );
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending content moderation queue (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of pending moderation entries' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getPendingModerations(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.contentModerationService.getPendingModerations(
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Review a content moderation entry (Admin only)' })
  @ApiResponse({ status: 200, description: 'Content moderation entry reviewed successfully' })
  @ApiResponse({ status: 404, description: 'Moderation entry not found' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async reviewContent(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { decision: 'APPROVED' | 'REJECTED' },
  ) {
    return this.contentModerationService.reviewContent(id, req.user.id, body.decision);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get content moderation history (Admin only)' })
  @ApiResponse({ status: 200, description: 'Moderation history' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getModerationHistory(
    @Query('contentType') contentType?: 'STORY' | 'REEL',
    @Query('contentId') contentId?: string,
  ) {
    return this.contentModerationService.getModerationHistory(contentType, contentId);
  }
}
