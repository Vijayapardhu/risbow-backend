import { Controller, Get, Query, UseGuards, Param, Post, Body, Patch, Delete } from '@nestjs/common';
import { AdminProductService } from './admin-product.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateProductDto, UpdateProductDto } from '../catalog/dto/catalog.dto';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminProductController {
    constructor(private readonly productService: AdminProductService) { }

    @Get()
    async getProductList(
        @Query('search') search?: string,
        @Query('period') period?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 50,
    ) {
        return this.productService.getProductList({ search, period, page, limit });
    }

    @Get(':id')
    async getProductDetail(@Param('id') id: string) {
        return this.productService.getProductDetail(id);
    }

    @Post()
    async createProduct(@Body() productData: CreateProductDto) {
        return this.productService.createProduct(productData);
    }

    @Patch(':id')
    async updateProduct(@Param('id') id: string, @Body() productData: UpdateProductDto) {
        return this.productService.updateProduct(id, productData);
    }

    @Delete(':id')
    async deleteProduct(@Param('id') id: string) {
        return this.productService.deleteProduct(id);
    }

    @Get(':id/vendor-offers')
    async getVendorOffers(@Param('id') id: string) {
        return this.productService.getVendorOffers(id);
    }

    @Get(':id/analytics')
    async getProductAnalytics(@Param('id') id: string, @Query('period') period?: string) {
        return this.productService.getProductAnalytics(id, period);
    }
}
