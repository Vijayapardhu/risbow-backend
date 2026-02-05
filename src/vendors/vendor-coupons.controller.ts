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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VendorCouponsService } from './vendor-coupons.service';
import {
  CreateVendorCouponDto,
  UpdateVendorCouponDto,
  VendorCouponQueryDto,
  CouponResponseDto,
  CouponUsageStatsDto,
} from './dto/vendor-coupon.dto';

@ApiTags('Vendor Coupons')
@ApiBearerAuth()
@Controller('vendors/coupons')
@UseGuards(JwtAuthGuard)
export class VendorCouponsController {
  constructor(private readonly vendorCouponsService: VendorCouponsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new coupon' })
  @ApiResponse({
    status: 201,
    description: 'Coupon created successfully',
    type: CouponResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 409, description: 'Coupon code already exists' })
  async create(@Request() req, @Body() dto: CreateVendorCouponDto) {
    return this.vendorCouponsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List vendor coupons with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Coupons retrieved successfully' })
  async findAll(@Request() req, @Query() query: VendorCouponQueryDto) {
    return this.vendorCouponsService.findAll(req.user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single coupon by ID' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @ApiResponse({
    status: 200,
    description: 'Coupon retrieved successfully',
    type: CouponResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiResponse({ status: 403, description: 'Coupon does not belong to vendor' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.vendorCouponsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a coupon' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @ApiResponse({
    status: 200,
    description: 'Coupon updated successfully',
    type: CouponResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiResponse({ status: 403, description: 'Coupon does not belong to vendor' })
  @ApiResponse({ status: 409, description: 'Coupon code already exists' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateVendorCouponDto,
  ) {
    return this.vendorCouponsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete or deactivate a coupon' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @ApiResponse({
    status: 200,
    description: 'Coupon deleted/deactivated successfully',
  })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiResponse({ status: 403, description: 'Coupon does not belong to vendor' })
  async delete(@Request() req, @Param('id') id: string) {
    return this.vendorCouponsService.delete(req.user.id, id);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get coupon usage statistics' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @ApiResponse({
    status: 200,
    description: 'Usage stats retrieved successfully',
    type: CouponUsageStatsDto,
  })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiResponse({ status: 403, description: 'Coupon does not belong to vendor' })
  async getUsageStats(@Request() req, @Param('id') id: string) {
    return this.vendorCouponsService.getUsageStats(req.user.id, id);
  }
}
