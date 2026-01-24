import { Module } from '@nestjs/common';
import { BowService } from './bow.service';
import { BowController } from './bow.controller';
import { BowIntentService } from './bow-intent.service';
import { BowContextService } from './bow-context.service';
import { BowActionService } from './bow-action.service';
import { BowPolicyService } from './bow-policy.service';
import { BowSessionService } from './bow-session.service';
import { BowNLPService } from './bow-nlp.service';
import { BowOptimizationService } from './bow-optimization.service';
import { BowRecommendationEngine } from './bow-recommendation.service';
import { BowPriceTracker } from './bow-price-tracker.service';
import { BowOutfitRecommender } from './bow-outfit-recommender.service';
import { BowSmartReminders } from './bow-smart-reminders.service';
import { BowRoomIntelligenceService } from './bow-room-intelligence.service';
import { RecommendationService } from './recommendation.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { CartIntelligenceService } from './cart-intelligence.service';
import { BowAutoActionService } from './bow-auto-action.service';
import { RecommendationStrategyService } from './recommendation-strategy.service';
import { BowRevenueService } from './bow-revenue.service';
import { BowLlmRerankerService } from './bow-llm-reranker.service';
import { CartModule } from '../cart/cart.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CouponsModule } from '../coupons/coupons.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { RecommendationsController } from '../recommendations/recommendations.controller';

@Module({
    imports: [CartModule, PrismaModule, InventoryModule, CouponsModule, RecommendationsModule],
    controllers: [BowController, RecommendationsController],
    providers: [
        BowService,
        BowIntentService,
        BowContextService,
        BowActionService,
        BowPolicyService,
        BowSessionService,
        BowNLPService,
        BowOptimizationService,
        BowRecommendationEngine,
        BowPriceTracker,
        BowOutfitRecommender,
        BowSmartReminders,
        BowRoomIntelligenceService,
        RecommendationService,
        AdminAnalyticsService,
        CartIntelligenceService,
        BowAutoActionService,
        RecommendationStrategyService,
        BowRevenueService,
        BowLlmRerankerService
    ],
    exports: [BowService, BowRoomIntelligenceService, AdminAnalyticsService, BowAutoActionService, BowRecommendationEngine, CartIntelligenceService, RecommendationStrategyService, BowRevenueService]
})
export class BowModule { }
