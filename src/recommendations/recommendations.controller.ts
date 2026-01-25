import { Controller, Get, Post, Body, UseGuards, Req, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EcommerceEventsService } from './ecommerce-events.service';
import { TrackProductEventDto } from './dto/events.dto';
import { BowRecommendationEngine } from '../bow/bow-recommendation.service';
import { CartIntelligenceService } from '../bow/cart-intelligence.service';
import { ProductSuggestionsService } from './product-suggestions.service';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private events: EcommerceEventsService,
    private engine: BowRecommendationEngine,
    private cartIntel: CartIntelligenceService,
    private suggestions: ProductSuggestionsService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized product recommendations (ecommerce-style)' })
  async getMyRecommendations(@Req() req, @Query('limit') limit?: string) {
    const n = limit ? Math.max(1, Math.min(50, parseInt(limit, 10))) : 10;
    return this.engine.getSmartRecommendations(req.user.id, n);
  }

  @Get('home')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get home screen product suggestions (shared engine, location-aware)' })
  async getHomeSuggestions(
    @Req() req,
    @Query('limit') limit?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('pincode') pincode?: string,
    @Query('region') region?: string,
  ) {
    const n = limit ? Math.max(1, Math.min(50, parseInt(limit, 10))) : 10;
    const la = lat != null ? Number(lat) : undefined;
    const ln = lng != null ? Number(lng) : undefined;
    const location = Number.isFinite(la as any) && Number.isFinite(ln as any) ? { lat: la as number, lng: ln as number, pincode } : undefined;
    return this.suggestions.suggestHome(req.user.id, { limit: n, location, region });
  }

  @Get('similar')
  @ApiOperation({ summary: 'Get PDP similar products (category/tags/co-purchase, location-aware)' })
  async getSimilar(
    @Query('productId') productId: string,
    @Query('limit') limit?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('pincode') pincode?: string,
    @Query('region') region?: string,
  ) {
    const n = limit ? Math.max(1, Math.min(50, parseInt(limit, 10))) : 10;
    const la = lat != null ? Number(lat) : undefined;
    const ln = lng != null ? Number(lng) : undefined;
    const location = Number.isFinite(la as any) && Number.isFinite(ln as any) ? { lat: la as number, lng: ln as number, pincode } : undefined;
    return this.suggestions.suggestSimilar(productId, { limit: n, location, region });
  }

  @Get('cart')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cart suggestions (co-purchase + category backfill, location-aware)' })
  async getCartSuggestions(
    @Req() req,
    @Query('limit') limit?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('pincode') pincode?: string,
    @Query('region') region?: string,
  ) {
    const n = limit ? Math.max(1, Math.min(50, parseInt(limit, 10))) : 10;
    const la = lat != null ? Number(lat) : undefined;
    const ln = lng != null ? Number(lng) : undefined;
    const location = Number.isFinite(la as any) && Number.isFinite(ln as any) ? { lat: la as number, lng: ln as number, pincode } : undefined;
    return this.suggestions.suggestCart(req.user.id, { limit: n, location, region });
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

