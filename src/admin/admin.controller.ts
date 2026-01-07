import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('stats')
    getStats() {
        return this.adminService.getAnalytics();
    }

    @Get('users')
    getUsers(@Query('page') page: number, @Query('search') search: string) {
        return this.adminService.getUsers(Number(page) || 1, search);
    }

    @Post('users/:id/coins')
    updateCoins(
        @Request() req,
        @Param('id') userId: string,
        @Body() body: { amount: number, reason: string }
    ) {
        return this.adminService.updateUserCoins(req.user.id, userId, body.amount, body.reason);
    }

    @Get('vendors')
    getVendors(@Query('status') status: string) {
        return this.adminService.getVendors(status);
    }

    @Post('vendors/:id/approve')
    approveVendor(
        @Request() req,
        @Param('id') id: string,
        @Body('approved') approved: boolean
    ) {
        return this.adminService.approveVendor(req.user.id, id, approved);
    }

    @Get('rooms')
    getAllRooms() {
        return this.adminService.getAllRooms();
    }

    @Post('rooms')
    createRoom(@Request() req, @Body() body: any) {
        return this.adminService.createRoom(req.user.id, body);
    }

    @Get('banners')
    getBanners() {
        return this.adminService.getBanners();
    }

    @Get('orders')
    getAllOrders(
        @Query('limit') limit: number,
        @Query('search') search: string,
        @Query('status') status: string
    ) {
        return this.adminService.getAllOrders(limit, search, status);
    }

    @Get('products')
    getProducts(
        @Query('categoryId') categoryId: string,
        @Query('search') search: string
    ) {
        return this.adminService.getProducts(categoryId, search);
    }

    @Get('categories')
    getCategories() {
        return this.adminService.getCategories();
    }

    @Post('products/:id/toggle')
    toggleProduct(@Param('id') id: string, @Body('isActive') isActive: boolean) {
        return this.adminService.toggleProductStatus(id, isActive);
    }

    @Post('banners')
    addBanner(@Body() body: any) {
        return this.adminService.addBanner(body);
    }

    @Delete('banners/:id')
    deleteBanner(@Param('id') id: string) {
        return this.adminService.deleteBanner(id);
    }
}
