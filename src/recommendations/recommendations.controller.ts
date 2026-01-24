import { Controller, Get, Post, Body, UseGuards, Req, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EcommerceEventsService } from './ecommerce-events.service';
import { TrackProductEventDto } from './dto/events.dto';
import { BowRecommendationEngine } from '../bow/bow-recommendation.service';
import { CartIntelligenceService } from '../bow/cart-intelligence.service';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private events: EcommerceEventsService,
    private engine: BowRecommendationEngine,
    private cartIntel: CartIntelligenceService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized product recommendations (ecommerce-style)' })
  async getMyRecommendations(@Req() req, @Query('limit') limit?: string) {
    const n = limit ? Math.max(1, Math.min(50, parseInt(limit, 10))) : 10;
    return this.engine.getSmartRecommendations(req.user.id, n);
  }

  @Get('me/cart-analysis')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cart analysis signals (thresholds/hesitation/bundle/price sensitivity)' })
  async getMyCartAnalysis(@Req() req) {
    const signals = await this.cartIntel.analyzeCart(req.user.id);
    return { signals };
  }

  @Post('events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track a product event (view/click/etc.) for recommendations' })
  async trackEvent(@Req() req, @Body() dto: TrackProductEventDto) {
    await this.events.track({
      userId: req.user.id,
      type: dto.type,
      source: dto.source,
      productId: dto.productId,
      variantId: dto.variantId,
      quantity: dto.quantity,
    });
    return { success: true };
  }
}

