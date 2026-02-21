import { Controller, Get, Query, UseGuards, Param, Post, Body, Patch, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { AdminProductService } from './admin-product.service';
import { AdminService } from './admin.service';
import { AdminJwtAuthGuard } from './auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from './auth/guards/admin-permissions.guard';
import { AdminRoles } from './auth/decorators/admin-roles.decorator';
import { CreateProductDto, UpdateProductDto } from '../catalog/dto/catalog.dto';

@ApiTags('Admin')
@Controller('admin/products')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)
@AdminRoles(AdminRole.OPERATIONS_ADMIN)
export class AdminProductController {
    constructor(
        private readonly productService: AdminProductService,
        private readonly adminService: AdminService
    ) { }

    @Get()
    async getProductList(
        @Query('search') search?: string,
        @Query('period') period?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 50,
        @Query('status') status?: string,
        @Query('categoryId') categoryId?: string,
        @Query('vendorId') vendorId?: string,
    ) {
        return this.productService.getProductList({ search, period, page, limit, status, categoryId, vendorId });
    }

    @Post()
    async createProduct(@Body() productData: CreateProductDto) {
        return this.productService.createProduct(productData);
    }

    @Post('bulk')
    async bulkCreateProduct(@Body() body: { products: any[] }) {
        return this.adminService.bulkCreateProducts(body.products);
    }

    @Patch(':id/status')
    async updateProductStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
        return this.productService.updateProduct(id, { isActive });
    }

    @Post(':id/toggle')
    async toggleProduct(@Param('id') id: string, @Body('isActive') isActive: boolean) {
        return this.adminService.toggleProductStatus(id, isActive);
    }

    @Post(':id/approve')
    async approveProduct(@Param('id') id: string) {
        return this.productService.approveProduct(id);
    }

    @Post(':id/block')
    async blockProduct(@Param('id') id: string) {
        return this.productService.blockProduct(id);
    }

    // ── Literal sub-routes MUST come before @Get(':id') to avoid shadowing ──

    @Get('pending')
    async getPendingProducts(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 50,
        @Query('search') search?: string,
    ) {
        return this.productService.getProductList({
            status: 'PENDING',
            page: Number(page),
            limit: Number(limit),
            search,
        });
    }

    @Get('low-stock')
    async getLowStockProducts(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 50,
        @Query('threshold') threshold: number = 10,
    ) {
        return this.productService.getLowStockProducts({
            page: Number(page),
            limit: Number(limit),
            threshold: Number(threshold),
        });
    }

    @Get(':id/vendor-offers')
    async getVendorOffers(@Param('id') id: string) {
        return this.productService.getVendorOffers(id);
    }

    @Get(':id/analytics')
    async getProductAnalytics(@Param('id') id: string, @Query('period') period?: string) {
        return this.productService.getProductAnalytics(id, period);
    }

    @Get(':id')
    async getProductDetail(@Param('id') id: string) {
        return this.productService.getProductDetail(id);
    }

    @Patch(':id')
    async updateProduct(@Param('id') id: string, @Body() productData: UpdateProductDto) {
        return this.productService.updateProduct(id, productData);
    }

    @Delete(':id')
    async deleteProduct(@Param('id') id: string) {
        return this.productService.deleteProduct(id);
    }
}
