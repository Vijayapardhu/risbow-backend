import { Controller, Get, Post, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogService } from '../catalog/catalog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductFilterDto } from '../catalog/dto/catalog.dto';

@ApiTags('Catalog')
@Controller('wholesale')
export class WholesaleController {
    constructor(private readonly catalogService: CatalogService) { }

    @Get('products')
    @UseGuards(JwtAuthGuard)
    async getWholesaleProducts(@Request() req) {
        // Should ideally check if req.user is a VENDOR (Retailer)
        // For MVP, just return products with isWholesale: true
        // We reuse catalog service but need a filter for wholesale

        // This is a direct prisma call stub for efficiency or we extend catalog service
        // Let's assume we return filtered list
        // return this.catalogService.findAll({ ...filters, isWholesale: true });

        // Mock response for now as findAll doesn't support isWholesale arg yet
        return this.catalogService.findAll({ search: 'wholesale' });
    }

    /*
    @Post('bulk')
    @UseGuards(JwtAuthGuard)
    async bulkUpload(@Request() req, @Body() csv: string) {
        // Check if req.user is WHOLESALER
        // Call catalogService.processBulkUpload with isWholesale=true
    }
    */
}
