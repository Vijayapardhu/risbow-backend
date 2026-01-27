import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClearanceService } from './clearance.service';
import { AddToClearanceDto } from './dto/add-to-clearance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { getVendorIdFromUserId } from './helpers/vendor-helper';

@ApiTags('Clearance')
@Controller('clearance')
@ApiBearerAuth()
export class ClearanceController {
  constructor(
    private readonly clearanceService: ClearanceService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add a product to clearance sale (Vendor only)' })
  @ApiResponse({ status: 201, description: 'Product added to clearance successfully' })
  @ApiResponse({ status: 400, description: 'Product already in clearance or validation failed' })
  @Roles(UserRole.VENDOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addToClearance(
    @Request() req: any,
    @Body() dto: AddToClearanceDto,
  ) {
    const vendorId = await getVendorIdFromUserId(this.prisma, req.user.id);
    return this.clearanceService.addToClearance(
      vendorId,
      dto.productId,
      dto.clearancePrice,
      dto.originalPrice,
      new Date(dto.expiryDate),
      dto.quantity,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get active clearance products (optionally filtered by vendor)' })
  @ApiResponse({ status: 200, description: 'List of active clearance products' })
  async getClearanceProducts(
    @Query('vendorId') vendorId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.clearanceService.getClearanceProducts(
      vendorId,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get all clearance products for a specific vendor' })
  @ApiResponse({ status: 200, description: 'List of vendor clearance products' })
  async getVendorClearance(@Param('vendorId') vendorId: string) {
    return this.clearanceService.getVendorClearance(vendorId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a product from clearance sale (Vendor only, own products only)' })
  @ApiResponse({ status: 200, description: 'Product removed from clearance successfully' })
  @ApiResponse({ status: 404, description: 'Clearance product not found' })
  @Roles(UserRole.VENDOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async removeFromClearance(@Param('id') id: string, @Request() req: any) {
    const vendorId = await getVendorIdFromUserId(this.prisma, req.user.id);
    return this.clearanceService.removeFromClearance(id, vendorId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get auto-clearance analytics for vendor' })
  @ApiResponse({ status: 200, description: 'Auto-clearance analytics' })
  @Roles(UserRole.VENDOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAnalytics(@Request() req: any) {
    const vendorId = await getVendorIdFromUserId(this.prisma, req.user.id);
    return this.clearanceService.getAutoClearanceAnalytics(vendorId);
  }

  @Get('products-near-expiry')
  @ApiOperation({ summary: 'Get products near expiry that will be auto-added to clearance' })
  @ApiResponse({ status: 200, description: 'List of products near expiry' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to look ahead (default: vendor threshold)' })
  @Roles(UserRole.VENDOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getProductsNearExpiry(@Request() req: any, @Query('days') days?: string) {
    const vendorId = await getVendorIdFromUserId(this.prisma, req.user.id);
    return this.clearanceService.getProductsNearExpiry(
      vendorId,
      days ? parseInt(days) : undefined,
    );
  }
}
