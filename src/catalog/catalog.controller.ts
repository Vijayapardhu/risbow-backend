import { Controller, Get, Post, Body, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CreateProductDto, ProductFilterDto } from './dto/catalog.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('products')
export class CatalogController {
    constructor(private readonly catalogService: CatalogService) { }

    @Get()
    async findAll(@Query() filters: ProductFilterDto) {
        return this.catalogService.findAll(filters);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(@Body() createProductDto: CreateProductDto) {
        return this.catalogService.createProduct(createProductDto);
    }

    @Post('bulk')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    async bulkUpload(@UploadedFile() file: Express.Multer.File) {
        // In real app, validating Vendor role here is crucial
        if (!file) throw new Error('File not present');
        const content = file.buffer.toString('utf-8');
        // Basic CSV mock: Title,Price,Rest...
        return this.catalogService.processBulkUpload(content);
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
