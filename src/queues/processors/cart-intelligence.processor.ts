import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CartIntelligenceService } from '../../bow/cart-intelligence.service';
import { BowAutoActionService } from '../../bow/bow-auto-action.service';
import { RecommendationStrategyService } from '../../bow/recommendation-strategy.service';

export interface CartIntelligenceJobData {
    userId: string;
    trigger: 'cart_update' | 'checkout_view' | 'manual';
    cartValue?: number;
    itemCount?: number;
}

@Injectable()
@Processor('cart-intelligence')
export class CartIntelligenceProcessor extends WorkerHost {
    private readonly logger = new Logger(CartIntelligenceProcessor.name);

    constructor(
        private cartIntelligenceService: CartIntelligenceService,
        private bowAutoActionService: BowAutoActionService,
        private recommendationStrategyService: RecommendationStrategyService,
    ) {
        super();
    }

    async process(job: Job<CartIntelligenceJobData>): Promise<void> {
        const { userId, trigger } = job.data;

        this.logger.log(`Processing cart intelligence for user ${userId}, trigger: ${trigger}`);

        try {
            // 1. Analyze cart for signals
            const signals = await this.cartIntelligenceService.analyzeCart(userId);

            if (signals.length === 0) {
                this.logger.debug(`No actionable signals for user ${userId}`);
                return;
            }

            // 2. Prioritize and filter signals
            const prioritizedSignals = this.prioritizeSignals(signals);

            // 3. Generate strategic recommendations
            const cartSnapshot = await this.getCartSnapshot(userId);
            if (cartSnapshot) {
                const strategies = await this.recommendationStrategyService.getStrategicRecommendations(userId, cartSnapshot);

                // Cache strategies for frontend
                await this.recommendationStrategyService.cacheStrategyResult(userId, strategies);
            }

            // 4. Execute automatic actions based on signals (limited to prevent spam)
            let actionsExecuted = 0;
            const maxActions = trigger === 'checkout_view' ? 2 : 1; // More actions on checkout view

            for (const signal of prioritizedSignals) {
                if (actionsExecuted >= maxActions) break;

                const actionExecuted = await this.executeSignalAction(userId, signal);
                if (actionExecuted) {
                    actionsExecuted++;
                    this.logger.log(`Executed auto-action for signal ${signal.type} (${signal.severity}) for user ${userId}`);
                }
            }

            // 5. Cache signals for frontend consumption
            await this.cartIntelligenceService.processSignals(userId, signals);

            this.logger.log(`Completed cart intelligence processing for user ${userId}: ${signals.length} signals, ${actionsExecuted} actions`);

        } catch (error) {
            this.logger.error(`Cart intelligence processing failed for user ${userId}: ${error.message}`, error.stack);
            throw error; // Re-throw for BullMQ retry logic
        }
    }

    /**
     * Prioritize signals by type and severity
     */
    private prioritizeSignals(signals: any[]): any[] {
        const priorityOrder = {
            'HESITATION': 5,
            'THRESHOLD_NEAR': 4,
            'BUNDLE_OPPORTUNITY': 3,
            'PRICE_SENSITIVITY': 2,
            'REPEAT_REMOVAL': 1,
            'GIFT_ELIGIBLE': 1
        };

        const severityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };

        return signals.sort((a, b) => {
            const aPriority = priorityOrder[a.type as keyof typeof priorityOrder] || 0;
            const bPriority = priorityOrder[b.type as keyof typeof priorityOrder] || 0;

            if (aPriority !== bPriority) return bPriority - aPriority;

            const aSeverity = severityOrder[a.severity as keyof typeof severityOrder] || 0;
            const bSeverity = severityOrder[b.severity as keyof typeof severityOrder] || 0;

            return bSeverity - aSeverity;
        });
    }

    /**
     * Get cart snapshot for strategy generation
     */
    private async getCartSnapshot(userId: string): Promise<any | null> {
        try {
            // Get cart from cart service - this would need proper injection
            // For now, we'll use a simplified version
            const cart = await (this as any).getCartService?.getCart(userId);

            if (!cart || !cart.items?.length) {
                return null;
            }

            return {
                userId,
                cartValue: cart.totalAmount || 0,
                itemCount: cart.totalItems || 0,
                categories: [...new Set(cart.items.map((i: any) => String(i.product?.categoryId || '')))].filter(Boolean),
                lastModified: new Date()
            };
        } catch (error) {
            this.logger.error(`Failed to get cart snapshot for user ${userId}: ${error.message}`);
            return null;
        }
    }

    /**
     * Execute automatic action based on signal
     */
    private async executeSignalAction(userId: string, signal: any): Promise<boolean> {
        try {
            switch (signal.type) {
                case 'THRESHOLD_NEAR':
                    return await this.executeThresholdAction(userId, signal);

                case 'BUNDLE_OPPORTUNITY':
                    return await this.executeBundleAction(userId, signal);

                case 'GIFT_ELIGIBLE':
                    return await this.executeGiftAction(userId, signal);

                case 'HESITATION':
                    return await this.executeHesitationAction(userId, signal);

                default:
                    return false;
            }
        } catch (error) {
            this.logger.error(`Signal action execution failed: ${error.message}`);
            return false;
        }
    }

    private async executeThresholdAction(userId: string, signal: any): Promise<boolean> {
        const result = await this.bowAutoActionService.executeAutoAction({
            actionType: ('ADD_TO_CART' as any),
            userId,
            reason: `Threshold push: ${signal.reason}`,
            strategy: 'THRESHOLD_PUSH'
        });
        return result.success;
    }

    private async executeBundleAction(userId: string, signal: any): Promise<boolean> {
        const result = await this.bowAutoActionService.executeAutoAction({
            actionType: ('SUGGEST_BUNDLE' as any),
            userId,
            reason: `Bundle opportunity: ${signal.reason}`,
            strategy: 'BUNDLE_DISCOUNT'
        });
        return result.success;
    }

    private async executeGiftAction(userId: string, signal: any): Promise<boolean> {
        const result = await this.bowAutoActionService.executeAutoAction({
            actionType: ('SUGGEST_GIFT' as any),
            userId,
            reason: `Gift eligibility: ${signal.reason}`,
            strategy: 'THRESHOLD_PUSH'
        });
        return result.success;
    }

    private async executeHesitationAction(userId: string, signal: any): Promise<boolean> {
        // For high hesitation, suggest upsell items
        if (signal.severity === 'HIGH') {
            const result = await this.bowAutoActionService.executeAutoAction({
                actionType: ('SUGGEST_UPSELL' as any),
                userId,
                reason: `High hesitation: ${signal.reason}`,
                strategy: 'RISK_REASSURANCE'
            });
            return result.success;
        }
        return false;
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job<CartIntelligenceJobData>) {
        this.logger.log(`Cart intelligence job completed for user ${job.data.userId}`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<CartIntelligenceJobData>, err: Error) {
        this.logger.error(`Cart intelligence job failed for user ${job.data.userId}: ${err.message}`);
    }

    @OnWorkerEvent('stalled')
    onStalled(jobId: number, prev: string) {
        this.logger.warn(`Cart intelligence job ${jobId} stalled`);
    }
}