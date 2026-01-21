import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { RegisterVendorDto } from './dto/vendor.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
    constructor(private readonly vendorsService: VendorsService) { }

    @Post('register')
    async register(@Body() dto: RegisterVendorDto) {
        return this.vendorsService.register(dto);
    }

    @Post('banner')
    @UseGuards(JwtAuthGuard)
    async purchaseBanner(@Body('image') image: string, @Request() req) {
        return this.vendorsService.purchaseBannerSlot(req.user.id, image);
    }

    @Get()
    async findAll() {
        return this.vendorsService.findAll();
    }

    @Get('stats')
    @UseGuards(JwtAuthGuard)
    async getVendorStats(@Request() req) {
        return this.vendorsService.getVendorStats(req.user.id);
    }
}
