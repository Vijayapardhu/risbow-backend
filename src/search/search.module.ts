import { Module, forwardRef, DynamicModule } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchScoringService } from './search-scoring.service';
import { TrendingService } from './trending.service';
import { AutocompleteService } from './autocomplete.service';
import { ElasticsearchModule } from './elasticsearch.module';
import { BullModule } from '@nestjs/bullmq';
import { SearchSyncProcessor } from './search-sync.processor';
import { BowModule } from '../bow/bow.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { CatalogGroupingService } from '../catalog/catalog-grouping.service';
import { PrismaService } from '../prisma/prisma.service';

// Check if Redis is disabled - prioritize DISABLE_REDIS flag
const isRedisDisabled = () =>
  process.env.DISABLE_REDIS === 'true' ||
  process.env.DISABLE_REDIS === '1' ||
  process.env.NODE_ENV === 'test' ||
  !process.env.REDIS_HOST;

@Module({
  imports: [
    ElasticsearchModule,
    forwardRef(() => BowModule),
    forwardRef(() => RecommendationsModule),
    // Only register Bull queue when Redis is enabled
    ...(isRedisDisabled()
      ? []
      : [BullModule.registerQueue({ name: 'search-sync' })]),
  ],
  controllers: [SearchController],
  providers: [
    SearchService,
    SearchScoringService,
    // Only register processor when Redis is enabled
    ...(isRedisDisabled() ? [] : [SearchSyncProcessor]),
    TrendingService,
    AutocompleteService,
    CatalogGroupingService,
    PrismaService,
  ],
  exports: [SearchService, TrendingService, AutocompleteService]
})
export class SearchModule { }
