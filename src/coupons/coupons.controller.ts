import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
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
} from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import {
    CreateCouponDto,
    UpdateCouponDto,
    ValidateCouponDto,
    ApplyCouponDto,
    CouponResponseDto,
    CouponValidationResponseDto,
} from './dto/coupon.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminJwtAuthGuard } from '../admin/auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin/auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from '../admin/auth/guards/admin-permissions.guard';
import { AdminRoles } from '../admin/auth/decorators/admin-roles.decorator';
import { AdminRole } from '@prisma/client';

@ApiTags('Coupons')
@Controller()
export class CouponsController {
    constructor(private readonly couponsService: CouponsService) { }

    // ==================== PUBLIC ENDPOINTS ====================

    @Post('coupons/validate')
    @ApiOperation({
        summary: 'Validate coupon without applying',
        description: 'Validates a coupon code and returns discount details without applying it',
    })
    @ApiResponse({
        status: 200,
        description: 'Validation result',
        type: CouponValidationResponseDto,
    })
    async validateCoupon(@Body() dto: ValidateCouponDto) {
        return this.couponsService.validateCoupon(dto);
    }

    // ==================== USER ENDPOINTS ====================

    @Get('users/me/coupons')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get available coupons for user',
        description: 'Returns active coupons that are currently valid and available',
    })
    @ApiResponse({
        status: 200,
        description: 'List of available coupons',
        type: [CouponResponseDto],
    })
    async getActiveCoupons() {
        return this.couponsService.getActiveCoupons();
    }

    // ==================== VENDOR ENDPOINTS ====================

    @Post('vendor/coupons')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create new coupon (Vendor)' })
    @ApiResponse({ status: 201, type: CouponResponseDto })
    async createVendorCoupon(@Request() req: any, @Body() dto: CreateCouponDto) {
        dto.vendorId = req.user.id; // Force vendor ownership
        return this.couponsService.createCoupon(dto);
    }

    @Get('vendor/coupons')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get my coupons (Vendor)' })
    @ApiResponse({ status: 200, type: [CouponResponseDto] })
    async getVendorCoupons(@Request() req: any) {
        return this.couponsService.getCouponsByVendor(req.user.id);
    }

    @Patch('vendor/coupons/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update my coupon (Vendor)' })
    @ApiResponse({ status: 200, type: CouponResponseDto })
    async updateVendorCoupon(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateCouponDto) {
        return this.couponsService.updateCoupon(id, dto, req.user.id);
    }

    @Delete('vendor/coupons/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete my coupon (Vendor)' })
    @ApiResponse({ status: 204 })
    async deleteVendorCoupon(@Request() req: any, @Param('id') id: string) {
        await this.couponsService.deleteCoupon(id, req.user.id);
    }

    // ==================== ADMIN ENDPOINTS ====================

    @Get('admin/coupons')
    @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
    @AdminRoles(AdminRole.OPERATIONS_ADMIN, AdminRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get all coupons (Admin)',
        description: 'Returns all coupons in the system',
    })
    @ApiResponse({
        status: 200,
        description: 'List of all coupons',
        type: [CouponResponseDto],
    })
    async getAllCoupons() {
        return this.couponsService.getAllCoupons();
    }

    @Get('admin/coupons/:id')
    @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
    @AdminRoles(AdminRole.OPERATIONS_ADMIN, AdminRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get coupon by ID (Admin)',
        description: 'Returns a specific coupon',
    })
    @ApiResponse({
        status: 200,
        description: 'Coupon details',
        type: CouponResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Coupon not found' })
    async getCouponById(@Param('id') id: string) {
        return this.couponsService['prisma'].coupon.findUnique({
            where: { id }
        }).then(coupon => {
            if (!coupon) throw new Error('Coupon not found');
            return this.couponsService['mapToResponseDto'](coupon);
        });
    }

    @Post('admin/coupons')
    @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
    @AdminRoles(AdminRole.OPERATIONS_ADMIN, AdminRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Create new coupon (Admin)',
        description: 'Creates a new coupon with specified rules and limits',
    })
    @ApiResponse({
        status: 201,
        description: 'Coupon created successfully',
        type: CouponResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Coupon code already exists' })
    async createCoupon(@Body() dto: CreateCouponDto) {
        return this.couponsService.createCoupon(dto);
    }

    @Patch('admin/coupons/:id')
    @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
    @AdminRoles(AdminRole.OPERATIONS_ADMIN, AdminRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Update coupon (Admin)',
        description: 'Updates an existing coupon',
    })
    @ApiResponse({
        status: 200,
        description: 'Coupon updated successfully',
        type: CouponResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Coupon not found' })
    async updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
        return this.couponsService.updateCoupon(id, dto);
    }

    @Delete('admin/coupons/:id')
    @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
    @AdminRoles(AdminRole.OPERATIONS_ADMIN, AdminRole.SUPER_ADMIN)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Delete coupon (Admin)',
        description: 'Deletes a coupon from the system',
    })
    @ApiResponse({ status: 204, description: 'Coupon deleted successfully' })
    @ApiResponse({ status: 404, description: 'Coupon not found' })
    async deleteCoupon(@Param('id') id: string) {
        await this.couponsService.deleteCoupon(id);
    }
}
