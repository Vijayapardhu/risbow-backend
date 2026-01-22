import { Controller, Post, Delete, Get, Param, UseGuards, Request } from '@nestjs/common';
import { VendorFollowersService } from './vendor-followers.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('vendor-followers')
export class VendorFollowersController {
    constructor(private readonly service: VendorFollowersService) { }

    // @UseGuards(JwtAuthGuard)
    @Post(':vendorId/follow')
    async follow(@Request() req, @Param('vendorId') vendorId: string) {
        const userId = req.user?.id || 'stub-user-id'; // Auth guard usually provides user
        return this.service.followVendor(userId, vendorId);
    }

    // @UseGuards(JwtAuthGuard)
    @Delete(':vendorId/unfollow')
    async unfollow(@Request() req, @Param('vendorId') vendorId: string) {
        const userId = req.user?.id || 'stub-user-id';
        return this.service.unfollowVendor(userId, vendorId);
    }

    @Get(':vendorId/count')
    async getCount(@Param('vendorId') vendorId: string) {
        return this.service.getFollowerCount(vendorId);
    }

    // @UseGuards(JwtAuthGuard)
    @Get(':vendorId/status')
    async getStatus(@Request() req, @Param('vendorId') vendorId: string) {
        const userId = req.user?.id || 'stub-user-id';
        return this.service.isFollowing(userId, vendorId);
    }
}
