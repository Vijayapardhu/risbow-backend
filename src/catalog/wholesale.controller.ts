import { Controller, Get, Post, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogService } from '../catalog/catalog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ProductFilterDto } from '../catalog/dto/catalog.dto';
import { UserRole } from '@prisma/client';

@ApiTags('Catalog')
@Controller('wholesale')
export class WholesaleController {
    constructor(private readonly catalogService: CatalogService) { }

    @Get('products')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.VENDOR, UserRole.ADMIN, UserRole.WHOLESALER)
    async getWholesaleProducts(@Request() req: any) {
        // Retailers (VENDOR role) buy from Wholesalers
        return this.catalogService.findAll({ isWholesale: true });
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
