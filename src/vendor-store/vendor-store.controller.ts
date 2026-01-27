import { Controller, Get, Put, Body, UseGuards, Req, Param, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { VendorStoreService } from './vendor-store.service';
import { UploadService } from '../upload/upload.service';
import { UpdateStoreProfileDto, UpdateStoreTimingsDto, UpdatePickupSettingsDto, CreatePickupPointDto, UpdatePickupPointDto, CreateVendorServiceAreaDto, UpdateVendorServiceAreaDto, CreateVendorDeliveryWindowDto, UpdateVendorDeliveryWindowDto } from './dto/store-settings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Vendor Store')
@Controller('vendor-store')
export class VendorStoreController {
    constructor(
        private readonly storeService: VendorStoreService,
        private readonly uploadService: UploadService
    ) { }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get my store profile' })
    async getProfile(@Req() req) {
        return this.storeService.getProfile(req.user.id);
    }

    @Put('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update store profile (name, logo, banner)' })
    async updateProfile(@Req() req, @Body() dto: UpdateStoreProfileDto) {
        return this.storeService.updateProfile(req.user.id, dto);
    }

    @Put('timings')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update store opening hours' })
    async updateTimings(@Req() req, @Body() dto: UpdateStoreTimingsDto) {
        return this.storeService.updateTimings(req.user.id, dto);
    }

    @Put('pickup-settings')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Configure in-store pickup settings' })
    async updatePickupSettings(@Req() req, @Body() dto: UpdatePickupSettingsDto) {
        return this.storeService.updatePickupSettings(req.user.id, dto);
    }

    @Get('pickup-points')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List my pickup points' })
    async listPickupPoints(@Req() req) {
        return this.storeService.listPickupPoints(req.user.id);
    }

    @Post('pickup-points')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a pickup point' })
    async createPickupPoint(@Req() req, @Body() dto: CreatePickupPointDto) {
        return this.storeService.createPickupPoint(req.user.id, dto);
    }

    @Put('pickup-points/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a pickup point' })
    async updatePickupPoint(@Req() req, @Param('id') id: string, @Body() dto: UpdatePickupPointDto) {
        return this.storeService.updatePickupPoint(req.user.id, id, dto);
    }

    @Get('service-areas')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List my service areas' })
    async listServiceAreas(@Req() req) {
        return this.storeService.listServiceAreas(req.user.id);
    }

    @Post('service-areas')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a service area (delivery coverage)' })
    async createServiceArea(@Req() req, @Body() dto: CreateVendorServiceAreaDto) {
        return this.storeService.createServiceArea(req.user.id, dto);
    }

    @Put('service-areas/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a service area' })
    async updateServiceArea(@Req() req, @Param('id') id: string, @Body() dto: UpdateVendorServiceAreaDto) {
        return this.storeService.updateServiceArea(req.user.id, id, dto);
    }

    @Get('delivery-windows')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List my delivery windows (weekly time slots)' })
    async listDeliveryWindows(@Req() req) {
        return this.storeService.listDeliveryWindows(req.user.id);
    }

    @Post('delivery-windows')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a delivery window (weekly schedule)' })
    async createDeliveryWindow(@Req() req, @Body() dto: CreateVendorDeliveryWindowDto) {
        return this.storeService.createDeliveryWindow(req.user.id, dto);
    }

    @Put('delivery-windows/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a delivery window (weekly schedule)' })
    async updateDeliveryWindow(@Req() req, @Param('id') id: string, @Body() dto: UpdateVendorDeliveryWindowDto) {
        return this.storeService.updateDeliveryWindow(req.user.id, id, dto);
    }

    @Get('public/:vendorCode')
    @ApiOperation({ summary: 'Get public store profile by vendor code' })
    async getPublicProfile(@Param('vendorCode') vendorCode: string) {
        return this.storeService.getPublicProfile(vendorCode);
    }

    @Post('logo')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Upload store logo' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async uploadLogo(@Req() req, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No file uploaded');
        const { url } = await this.uploadService.uploadImage(file, 'vendors' as any, req.user.id);
        return this.storeService.updateProfile(req.user.id, { storeLogo: url });
    }

    @Post('banner')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Upload store banner' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async uploadBanner(@Req() req, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No file uploaded');
        const { url } = await this.uploadService.uploadImage(file, 'vendors' as any, req.user.id);
        return this.storeService.updateProfile(req.user.id, { storeBanner: url });
    }
}
