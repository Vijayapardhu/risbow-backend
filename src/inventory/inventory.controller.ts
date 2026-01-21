import { Controller, Get, Param, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Get('product/:productId')
    @ApiOperation({ summary: 'Get product stock' })
    @ApiParam({ name: 'productId', type: 'string' })
    @ApiQuery({ name: 'variationId', required: false, type: 'string' })
    async getProductStock(
        @Param('productId') productId: string,
        @Query('variationId') variationId?: string
    ) {
        return this.inventoryService.getStock(productId, variationId);
    }
}
