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

    @Get('audit-logs')
    @Roles('SUPER_ADMIN')
    getAuditLogs(@Query('limit') limit: number) {
        return this.adminService.getAuditLogs(limit);
    }

    @Get('stats')
    getStats() {
        return this.adminService.getAnalytics();
    }

    @Get('health')
    getHealth() {
        return this.adminService.getSystemHealth();
    }

    @Get('users')
    getUsers(@Query('page') page: number, @Query('search') search: string) {
        return this.adminService.getUsers(Number(page) || 1, search);
    }

    @Get('users/:id')
    getUserDetails(@Param('id') id: string) {
        return this.adminService.getUserDetails(id);
    }

    @Post('users/:id/coins')
    @Roles('SUPER_ADMIN')
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
    @Roles('SUPER_ADMIN')
    approveVendor(
        @Request() req,
        @Param('id') id: string,
        @Body() body: { approved: boolean, reason?: string }
    ) {
        return this.adminService.approveVendor(req.user.id, id, body.approved, body.reason);
    }

    @Get('rooms')
    getAllRooms() {
        return this.adminService.getAllRooms();
    }

    @Post('rooms')
    createRoom(@Request() req, @Body() body: any) {
        return this.adminService.createRoom(req.user.id, body);
    }


    @Get('orders')
    getAllOrders(
        @Query('limit') limit: number,
        @Query('search') search: string,
        @Query('status') status: string
    ) {
        return this.adminService.getAllOrders(limit, search, status);
    }

    @Post('orders/:id/status')
    updateOrderStatus(
        @Request() req,
        @Param('id') id: string,
        @Body() body: { status: string, logistics?: any }
    ) {
        return this.adminService.updateOrderStatus(req.user.id, id, body.status, body.logistics);
    }

    // --- MARKETING ---

    @Get('banners')
    getBanners() {
        return this.adminService.getBanners();
    }

    @Post('banners')
    createBanner(@Request() req, @Body() body: any) {
        return this.adminService.createBanner(req.user.id, body);
    }

    @Post('banners/:id/toggle')
    toggleBanner(@Param('id') id: string, @Body('isActive') isActive: boolean) {
        return this.adminService.toggleBannerStatus(id, isActive);
    }

    @Post('notifications/broadcast')
    @Roles('SUPER_ADMIN')
    sendBroadcast(@Request() req, @Body() body: { title: string, body: string, audience: string }) {
        return this.adminService.sendBroadcast(req.user.id, body.title, body.body, body.audience);
    }

    // --- ANALYTICS ---

    @Get('analytics/chart-data')
    getChartData() {
        return this.adminService.getAnalytics();
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

    @Post('categories')
    createCategory(@Body() body: { name: string, parentId?: string, image?: string }) {
        return this.adminService.createCategory(body);
    }

    @Delete('categories/:id')
    deleteCategory(@Param('id') id: string) {
        return this.adminService.deleteCategory(id);
    }

    @Post('vendors/:id/commission')
    @Roles('SUPER_ADMIN')
    updateCommission(@Request() req, @Param('id') id: string, @Body('rate') rate: number) {
        return this.adminService.updateVendorCommission(req.user.id, id, rate);
    }

    @Post('products')
    createProduct(@Body() body: any) {
        return this.adminService.createProduct(body);
    }

    @Post('products/bulk')
    bulkCreateProduct(@Body() body: { products: any[] }) {
        return this.adminService.bulkCreateProducts(body.products);
    }

    @Post('products/:id/toggle')
    toggleProduct(@Param('id') id: string, @Body('isActive') isActive: boolean) {
        return this.adminService.toggleProductStatus(id, isActive);
    }

    @Delete('banners/:id')
    @Roles('SUPER_ADMIN')
    deleteBanner(@Param('id') id: string) {
        // Assume deleteBanner exists in service or needs to be added back if I removed it erroneously
        return this.adminService.deleteBanner(id);
    }

    // --- SETTINGS ---

    @Get('settings')
    getSettings() {
        return this.adminService.getPlatformConfig();
    }

    @Post('settings')
    @Roles('SUPER_ADMIN')
    updateSetting(@Body() body: { key: string, value: string }) {
        return this.adminService.updatePlatformConfig(body.key, body.value);
    }

    // --- COUPONS ---

    @Get('coupons')
    getCoupons() {
        return this.adminService.getCoupons();
    }

    @Post('coupons')
    @Roles('ADMIN', 'SUPER_ADMIN')
    createCoupon(@Body() body: any) {
        return this.adminService.createCoupon(body);
    }

    @Patch('coupons/:id')
    @Roles('ADMIN', 'SUPER_ADMIN')
    updateCoupon(@Param('id') id: string, @Body() body: any) {
        return this.adminService.updateCoupon(id, body);
    }

    @Delete('coupons/:id')
    @Roles('SUPER_ADMIN')
    deleteCoupon(@Param('id') id: string) {
        return this.adminService.deleteCoupon(id);
    }

    // --- COINS ---
    @Get('coins/transactions')
    getCoinTransactions() {
        return this.adminService.getAllCoinTransactions();
    }

    @Get('coins/stats')
    getCoinStats() {
        return this.adminService.getCoinStats();
    }

    // --- MODERATION ---
    @Get('reviews')
    getReviews() {
        return this.adminService.getPendingReviews();
    }

    @Delete('reviews/:id')
    deleteReview(@Param('id') id: string) {
        return this.adminService.deleteReview(id);
    }

    @Get('reports')
    getReports(@Query('status') status: string) {
        return this.adminService.getReports(status);
    }

    @Post('reports/:id/resolve')
    resolveReport(@Param('id') id: string, @Body('action') action: string) {
        return this.adminService.resolveReport(id, action);
    }
}

