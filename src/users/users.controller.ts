import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Request, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, ReferralClaimDto } from './dto/user.dto';
import { RegisterDeviceDto } from './dto/device.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CoinsService } from '../coins/coins.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly coinsService: CoinsService,
    ) { }

    @Get('me')
    async getProfile(@Request() req) {
        const user = await this.usersService.findOne(req.user.id);
        // Remove sensitive data if needed, simplified for now
        return user;
    }

    @Post() // or PATCH /users/me
    async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(req.user.id, updateUserDto);
    }

    @Get('me/coins')
    async getCoins(@Request() req) {
        const balance = await this.coinsService.getBalance(req.user.id);
        const ledger = await this.coinsService.getLedger(req.user.id);
        return { ...balance, ledger };
    }

    // --- ORDERS ---

    @Get('me/orders')
    async getOrders(@Request() req, @Query('limit') limit: string) {
        return this.usersService.getUserOrders(req.user.id, Number(limit) || 50);
    }

    @Get('me/orders/:id')
    async getOrderDetails(@Request() req, @Param('id') orderId: string) {
        return this.usersService.getOrderById(req.user.id, orderId);
    }

    // --- WISHLIST ---

    @Get('me/wishlist')
    async getWishlist(@Request() req) {
        return this.usersService.getWishlist(req.user.id);
    }

    @Post('me/wishlist/:productId')
    async addToWishlist(@Request() req, @Param('productId') productId: string) {
        return this.usersService.addToWishlist(req.user.id, productId);
    }

    @Delete('me/wishlist/:productId')
    async removeFromWishlist(@Request() req, @Param('productId') productId: string) {
        return this.usersService.removeFromWishlist(req.user.id, productId);
    }

    // --- NOTIFICATIONS ---

    @Get('me/notifications')
    async getNotifications(@Request() req, @Query('limit') limit: string) {
        return this.usersService.getNotifications(req.user.id, Number(limit) || 50);
    }

    @Post('me/notifications/:id/read')
    async markNotificationRead(@Request() req, @Param('id') notificationId: string) {
        return this.usersService.markNotificationRead(req.user.id, notificationId);
    }

    // --- DEVICE TOKENS (Push Notifications) ---

    @Post('me/devices')
    async registerDevice(@Request() req, @Body() dto: RegisterDeviceDto) {
        return this.usersService.registerDevice(req.user.id, dto);
    }

    // Address Management
    @Get('me/addresses')
    async getAddresses(@Request() req) {
        return this.usersService.getAddresses(req.user.id);
    }

    @Post('me/addresses')
    async createAddress(@Request() req, @Body() addressData: any) {
        return this.usersService.createAddress(req.user.id, addressData);
    }

    @Patch('me/addresses/:id')
    async updateAddress(@Request() req, @Param('id') id: string, @Body() addressData: any) {
        return this.usersService.updateAddress(req.user.id, id, addressData);
    }

    @Post('me/addresses/:id') // Using POST for compatibility with frontend PUT
    async updateAddressAlt(@Request() req, @Param('id') id: string, @Body() addressData: any) {
        return this.usersService.updateAddress(req.user.id, id, addressData);
    }

    @Post('me/addresses/:id/delete') // Using POST for DELETE compatibility
    async deleteAddress(@Request() req, @Param('id') id: string) {
        return this.usersService.deleteAddress(req.user.id, id);
    }
}

@ApiTags('Users')
@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    async getReferralInfo(@Request() req) {
        const user = await this.usersService.findOne(req.user.id);
        // To count referred users, would need a query. 
        // For brevity, just return the code.
        return { referralCode: user.referralCode };
    }

    @Get('share')
    async share(@Request() req) {
        const user = await this.usersService.findOne(req.user.id);
        const linkBase = process.env.APP_BASE_URL || 'https://risbow.app';
        return {
            referralCode: user.referralCode,
            link: `${linkBase}/ref/${user.referralCode}`
        };
    }

    @Post('claim')
    async claimReferral(@Request() req, @Body() dto: ReferralClaimDto) {
        return this.usersService.claimReferral(req.user.id, dto.refCode);
    }
}
