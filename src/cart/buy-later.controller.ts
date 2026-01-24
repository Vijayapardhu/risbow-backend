import { 
    Controller, 
    Get, 
    Post, 
    Put, 
    Delete, 
    Body, 
    Param, 
    Query, 
    UseGuards,
    Request,
    HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BuyLaterService } from './buy-later.service';
import { AddToBuyLaterDto, UpdateBuyLaterDto, BuyLaterResponseDto } from './dto/buy-later.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Buy Later')
@Controller('buy-later')
@UseGuards(JwtAuthGuard)
export class BuyLaterController {
    constructor(private readonly buyLaterService: BuyLaterService) {}

    @Post()
    @ApiOperation({ summary: 'Add product to buy later list' })
    @ApiResponse({ 
        status: HttpStatus.CREATED, 
        description: 'Product added to buy later list successfully',
        type: BuyLaterResponseDto 
    })
    async addToBuyLater(
        @Request() req: any,
        @Body() addToBuyLaterDto: AddToBuyLaterDto
    ): Promise<BuyLaterResponseDto> {
        return this.buyLaterService.addToBuyLater(req.user.id, addToBuyLaterDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get user\'s buy later list' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Buy later list retrieved successfully' 
    })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
    async getBuyLaterList(
        @Request() req: any,
        @Query('page') page?: number,
        @Query('limit') limit?: number
    ) {
        return this.buyLaterService.getBuyLaterList(
            req.user.id, 
            page || 1, 
            limit || 10
        );
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update buy later entry' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Buy later entry updated successfully',
        type: BuyLaterResponseDto 
    })
    @ApiParam({ name: 'id', description: 'Buy later entry ID' })
    async updateBuyLater(
        @Request() req: any,
        @Param('id') id: string,
        @Body() updateBuyLaterDto: UpdateBuyLaterDto
    ): Promise<BuyLaterResponseDto> {
        return this.buyLaterService.updateBuyLater(req.user.id, id, updateBuyLaterDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remove product from buy later list' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Product removed from buy later list successfully' 
    })
    @ApiParam({ name: 'id', description: 'Buy later entry ID' })
    async removeFromBuyLater(
        @Request() req: any,
        @Param('id') id: string
    ): Promise<{ message: string }> {
        await this.buyLaterService.removeFromBuyLater(req.user.id, id);
        return { message: 'Product removed from buy later list successfully' };
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get buy later statistics' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Buy later statistics retrieved successfully' 
    })
    async getBuyLaterStats(@Request() req: any) {
        return this.buyLaterService.getBuyLaterStats(req.user.id);
    }

    // Admin endpoints for monitoring
    @Get('admin/stats')
    @ApiOperation({ summary: 'Get global buy later statistics (Admin)' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Global buy later statistics retrieved successfully' 
    })
    async getGlobalBuyLaterStats() {
        return this.buyLaterService.getBuyLaterStats(); // No userId for global stats
    }

    @Post('check-price-drops')
    @ApiOperation({ summary: 'Manually trigger price drop check (Admin)' })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Price drop check completed successfully' 
    })
    async triggerPriceDropCheck() {
        await this.buyLaterService.checkPriceDrops();
        return { message: 'Price drop check completed successfully' };
    }
}