import { Controller, Post, Delete, Get, Param, UseGuards, Request } from '@nestjs/common';
import { VendorFollowersService } from './vendor-followers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('vendor-followers')
export class VendorFollowersController {
    constructor(private readonly service: VendorFollowersService) { }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.CUSTOMER, UserRole.VENDOR, UserRole.WHOLESALER)
    @Post(':vendorId/follow')
    async follow(@Request() req, @Param('vendorId') vendorId: string) {
        return this.service.followVendor(req.user.id, vendorId);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.CUSTOMER, UserRole.VENDOR, UserRole.WHOLESALER)
    @Delete(':vendorId/unfollow')
    async unfollow(@Request() req, @Param('vendorId') vendorId: string) {
        return this.service.unfollowVendor(req.user.id, vendorId);
    }

    @Get(':vendorId/count')
    async getCount(@Param('vendorId') vendorId: string) {
        return this.service.getFollowerCount(vendorId);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.CUSTOMER, UserRole.VENDOR, UserRole.WHOLESALER)
    @Get(':vendorId/status')
    async getStatus(@Request() req, @Param('vendorId') vendorId: string) {
        return this.service.isFollowing(req.user.id, vendorId);
    }
}
