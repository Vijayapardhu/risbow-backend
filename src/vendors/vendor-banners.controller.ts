import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BannersService } from '../banners/banners.service';

@ApiTags('Vendor Banners')
@Controller('vendor/banners')
@UseGuards(JwtAuthGuard)
export class VendorBannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  @ApiOperation({ summary: 'List vendor banners' })
  async findAll(@Request() req: any) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.bannersService.getVendorBanners(vendorId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a banner' })
  async create(@Request() req: any, @Body() dto: any) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.bannersService.createBanner({ ...dto, vendorId });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a banner' })
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.bannersService.updateBanner(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a banner' })
  async delete(@Param('id') id: string) {
    return this.bannersService.deleteBanner(id);
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Purchase a banner slot' })
  async purchase(@Request() req: any, @Body() dto: any) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.bannersService.purchaseBannerSlot(vendorId, dto);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload banner image' })
  async upload(@Request() req: any, @Body() dto: any) {
    const vendorId = req.user.vendorId || req.user.id;
    return this.bannersService.uploadBannerCreative(vendorId, dto);
  }
}
