import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BuyLaterService } from './buy-later.service';

@ApiTags('Buy Later')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('catalog/buy-later')
export class BuyLaterController {
    constructor(private readonly buyLaterService: BuyLaterService) { }

    @Post()
    @ApiOperation({ summary: 'Add product to buy later list' })
    async add(@Request() req: any, @Body() dto: { productId: string; variantId?: string; quantity?: number }) {
        return this.buyLaterService.addToBuyLater(req.user.id, dto.productId, dto.variantId, dto.quantity);
    }

    @Get()
    @ApiOperation({ summary: 'Get my buy later items' })
    async list(@Request() req: any) {
        return this.buyLaterService.getBuyLaterItems(req.user.id);
    }

    @Patch(':id/target-price')
    @ApiOperation({ summary: 'Update target price for notifications' })
    async updateTarget(@Request() req: any, @Param('id') id: string, @Body() dto: { targetPrice: number }) {
        return this.buyLaterService.updateTargetPrice(req.user.id, id, dto.targetPrice);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remove from buy later list' })
    async remove(@Request() req: any, @Param('id') id: string) {
        return this.buyLaterService.removeFromBuyLater(req.user.id, id);
    }
}
