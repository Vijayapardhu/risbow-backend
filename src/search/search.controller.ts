import { Controller, Get, Post, Query, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { TrendingService } from './trending.service';
import { AutocompleteService } from './autocomplete.service';
import { 
  SearchQueryDto, 
  AutocompleteDto, 
  TrendingQueryDto, 
  MissAnalyticsQueryDto,
  ResolveMissDto,
} from './dto/search.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly trendingService: TrendingService,
    private readonly autocompleteService: AutocompleteService,
  ) { }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Search products with filters and intent detection' })
  @ApiResponse({ status: 200, description: 'Search results with metadata' })
  async search(@Query() query: SearchQueryDto, @Request() req) {
    return this.searchService.searchProducts(query, req.user?.id, query.region || 'global');
  }

  @Get('suggest')
  @ApiOperation({ summary: 'Get intelligent autocomplete suggestions' })
  @ApiResponse({ status: 200, description: 'Array of autocomplete suggestions' })
  async suggest(@Query() query: AutocompleteDto) {
    return this.autocompleteService.getSuggestions(
      query.q, 
      query.limit || 10, 
      query.region || 'global'
    );
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get basic autocomplete suggestions (legacy)' })
  @ApiResponse({ status: 200, description: 'Array of product suggestions' })
  async suggestions(@Query() query: AutocompleteDto) {
    return this.searchService.getSuggestions(query.q);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending searches by region' })
  @ApiResponse({ 
    status: 200, 
    description: 'Array of trending queries with scores and trend direction' 
  })
  async getTrending(@Query() query: TrendingQueryDto) {
    return this.trendingService.getTrendingWithDelta(
      query.region || 'global',
      query.limit || 10
    );
  }

  @Get('trending/simple')
  @ApiOperation({ summary: 'Get simple trending searches (query and score only)' })
  @ApiResponse({ status: 200, description: 'Array of trending queries' })
  async getTrendingSimple(@Query('region') region: string) {
    return this.searchService.getTrendingSearches(region || 'global');
  }

  // ===== ADMIN ENDPOINTS =====

  @Get('admin/misses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get demand gaps (failed searches) - basic' })
  @ApiResponse({ status: 200, description: 'List of top search misses' })
  async getDemandGaps() {
    return this.searchService.getDemandGaps();
  }

  @Get('admin/miss/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get comprehensive search miss analytics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Detailed analytics including top misses, demand gaps by category, and conversion metrics' 
  })
  async getMissAnalytics(@Query() query: MissAnalyticsQueryDto) {
    return this.searchService.getMissAnalytics(query.period, query.limit);
  }

  @Post('admin/miss/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a search miss as resolved (product added)' })
  @ApiResponse({ status: 200, description: 'Miss marked as resolved' })
  async resolveMiss(@Body() dto: ResolveMissDto) {
    await this.searchService.resolveSearchMiss(dto.missId, dto.productId);
    return { success: true, message: 'Search miss resolved' };
  }

  @Get('admin/trending/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get trending searches with miss correlation' })
  @ApiResponse({ 
    status: 200, 
    description: 'Trending searches with supply/demand correlation' 
  })
  async getAdminTrending(@Query() query: TrendingQueryDto) {
    return this.searchService.getAdminTrendingAnalytics(
      query.region || 'global',
      query.limit || 20
    );
  }

  @Post('admin/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger bulk sync of all products to Elasticsearch' })
  @ApiResponse({ status: 200, description: 'Sync job queued' })
  async syncAll() {
    return this.searchService.syncAllProducts();
  }

  @Post('admin/trending/cleanup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cleanup old trending data' })
  @ApiResponse({ status: 200, description: 'Cleanup complete with deleted count' })
  async cleanupTrending(@Query('retentionDays') retentionDays?: number) {
    return this.trendingService.cleanupOldTrends(retentionDays || 30);
  }
}
