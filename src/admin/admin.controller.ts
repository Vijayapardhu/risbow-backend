import { Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    // Helper method to normalize pagination parameters
    private normalizePagination(page: string | number | undefined, limit: string | number | undefined, defaultLimit: number = 20) {
        const normalizedPage = Math.max(1, Number(page) || 1);
        const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || defaultLimit)); // Cap at 100
        return { page: normalizedPage, limit: normalizedLimit };
    }

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
    getUsers(
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('search') search: string
    ) {
        const { page: normalizedPage, limit: normalizedLimit } = this.normalizePagination(page, limit, 50);
        return this.adminService.getUsers(normalizedPage, search, undefined, normalizedLimit);
    }

    @Get('users/export/csv')
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Export users to CSV' })
    async exportUsers(@Res() res: Response) {
        const csv = await this.adminService.exportUsersCSV();
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
        res.send(csv);
    }

    @Post('users/bulk-update')
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Bulk update users' })
    async bulkUpdateUsers(
        @Request() req,
        @Body() body: { userIds: string[]; data: { status?: string; role?: string } }
    ) {
        return this.adminService.bulkUpdateUsers(req.user.id, body.userIds, body.data);
    }

    @Post('users/bulk-delete')
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Bulk delete users' })
    async bulkDeleteUsers(
        @Request() req,
        @Body() body: { userIds: string[] }
    ) {
        return this.adminService.bulkDeleteUsers(req.user.id, body.userIds);
    }

    @Get('orders/export/csv')
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Export orders to CSV' })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    async exportOrders(
        @Res() res: Response,
        @Query('status') status?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        const csv = await this.adminService.exportOrdersCSV({
            status,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=orders-export.csv');
        res.send(csv);
    }

    @Get('products/export/csv')
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Export products to CSV' })
    @ApiQuery({ name: 'vendorId', required: false, type: String })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    async exportProducts(
        @Res() res: Response,
        @Query('vendorId') vendorId?: string,
        @Query('isActive') isActive?: string
    ) {
        const csv = await this.adminService.exportProductsCSV({
            vendorId,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=products-export.csv');
        res.send(csv);
    }

    @Get('vendors/export/csv')
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Export vendors to CSV' })
    @ApiQuery({ name: 'status', required: false, type: String })
    async exportVendors(
        @Res() res: Response,
        @Query('status') status?: string
    ) {
        const csv = await this.adminService.exportVendorsCSV({ status });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=vendors-export.csv');
        res.send(csv);
    }

    @Post('products/bulk-update')
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Bulk update products' })
    async bulkUpdateProducts(
        @Request() req,
        @Body() body: { productIds: string[]; data: { isActive?: boolean } }
    ) {
        return this.adminService.bulkUpdateProducts(req.user.id, body.productIds, body.data);
    }

    @Post('products/bulk-delete')
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Bulk delete products' })
    async bulkDeleteProducts(
        @Request() req,
        @Body() body: { productIds: string[] }
    ) {
        return this.adminService.bulkDeleteProducts(req.user.id, body.productIds);
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
    @ApiOperation({ summary: 'List all vendors with filters' })
    getVendors(
        @Query('status') status: string,
        @Query('page') page: string,
        @Query('limit') limit: string,
        @Query('search') search: string
    ) {
        const { page: normalizedPage, limit: normalizedLimit } = this.normalizePagination(page, limit, 20);
        return this.adminService.getVendors(status, normalizedPage, normalizedLimit, search);
    }

    @Get('vendors/:id')
    @ApiOperation({ summary: 'Get vendor details by ID' })
    getVendorDetails(@Param('id') id: string) {
        return this.adminService.getVendorDetails(id);
    }

    @Post('vendors/:id/approve')
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Approve or reject vendor' })
    approveVendor(
        @Request() req,
        @Param('id') id: string,
        @Body() body: { approved: boolean, reason?: string }
    ) {
        return this.adminService.approveVendor(req.user.id, id, body.approved, body.reason);
    }

    @Post('vendors/:id/kyc-verify')
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Verify vendor KYC documents' })
    verifyVendorKyc(
        @Request() req,
        @Param('id') id: string,
        @Body() body: { status: string, notes?: string }
    ) {
        return this.adminService.verifyVendorKyc(req.user.id, id, body.status, body.notes);
    }

    @Post('vendors/:id/suspend')
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Suspend vendor account' })
    suspendVendor(
        @Request() req,
        @Param('id') id: string,
        @Body() body: { reason?: string }
    ) {
        return this.adminService.suspendVendor(req.user.id, id, body.reason);
    }

    @Post('vendors/:id/activate')
    @Roles('ADMIN', 'SUPER_ADMIN')
    @ApiOperation({ summary: 'Activate suspended vendor' })
    activateVendor(
        @Request() req,
        @Param('id') id: string
    ) {
        return this.adminService.activateVendor(req.user.id, id);
    }

    @Get('vendors/:id/analytics')
    @ApiOperation({ summary: 'Get vendor analytics and performance metrics' })
    getVendorAnalytics(@Param('id') id: string) {
        return this.adminService.getVendorAnalytics(id);
    }

    @Get('vendors/:id/documents')
    @ApiOperation({ summary: 'Get vendor KYC documents' })
    getVendorDocuments(@Param('id') id: string) {
        return this.adminService.getVendorDocuments(id);
    }

    @Get('vendors/:id/payouts')
    @ApiOperation({ summary: 'Get vendor payout history' })
    getVendorPayouts(
        @Param('id') id: string,
        @Query('page') page: string,
        @Query('limit') limit: string
    ) {
        const { page: normalizedPage, limit: normalizedLimit } = this.normalizePagination(page, limit, 20);
        return this.adminService.getVendorPayouts(id, normalizedPage, normalizedLimit);
    }

    @Get('rooms')
    getAllRooms() {
        return this.adminService.getAllRooms();
    }

    @Post('rooms')
    createRoom(@Request() req, @Body() body: any) {
        return this.adminService.createRoom(req.user.id, body);
    }



    // --- MARKETING ---
    // Note: All banner routes are handled by BannersController to avoid duplicates
    // Removed @Get('banners'), @Post('banners'), and @Post('banners/:id/toggle')
    // Use /api/v1/admin/banners endpoints from BannersController instead

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



    // @Delete('banners/:id') removed - use /api/v1/admin/banners/:id DELETE from BannersController instead

    // --- SETTINGS ---
    // GET/PATCH /admin/settings are handled by AdminSettingsController to avoid duplicate route.

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

    /*
    @Post('memberships')
    @Roles('ADMIN', 'SUPER_ADMIN')
    @Throttle({ default: { limit: 10, ttl: 60 } })
    createMembership(@Request() req, @Body() body: import('./dto/membership.dto').MembershipDto) {
        return this.adminService.createMembership(req.user.id, body);
    }

    @Post('coins/config')
    @Roles('SUPER_ADMIN')
    @Throttle({ default: { limit: 5, ttl: 60 } })
    updateCoinsConfig(@Request() req, @Body() body: import('./dto/coins-config.dto').CoinsConfigDto) {
        return this.adminService.updateCoinsConfig(req.user.id, body);
    }

    @Post('gift-skus')
    @Roles('ADMIN', 'SUPER_ADMIN')
    @Throttle({ default: { limit: 10, ttl: 60 } })
    createGiftSku(@Request() req, @Body() body: import('./dto/gift-sku.dto').GiftSkuDto) {
        return this.adminService.createGiftSku(req.user.id, body);
    }

    @Post('room-offers')
    @Roles('ADMIN', 'SUPER_ADMIN')
    @Throttle({ default: { limit: 10, ttl: 60 } })
    createRoomOffer(@Request() req, @Body() body: import('./dto/room-offer.dto').RoomOfferDto) {
        return this.adminService.createRoomOffer(req.user.id, body);
    }
    */
}

