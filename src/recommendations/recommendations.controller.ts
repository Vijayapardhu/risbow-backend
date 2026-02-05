import { Controller, Get, Post, Body, UseGuards, Req, Query, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EcommerceEventsService } from './ecommerce-events.service';
import { TrackProductEventDto } from './dto/events.dto';
import { BowRecommendationEngine } from '../bow/bow-recommendation.service';
import { CartIntelligenceService } from '../bow/cart-intelligence.service';
import { ProductSuggestionsService } from './product-suggestions.service';
import { RecommendationsService } from './recommendations.service';
import { TrackInteractionDto } from './dto/track-interaction.dto';

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private events: EcommerceEventsService,
    private engine: BowRecommendationEngine,
    private cartIntel: CartIntelligenceService,
    private suggestions: ProductSuggestionsService,
    private recommendationsService: RecommendationsService,
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

  // ===== NEW INTELLIGENT RECOMMENDATION ENDPOINTS =====

  @Get('for-you')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get personalized recommendations for logged-in user',
    description: 'Uses collaborative filtering, content-based recommendations, and user history to provide personalized product suggestions',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of recommendations (max 20)', example: 10 })
  async getPersonalizedRecommendations(
    @Req() req,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? Math.min(parseInt(limit, 10), 20) : 10;
    return this.recommendationsService.getPersonalizedRecommendations(req.user.id, { limit: n });
  }

  @Get('similar/:productId')
  @ApiOperation({ 
    summary: 'Get similar products based on product attributes and user behavior',
    description: 'Returns products similar to the specified product using content-based and collaborative filtering',
  })
  @ApiParam({ name: 'productId', description: 'Product ID', example: 'prod_123abc' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of recommendations (max 20)', example: 10 })
  async getSimilarProductsById(
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? Math.min(parseInt(limit, 10), 20) : 10;
    return this.recommendationsService.getSimilarProducts(productId, { limit: n });
  }

  @Get('trending')
  @ApiOperation({ 
    summary: 'Get trending products based on recent user interactions',
    description: 'Returns products with high engagement in the last 7 days, weighted by recency and interaction type',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of recommendations (max 20)', example: 10 })
  async getTrendingProducts(@Query('limit') limit?: string) {
    const n = limit ? Math.min(parseInt(limit, 10), 20) : 10;
    return this.recommendationsService.getTrendingProducts({ limit: n });
  }

  @Get('frequently-bought-together/:productId')
  @ApiOperation({ 
    summary: 'Get products frequently bought together with the specified product',
    description: 'Analyzes order history to find products commonly purchased alongside the given product',
  })
  @ApiParam({ name: 'productId', description: 'Product ID', example: 'prod_123abc' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of recommendations (max 20)', example: 5 })
  async getFrequentlyBoughtTogether(
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? Math.min(parseInt(limit, 10), 20) : 5;
    return this.recommendationsService.getFrequentlyBoughtTogether(productId, { limit: n });
  }

  @Post('track-interaction')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Track user interaction with a product',
    description: 'Records user interactions (view, add to cart, purchase, wishlist) for improving recommendations',
  })
  async trackInteraction(@Req() req, @Body() dto: TrackInteractionDto) {
    await this.recommendationsService.trackInteraction(
      req.user.id,
      dto.productId,
      dto.interactionType,
      dto.metadata,
    );
    return { success: true };
  }
}

