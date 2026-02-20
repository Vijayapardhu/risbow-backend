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
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { GiftsService } from './gifts.service';
import {
    CreateGiftDto,
    UpdateGiftDto,
    SelectGiftDto,
    GiftResponseDto,
    EligibleGiftsQueryDto,
} from './dto/gift.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminJwtAuthGuard } from '../admin/auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin/auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from '../admin/auth/guards/admin-permissions.guard';
import { AdminRoles } from '../admin/auth/decorators/admin-roles.decorator';
import { AdminRole } from '@prisma/client';

@ApiTags('Gifts')
@Controller()
export class GiftsController {
    constructor(private readonly giftsService: GiftsService) { }

    // ==================== PUBLIC ENDPOINTS ====================

    @Get('gifts/eligible')
    @ApiOperation({
        summary: 'Get eligible gifts for current cart',
        description: 'Returns gifts that are eligible based on cart categories and have stock available',
    })
    @ApiQuery({
        name: 'categories',
        required: false,
        description: 'Comma-separated category IDs from cart',
        example: 'cat_electronics,cat_mobiles',
    })
    @ApiResponse({
        status: 200,
        description: 'List of eligible gifts',
        type: [GiftResponseDto],
    })
    async getEligibleGifts(@Query('categories') categories?: string) {
        const categoryIds = categories ? categories.split(',').filter(Boolean) : [];
        return this.giftsService.getEligibleGifts(categoryIds);
    }

    // ==================== ADMIN ENDPOINTS ====================

    @Get('admin/gifts')
    @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
    @AdminRoles(AdminRole.OPERATIONS_ADMIN, AdminRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get all gift SKUs (Admin)',
        description: 'Returns all gift SKUs in the system',
    })
    @ApiResponse({
        status: 200,
        description: 'List of all gifts',
        type: [GiftResponseDto],
    })
    async getAllGifts() {
        return this.giftsService.getAllGifts();
    }

    @Get('admin/gifts/inventory')
    @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
    @AdminRoles(AdminRole.OPERATIONS_ADMIN, AdminRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get gift inventory report (Admin)',
        description: 'Returns inventory overview with stock levels and alerts',
    })
    @ApiResponse({
        status: 200,
        description: 'Inventory report',
        schema: {
            example: {
                totalGifts: 10,
                outOfStock: 2,
                lowStock: 3,
                gifts: [],
            },
        },
    })
    async getInventoryReport() {
        return this.giftsService.getInventoryReport();
    }

    @Get('admin/gifts/:id')
    @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
    @AdminRoles(AdminRole.OPERATIONS_ADMIN, AdminRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get gift by ID (Admin)',
        description: 'Returns a specific gift SKU',
    })
    @ApiResponse({
        status: 200,
        description: 'Gift details',
        type: GiftResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Gift not found' })
    async getGiftById(@Param('id') id: string) {
        return this.giftsService.getGiftById(id);
    }

    @Post('admin/gifts')
    @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
    @AdminRoles(AdminRole.OPERATIONS_ADMIN, AdminRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Create new gift SKU (Admin)',
        description: 'Creates a new gift SKU with stock and eligibility rules',
    })
    @ApiResponse({
        status: 201,
        description: 'Gift created successfully',
        type: GiftResponseDto,
    })
    async createGift(@Body() dto: CreateGiftDto) {
        return this.giftsService.createGift(dto);
    }

    @Patch('admin/gifts/:id')
    @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
    @AdminRoles(AdminRole.OPERATIONS_ADMIN, AdminRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Update gift SKU (Admin)',
        description: 'Updates an existing gift SKU',
    })
    @ApiResponse({
        status: 200,
        description: 'Gift updated successfully',
        type: GiftResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Gift not found' })
    async updateGift(@Param('id') id: string, @Body() dto: UpdateGiftDto) {
        return this.giftsService.updateGift(id, dto);
    }

    @Delete('admin/gifts/:id')
    @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
    @AdminRoles(AdminRole.OPERATIONS_ADMIN, AdminRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Delete gift SKU (Admin)',
        description: 'Deletes a gift SKU from the system',
    })
    @ApiResponse({ status: 204, description: 'Gift deleted successfully' })
    @ApiResponse({ status: 404, description: 'Gift not found' })
    async deleteGift(@Param('id') id: string) {
        await this.giftsService.deleteGift(id);
    }
}
