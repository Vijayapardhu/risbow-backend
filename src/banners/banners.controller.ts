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
    HttpCode,
    HttpStatus,
    Request,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { BannersService } from './banners.service';
import {
    CreateBannerDto,
    UpdateBannerDto,
    PurchaseBannerDto,
    UploadBannerCreativeDto,
    TrackBannerDto,
    BannerResponseDto,
    GetActiveBannersQueryDto,
} from './dto/banner.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { Idempotent } from '../idempotency/idempotency.decorator';

@ApiTags('Banners')
@Controller()
export class BannersController {
    /*
        @Post('admin/banners/resolve-conflicts')
        @UseGuards(JwtAuthGuard, RolesGuard)
        @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
        @ApiOperation({ summary: 'Resolve banner slot conflicts (auto-rotation)' })
        @ApiResponse({ status: 200, description: 'Conflicts resolved and banners rotated' })
        async resolveBannerConflicts() {
            return this.bannersService.resolveBannerConflicts();
        }
    */
    constructor(private readonly bannersService: BannersService) { }

    // ==================== PUBLIC ENDPOINTS ====================

    @Get('banners/active')
    @ApiOperation({
        summary: 'Get active banners by slot',
        description: 'Returns active banners for a given placement, sorted by priority and slotIndex',
    })
    @ApiQuery({ name: 'slotType', required: true, example: 'HOME' })
    @ApiQuery({ name: 'slotKey', required: false, example: 'CAROUSEL' })
    @ApiResponse({
        status: 200,
        description: 'List of active banners',
        type: [BannerResponseDto],
    })
    async getActiveBanners(
        @Query('slotType') slotType: string,
        @Query('slotKey') slotKey?: string,
    ) {
        return this.bannersService.getActiveBanners(slotType, slotKey);
    }

    @Post('banners/:id/track')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Track banner event',
        description: 'Track impression or click event for analytics',
    })
    @ApiResponse({ status: 200, description: 'Event tracked successfully' })
    async trackBannerEvent(@Param('id') id: string, @Body() dto: TrackBannerDto) {
        await this.bannersService.trackBannerEvent(id, dto.event);
        return { message: 'Event tracked successfully' };
    }

    // ==================== ADMIN ENDPOINTS ====================

    @Get('admin/banners')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get all banners (Admin)',
        description: 'Returns all banners in the system',
    })
    @ApiResponse({
        status: 200,
        description: 'List of all banners',
        type: [BannerResponseDto],
    })
    async getAllBanners() {
        return this.bannersService.getAllBanners();
    }

    @Get('admin/banners/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get banner by ID (Admin)',
        description: 'Returns a specific banner',
    })
    @ApiResponse({
        status: 200,
        description: 'Banner details',
        type: BannerResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Banner not found' })
    async getBannerById(@Param('id') id: string) {
        return this.bannersService.getBannerById(id);
    }

    @Post('admin/banners')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Create system banner (Admin)',
        description: 'Creates a new system banner with image upload',
    })
    @ApiResponse({
        status: 201,
        description: 'Banner created successfully',
        type: BannerResponseDto,
    })
    async createBanner(@Body() dto: CreateBannerDto) {
        return this.bannersService.createBanner(dto);
    }

    @Patch('admin/banners/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Update banner (Admin)',
        description: 'Updates an existing banner',
    })
    @ApiResponse({
        status: 200,
        description: 'Banner updated successfully',
        type: BannerResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Banner not found' })
    async updateBanner(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
        return this.bannersService.updateBanner(id, dto);
    }

    @Delete('admin/banners/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Delete banner (Admin)',
        description: 'Deletes a banner from the system',
    })
    @ApiResponse({ status: 204, description: 'Banner deleted successfully' })
    @ApiResponse({ status: 404, description: 'Banner not found' })
    async deleteBanner(@Param('id') id: string) {
        await this.bannersService.deleteBanner(id);
    }

    @Post('admin/banners/:id/approve')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Approve vendor banner (Admin)',
        description: 'Approves a vendor banner and makes it active',
    })
    @ApiResponse({
        status: 200,
        description: 'Banner approved successfully',
        type: BannerResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Banner not found' })
    async approveBanner(@Param('id') id: string) {
        return this.bannersService.approveBanner(id);
    }

    @Get('admin/banners/:id/analytics')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get banner analytics (Admin)',
        description: 'Returns analytics data for a specific banner',
    })
    @ApiResponse({
        status: 200,
        description: 'Banner analytics',
        schema: {
            example: {
                bannerId: 'banner_123',
                slotType: 'HOME',
                slotKey: 'CAROUSEL',
                impressions: 1000,
                clicks: 50,
                ctr: 5.0,
            },
        },
    })
    async getBannerAnalytics(@Param('id') id: string) {
        return this.bannersService.getBannerAnalytics(id);
    }

    // ==================== VENDOR ENDPOINTS ====================

    @Post('vendor/banners/purchase')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Purchase banner slot (Vendor)',
        description: 'Vendor purchases a banner slot for specified duration',
    })
    @ApiResponse({
        status: 201,
        description: 'Banner slot purchased successfully',
        type: BannerResponseDto,
    })
    @Idempotent({ required: true, ttlSeconds: 600 })
    async purchaseBannerSlot(@Request() req, @Body() dto: PurchaseBannerDto) {
        const vendorId = req.user.id; // Assuming vendor user ID
        return this.bannersService.purchaseBannerSlot(vendorId, dto);
    }

    @Post('vendor/banners/upload')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Upload banner creative (Vendor)',
        description: 'Vendor uploads banner creative after purchasing slot',
    })
    @ApiResponse({
        status: 200,
        description: 'Banner creative uploaded successfully',
        type: BannerResponseDto,
    })
    async uploadBannerCreative(@Request() req, @Body() dto: UploadBannerCreativeDto) {
        const vendorId = req.user.id;
        return this.bannersService.uploadBannerCreative(vendorId, dto);
    }

    @Get('vendor/banners')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get vendor banners (Vendor)',
        description: 'Returns all banners owned by the vendor',
    })
    @ApiResponse({
        status: 200,
        description: 'List of vendor banners',
        type: [BannerResponseDto],
    })
    async getVendorBanners(@Request() req) {
        const vendorId = req.user.id;
        return this.bannersService.getVendorBanners(vendorId);
    }
}
