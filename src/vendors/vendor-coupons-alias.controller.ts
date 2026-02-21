import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VendorCouponsService } from './vendor-coupons.service';
import { VendorCouponsController } from './vendor-coupons.controller';

@ApiTags('Vendor Coupons (Alias)')
@ApiBearerAuth()
@Controller('vendor/coupons')
@UseGuards(JwtAuthGuard)
export class VendorCouponsAliasController {
  constructor(private readonly vendorCouponsService: VendorCouponsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new coupon' })
  async create(@Request() req: any, @Body() dto: any) {
    return this.vendorCouponsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List vendor coupons' })
  async findAll(@Request() req: any, @Query() query: any) {
    return this.vendorCouponsService.findAll(req.user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a coupon by ID' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.vendorCouponsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a coupon' })
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.vendorCouponsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a coupon' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.vendorCouponsService.delete(req.user.id, id);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Get coupon usage stats' })
  async getUsageStats(@Request() req: any, @Param('id') id: string) {
    return this.vendorCouponsService.getUsageStats(req.user.id, id);
  }
}
