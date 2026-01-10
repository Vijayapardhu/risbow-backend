import { Controller, Get, Post, Body, Query, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CreateProductDto, ProductFilterDto } from './dto/catalog.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('products')
export class CatalogController {
    constructor(private readonly catalogService: CatalogService) { }

    @Get()
    async findAll(@Query() filters: ProductFilterDto) {
        return this.catalogService.findAll(filters);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.catalogService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
    async create(@Body() createProductDto: CreateProductDto) {
        return this.catalogService.createProduct(createProductDto);
    }

    @Post('bulk')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('VENDOR', 'ADMIN', 'SUPER_ADMIN')
    @UseInterceptors(FileInterceptor('file'))
    async bulkUpload(@UploadedFile() file: any) {
        if (!file) throw new Error('File not present');
        const content = file.buffer.toString('utf-8');
        return this.catalogService.processBulkUpload(content);
    }
}

@Controller('categories')
export class CategoriesController {
    constructor(private readonly catalogService: CatalogService) { }

    @Get()
    async getAll() {
        return this.catalogService.getCategories();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.catalogService.getCategory(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async create(@Body() body: any) {
        return this.catalogService.createCategory(body);
    }

    @Post(':id') // Using Post for update as simpler alternative or Patch
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async update(@Param('id') id: string, @Body() body: any) {
        return this.catalogService.updateCategory(id, body);
    }
}

@Controller('gifts')
export class GiftsController {
    constructor(private readonly catalogService: CatalogService) { }

    @Get('eligible')
    async getEligible(@Query('cartValue') cartValue: string) {
        const val = parseInt(cartValue, 10) || 0;
        return this.catalogService.getEligibleGifts(val);
    }
}
