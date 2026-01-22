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
import { RecommendationService } from './recommendation.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { CartModule } from '../cart/cart.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
    imports: [CartModule, PrismaModule, InventoryModule],
    controllers: [BowController],
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
        RecommendationService,
        AdminAnalyticsService
    ],
    exports: [BowService, AdminAnalyticsService]
})
export class BowModule { }
