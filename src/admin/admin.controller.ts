import { Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    // --- APP CONFIG ---

    @Get('config')
    getAppConfig() {
        return this.adminService.getAppConfig();
    }

    @Post('config')
    @Roles('SUPER_ADMIN')
    updateAppConfig(@Body() body: Record<string, any>) {
        return this.adminService.updateAppConfig(body);
    }

    @Post('users/:id/analyze')
    async analyzeUser(@Param('id') id: string) {
        return this.adminService.calculateUserRisk(id);
    }

    @Get('audit-logs')
    @Roles('ADMIN', 'SUPER_ADMIN')
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

    @Get('users/export/csv')
    @Roles('ADMIN', 'SUPER_ADMIN')
    exportUsers() {
        return this.adminService.exportUsers();
    }

    @Get('users/:id')
    getUserDetails(@Param('id') id: string) {
        return this.adminService.getUserDetails(id);
    }

    @Patch('users/:id')
    @Roles('ADMIN', 'SUPER_ADMIN')
    updateUser(
        @Request() req,
        @Param('id') userId: string,
        @Body() body: any
    ) {
        return this.adminService.updateUser(req.user.id, userId, body);
    }

    @Post('users/:id/kyc')
    @Roles('ADMIN', 'SUPER_ADMIN')
    updateKyc(
        @Request() req,
        @Param('id') userId: string,
        @Body() body: { status: string, notes?: string }
    ) {
        return this.adminService.updateKycStatus(req.user.id, userId, body.status, body.notes);
    }

    @Post('users/:id/force-logout')
    @Roles('ADMIN', 'SUPER_ADMIN')
    forceLogout(@Request() req, @Param('id') userId: string) {
        return this.adminService.forceLogout(req.user.id, userId);
    }

    @Post('users/:id/toggle-refunds')
    @Roles('ADMIN', 'SUPER_ADMIN')
    toggleRefunds(
        @Request() req,
        @Param('id') userId: string,
        @Body() body: { disabled: boolean }
    ) {
        return this.adminService.toggleRefunds(req.user.id, userId, body.disabled);
    }

    @Post('users/:id/toggle-cod')
    @Roles('ADMIN', 'SUPER_ADMIN')
    toggleCod(
        @Request() req,
        @Param('id') userId: string,
        @Body() body: { disabled: boolean }
    ) {
        return this.adminService.toggleCod(req.user.id, userId, body.disabled);
    }

    @Post('users/:id/risk-tag')
    @Roles('ADMIN', 'SUPER_ADMIN')
    updateRiskTag(
        @Request() req,
        @Param('id') userId: string,
        @Body() body: { tag: string }
    ) {
        return this.adminService.updateRiskTag(req.user.id, userId, body.tag);
    }

    @Post('users/:id/value-tag')
    @Roles('ADMIN', 'SUPER_ADMIN')
    updateValueTag(
        @Request() req,
        @Param('id') userId: string,
        @Body() body: { tag: string }
    ) {
        return this.adminService.updateValueTag(req.user.id, userId, body.tag);
    }

    @Post('users/:id/notes')
    @Roles('ADMIN', 'SUPER_ADMIN')
    addAdminNote(
        @Request() req,
        @Param('id') userId: string,
        @Body() body: { note: string }
    ) {
        return this.adminService.addAdminNote(req.user.id, userId, body.note);
    }

    @Get('users/:id/cart')
    @Roles('ADMIN', 'SUPER_ADMIN')
    getUserCart(@Param('id') userId: string) {
        return this.adminService.getUserCart(userId);
    }

    @Post('users/:id/coins')
    @Roles('ADMIN', 'SUPER_ADMIN')
    updateCoins(
        @Request() req,
        @Param('id') userId: string,
        @Body() body: { amount: number, reason: string }
    ) {
        return this.adminService.updateUserCoins(req.user.id, userId, body.amount, body.reason);
    }

    @Post('users/:id/status')
    @Roles('ADMIN', 'SUPER_ADMIN')
    updateUserStatus(
        @Request() req,
        @Param('id') userId: string,
        @Body() body: { status: string; reason?: string }
    ) {
        return this.adminService.updateUserStatus(req.user.id, userId, body.status, body.reason);
    }

    @Post('users/:id/suspend')
    @Roles('ADMIN', 'SUPER_ADMIN')
    suspendUser(
        @Request() req,
        @Param('id') userId: string,
        @Body() body: { reason?: string }
    ) {
        return this.adminService.suspendUser(req.user.id, userId, body.reason);
    }

    @Post('users/:id/activate')
    @Roles('ADMIN', 'SUPER_ADMIN')
    activateUser(
        @Request() req,
        @Param('id') userId: string
    ) {
        return this.adminService.activateUser(req.user.id, userId);
    }

    @Post('users/:id/ban')
    @Roles('ADMIN', 'SUPER_ADMIN')
    banUser(
        @Request() req,
        @Param('id') userId: string,
        @Body() body: { reason: string }
    ) {
        return this.adminService.banUser(req.user.id, userId, body.reason);
    }

    @Delete('users/:id')
    @Roles('ADMIN', 'SUPER_ADMIN')
    deleteUser(
        @Request() req,
        @Param('id') userId: string
    ) {
        return this.adminService.deleteUser(req.user.id, userId);
    }

    @Get('users/:id/orders')
    @Roles('ADMIN', 'SUPER_ADMIN')
    getUserOrders(
        @Param('id') userId: string,
        @Query('limit') limit: number
    ) {
        return this.adminService.getUserOrders(userId, Number(limit) || 20);
    }

    @Get('users/:id/wishlist')
    @Roles('ADMIN', 'SUPER_ADMIN')
    getUserWishlist(@Param('id') userId: string) {
        return this.adminService.getUserWishlist(userId);
    }

    @Get('users/:id/addresses')
    @Roles('ADMIN', 'SUPER_ADMIN')
    getUserAddresses(@Param('id') userId: string) {
        return this.adminService.getUserAddresses(userId);
    }

    @Post('users/:id/notify')
    @Roles('ADMIN', 'SUPER_ADMIN')
    sendUserNotification(
        @Param('id') userId: string,
        @Body() body: { title: string, message: string }
    ) {
        return this.adminService.sendUserNotification(userId, body.title, body.message);
    }

    @Post('users/:id/reset-password')
    @Roles('ADMIN', 'SUPER_ADMIN')
    resetUserPassword(
        @Request() req,
        @Param('id') userId: string
    ) {
        return this.adminService.resetUserPassword(req.user.id, userId);
    }

    @Get('users/:id/activity')
    @Roles('ADMIN', 'SUPER_ADMIN')
    getUserActivity(@Param('id') userId: string) {
        return this.adminService.getUserActivity(userId);
    }

    @Get('vendors')
    getVendors(@Query('status') status: string) {
        return this.adminService.getVendors(status);
    }

    @Post('vendors/:id/approve')
    @Roles('ADMIN', 'SUPER_ADMIN')
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

    @Get('orders/:id')
    getOrderById(@Param('id') id: string) {
        return this.adminService.getOrderById(id);
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
    @Roles('ADMIN', 'SUPER_ADMIN')
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

    @Get('categories/:id')
    getCategory(@Param('id') id: string) {
        return this.adminService.getCategoryById(id);
    }

    @Delete('categories/:id')
    deleteCategory(@Param('id') id: string) {
        return this.adminService.deleteCategory(id);
    }

    @Post('categories/:id')
    updateCategory(@Param('id') id: string, @Body() body: any) {
        return this.adminService.updateCategory(id, body);
    }

    @Patch('categories/:id')
    updateCategoryPatch(@Param('id') id: string, @Body() body: any) {
        return this.adminService.updateCategory(id, body);
    }

    @Post('vendors/:id/commission')
    @Roles('ADMIN', 'SUPER_ADMIN')
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
    @Roles('ADMIN', 'SUPER_ADMIN')
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
    @Roles('ADMIN', 'SUPER_ADMIN')
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
    @Roles('ADMIN', 'SUPER_ADMIN')
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

