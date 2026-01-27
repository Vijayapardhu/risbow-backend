import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { StoriesService } from './stories.service';
import { CreateStoryDto, StoryMediaType } from './dto/create-story.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Stories')
@Controller('stories')
@ApiBearerAuth()
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new story (Vendor only, max 5 active stories)' })
  @ApiResponse({ status: 201, description: 'Story created successfully' })
  @ApiResponse({ status: 400, description: 'Rate limit exceeded or validation failed' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image or video file (max 50MB)',
        },
        mediaType: {
          type: 'string',
          enum: ['IMAGE', 'VIDEO'],
          description: 'Type of media',
        },
      },
    },
  })
  @Roles(UserRole.VENDOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('file'))
  async createStory(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateStoryDto,
  ) {
    if (!file) {
      throw new Error('File is required');
    }
    return this.storiesService.createStory(req.user.id, file, dto.mediaType);
  }

  @Get()
  @ApiOperation({ summary: 'Get active stories (optionally filtered by vendor)' })
  @ApiResponse({ status: 200, description: 'List of active stories' })
  async getActiveStories(@Query('vendorId') vendorId?: string) {
    return this.storiesService.getActiveStories(vendorId);
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get active stories for a specific vendor' })
  @ApiResponse({ status: 200, description: 'List of vendor stories' })
  async getVendorStories(@Param('vendorId') vendorId: string) {
    return this.storiesService.getVendorStories(vendorId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a story (Vendor only, own stories only)' })
  @ApiResponse({ status: 200, description: 'Story deleted successfully' })
  @ApiResponse({ status: 404, description: 'Story not found' })
  @Roles(UserRole.VENDOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async deleteStory(@Param('id') id: string, @Request() req: any) {
    return this.storiesService.deleteStory(id, req.user.id);
  }
}
