import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ReelsService } from './reels.service';
import { CreateReelDto } from './dto/create-reel.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@ApiTags('Reels')
@Controller('reels')
@ApiBearerAuth()
export class ReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new reel (Vendor or Creator, max 10 per day)' })
  @ApiResponse({ status: 201, description: 'Reel created successfully' })
  @ApiResponse({ status: 400, description: 'Rate limit exceeded or validation failed' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Video file (max 100MB)',
        },
        vendorId: {
          type: 'string',
          description: 'Vendor ID (if uploading as vendor)',
        },
        creatorId: {
          type: 'string',
          description: 'Creator ID (if uploading as creator)',
        },
        productId: {
          type: 'string',
          description: 'Optional: Product ID to link to reel',
        },
        description: {
          type: 'string',
          description: 'Optional: Reel description',
        },
      },
    },
  })
  @Roles(UserRole.VENDOR, UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('file'))
  async createReel(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateReelDto,
  ) {
    if (!file) {
      throw new Error('File is required');
    }
    return this.reelsService.createReel(
      req.user.id,
      file,
      dto.vendorId,
      dto.creatorId,
      dto.productId,
      dto.description,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get reels (optionally filtered by vendor, creator, or product)' })
  @ApiResponse({ status: 200, description: 'List of reels' })
  @UseGuards(OptionalJwtAuthGuard)
  async getReels(
    @Query('vendorId') vendorId?: string,
    @Query('creatorId') creatorId?: string,
    @Query('productId') productId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reelsService.getReels(
      vendorId,
      creatorId,
      productId,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Like or unlike a reel (ledger-based, requires view first)' })
  @ApiResponse({ status: 200, description: 'Reel liked/unliked successfully' })
  @UseGuards(JwtAuthGuard)
  async likeReel(@Param('id') id: string, @Request() req: any) {
    return this.reelsService.likeReel(id, req.user.id);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Record a reel view (ledger-based, 1 per user per 24h)' })
  @ApiResponse({ status: 200, description: 'View recorded successfully' })
  @UseGuards(OptionalJwtAuthGuard)
  async viewReel(@Param('id') id: string, @Request() req: any) {
    return this.reelsService.viewReel(id, req.user?.id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get reel statistics (views, likes from ledger)' })
  @ApiResponse({ status: 200, description: 'Reel statistics' })
  async getReelStats(@Param('id') id: string) {
    return this.reelsService.getReelStats(id);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get all reels for a specific product' })
  @ApiResponse({ status: 200, description: 'List of product reels' })
  async getProductReels(@Param('productId') productId: string) {
    return this.reelsService.getProductReels(productId);
  }

  @Get('creator/:creatorId')
  @ApiOperation({ summary: 'Get all reels for a specific creator' })
  @ApiResponse({ status: 200, description: 'List of creator reels' })
  async getCreatorReels(@Param('creatorId') creatorId: string) {
    return this.reelsService.getCreatorReels(creatorId);
  }
}
