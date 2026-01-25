import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchScoringService } from './search-scoring.service';
import { TrendingService } from './trending.service';
import { AutocompleteService } from './autocomplete.service';
import { ElasticsearchModule } from './elasticsearch.module';
import { BullModule } from '@nestjs/bullmq';
import { SearchSyncProcessor } from './search-sync.processor';
import { SharedModule } from '../shared/shared.module';
import { BowModule } from '../bow/bow.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';


@Module({
  imports: [
    SharedModule,
    ElasticsearchModule,
    BowModule,
    RecommendationsModule,
    BullModule.registerQueue({
      name: 'search-sync',
    }),
  ],
  controllers: [SearchController],
  providers: [
    SearchService,
    SearchScoringService,
    SearchSyncProcessor,
    TrendingService,
    AutocompleteService,
  ],
  exports: [SearchService, TrendingService, AutocompleteService]
})
export class SearchModule { }
