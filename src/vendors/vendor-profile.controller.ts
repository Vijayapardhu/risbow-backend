import {
    Controller,
    Get,
    Patch,
    Body,
    Param,
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
import { VendorProfileService } from './vendor-profile.service';
import {
    UpdateVendorProfileDto,
    UpdateVendorLogoDto,
    UpdateVendorBannerDto,
    UpdateVendorHoursDto,
    UpdateVendorPickupDto,
    UpdateVendorStatusDto,
    VendorProfileResponseDto,
    PublicVendorProfileResponseDto,
} from './dto/vendor-profile.dto';

@ApiTags('Vendor Profile')
@Controller('vendors/profile')
export class VendorProfileController {
    constructor(private readonly vendorProfileService: VendorProfileService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get complete store profile' })
    @ApiResponse({ status: 200, description: 'Store profile retrieved', type: VendorProfileResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    async getProfile(@Request() req) {
        return this.vendorProfileService.getProfile(req.user.id);
    }

    @Patch()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update store profile (storeName, email, address, location)' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    async updateProfile(@Request() req, @Body() dto: UpdateVendorProfileDto) {
        return this.vendorProfileService.updateProfile(req.user.id, dto);
    }

    @Patch('logo')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update store logo URL' })
    @ApiResponse({ status: 200, description: 'Logo updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    async updateLogo(@Request() req, @Body() dto: UpdateVendorLogoDto) {
        return this.vendorProfileService.updateLogo(req.user.id, dto);
    }

    @Patch('banner')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update store banner URL' })
    @ApiResponse({ status: 200, description: 'Banner updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    async updateBanner(@Request() req, @Body() dto: UpdateVendorBannerDto) {
        return this.vendorProfileService.updateBanner(req.user.id, dto);
    }

    @Patch('hours')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update store timings (weekly hours JSON)' })
    @ApiResponse({ status: 200, description: 'Store hours updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    async updateHours(@Request() req, @Body() dto: UpdateVendorHoursDto) {
        return this.vendorProfileService.updateHours(req.user.id, dto);
    }

    @Patch('pickup')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update pickup settings' })
    @ApiResponse({ status: 200, description: 'Pickup settings updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    async updatePickup(@Request() req, @Body() dto: UpdateVendorPickupDto) {
        return this.vendorProfileService.updatePickup(req.user.id, dto);
    }

    @Patch('status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update store status (OPEN/CLOSED/TEMPORARILY_CLOSED)' })
    @ApiResponse({ status: 200, description: 'Store status updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    async updateStatus(@Request() req, @Body() dto: UpdateVendorStatusDto) {
        return this.vendorProfileService.updateStatus(req.user.id, dto);
    }

    @Get('public/:vendorId')
    @ApiOperation({ summary: 'Get public vendor profile (no authentication required)' })
    @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
    @ApiResponse({ status: 200, description: 'Public profile retrieved', type: PublicVendorProfileResponseDto })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    async getPublicProfile(@Param('vendorId') vendorId: string) {
        return this.vendorProfileService.getPublicProfile(vendorId);
    }
}
