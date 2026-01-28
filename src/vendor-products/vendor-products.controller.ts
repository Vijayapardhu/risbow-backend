import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Req, BadRequestException, Get, Res, Body, Put, Param, Patch, Delete, Query } from '@nestjs/common';
import { CreateProductDto, UpdateProductDto, ProductStatusDto } from './dto/product.dto';
import { SaveProductSpecsDto } from './dto/product-specs.dto';
import { VariationDto } from './dto/variation.dto';
import { UpdateProductExpiryDto, BulkUpdateExpiryDto } from './dto/update-product-expiry.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { VendorProductsService } from './vendor-products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';

@ApiTags('Vendor Products')
@Controller('vendor-products')
export class VendorProductsController {
    constructor(private readonly productsService: VendorProductsService) { }

    @Post('bulk-upload')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Bulk upload products via CSV' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async bulkUpload(@Req() req, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('No CSV file uploaded');
        if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
            throw new BadRequestException('File must be a CSV');
        }

        return this.productsService.processBulkUpload(req.user.id, file.buffer);
    }

    @Get('template')
    @ApiOperation({ summary: 'Download CSV template for bulk upload' })
    async getTemplate(@Res() res: Response) {
        const csv = `Title,Description,Price,OfferPrice,Stock,SKU,CategoryId,BrandName\nExample Product,This is a description,1000,900,50,SKU-12345,cat_123,BrandX`;
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename=products_template.csv');
        res.send(csv);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new product' })
    async create(@Req() req, @Body() dto: CreateProductDto) {
        return this.productsService.createProduct(req.user.id, dto);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all products for vendor' })
    async findAll(@Req() req, @Query('includeExpiry') includeExpiry?: string) {
        return this.productsService.findAllProducts(req.user.id, includeExpiry === 'true');
    }

    @Get('expiring-soon')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get products expiring soon (for auto-clearance preview)' })
    async getExpiringSoon(@Req() req, @Query('days') days?: string) {
        return this.productsService.getExpiringSoon(req.user.id, days ? parseInt(days) : 7);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a product' })
    async update(@Req() req, @Param('id') id: string, @Body() dto: UpdateProductDto) {
        return this.productsService.updateProduct(req.user.id, id, dto);
    }

    @Patch(':id/status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update product status' })
    async updateStatus(@Req() req, @Param('id') id: string, @Body() dto: ProductStatusDto) {
        return this.productsService.updateProductStatus(req.user.id, id, dto.isActive);
    }

    @Post(':id/specs')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Add or update product specifications' })
    async saveSpecs(@Req() req, @Param('id') id: string, @Body() dto: SaveProductSpecsDto) {
        return this.productsService.saveProductSpecs(req.user.id, id, dto);
    }

    @Put(':id/specs')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update product specifications' })
    async updateSpecs(@Req() req, @Param('id') id: string, @Body() dto: SaveProductSpecsDto) {
        return this.productsService.saveProductSpecs(req.user.id, id, dto);
    }

    @Post(':id/variations')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Add a product variation' })
    async addVariation(@Req() req, @Param('id') id: string, @Body() dto: VariationDto) {
        return this.productsService.addVariation(req.user.id, id, dto);
    }

    @Put(':id/variations')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a product variation' })
    async updateVariation(@Req() req, @Param('id') id: string, @Body() dto: VariationDto) {
        return this.productsService.updateVariation(req.user.id, id, dto);
    }

    @Delete(':id/variations/:variationId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a product variation' })
    async deleteVariation(@Req() req, @Param('id') id: string, @Param('variationId') variationId: string) {
        return this.productsService.deleteVariation(req.user.id, id, variationId);
    }

    @Post(':id/publish')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Publish a product (Draft -> Published)' })
    async publish(@Req() req, @Param('id') id: string) {
        return this.productsService.publishProduct(req.user.id, id);
    }

    @Post(':id/unpublish')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Unpublish a product (Published -> Draft)' })
    async unpublish(@Req() req, @Param('id') id: string) {
        return this.productsService.unpublishProduct(req.user.id, id);
    }

    @Patch(':id/expiry')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update product expiry date and auto-clearance settings' })
    async updateExpiry(@Req() req, @Param('id') id: string, @Body() dto: UpdateProductExpiryDto) {
        return this.productsService.updateProductExpiry(req.user.id, id, dto);
    }

    @Post('bulk-update-expiry')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Bulk update expiry dates for multiple products' })
    async bulkUpdateExpiry(@Req() req, @Body() dto: BulkUpdateExpiryDto) {
        return this.productsService.bulkUpdateExpiry(req.user.id, dto);
    }
}
