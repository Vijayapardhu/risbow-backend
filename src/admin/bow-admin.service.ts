import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';
import { QueuesService } from '../queues/queues.service';
import { BowAutoActionService } from '../bow/bow-auto-action.service';

@Injectable()
export class BowAdminService {
    private readonly logger = new Logger(BowAdminService.name);

    // Kill switch keys
    private readonly GLOBAL_KILL_SWITCH = 'bow:kill_switch:global';
    private readonly ACTION_TYPE_KILL_SWITCH = 'bow:kill_switch:action_type:';
    private readonly CATEGORY_KILL_SWITCH = 'bow:kill_switch:category:';
    private readonly VENDOR_KILL_SWITCH = 'bow:kill_switch:vendor:';

    constructor(
        private prisma: PrismaService,
        private redis: RedisService,
        private queuesService: QueuesService,
        private bowAutoActionService: BowAutoActionService,
    ) {}

    /**
     * Get comprehensive Bow analytics overview
     */
    async getAnalyticsOverview(startDate: Date, endDate: Date) {
        const [
            actionStats,
            revenueStats,
            userStats,
            queueStats
        ] = await Promise.all([
            this.getActionAnalytics(startDate, endDate),
            this.getRevenueAnalytics(startDate, endDate),
            this.getUserEngagementStats(startDate, endDate),
            this.getQueueStatus()
        ]);

        return {
            period: { startDate, endDate },
            actions: actionStats,
            revenue: revenueStats,
            users: userStats,
            system: {
                queueStatus: queueStats,
                killSwitches: await this.getKillSwitchStatus()
            }
        };
    }

    /**
     * Get detailed action analytics
     */
    async getActionAnalytics(startDate: Date, endDate: Date) {
        const whereClause: any = {
            createdAt: { gte: startDate, lte: endDate }
        };

        const [
            totalActions,
            actionsByType,
            reversalStats,
            dailyBreakdown
        ] = await Promise.all([
            (this.prisma as any).bowActionLog.count({ where: whereClause }),
            (this.prisma as any).bowActionLog.groupBy({
                by: ['actionType'],
                where: whereClause,
                _count: { id: true },
                _sum: { attributedRevenue: true }
            }),
            (this.prisma as any).bowActionLog.aggregate({
                where: { ...whereClause, autoReversed: true },
                _count: { id: true }
            }),
            this.getDailyActionBreakdown(startDate, endDate)
        ]);

        const acceptanceRate = totalActions > 0 ? (totalActions - reversalStats._count.id) / totalActions : 0;

        return {
            totalActions,
            acceptanceRate,
            reversalRate: reversalStats._count.id / totalActions || 0,
            actionsByType,
            dailyBreakdown
        };
    }

    /**
     * Get strategy performance analytics
     */
    async getStrategyAnalytics(startDate: Date, endDate: Date) {
        const strategies = [
            'THRESHOLD_PUSH',
            'BUNDLE_DISCOUNT',
            'COMPLETE_THE_LOOK',
            'RISK_REASSURANCE',
            'SCARCITY',
            'SOCIAL_PROOF'
        ];

        const strategyStats = await Promise.all(
            strategies.map(strategy => this.getStrategyPerformance(strategy, startDate, endDate))
        );

        return strategyStats;
    }

    /**
     * Get revenue attribution analytics
     */
    async getRevenueAnalytics(startDate: Date, endDate: Date) {
        const revenueData = await (this.prisma as any).bowActionLog.aggregate({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                attributedRevenue: { not: null }
            },
            _sum: { attributedRevenue: true },
            _count: { id: true }
        });

        const conversionActions = await (this.prisma as any).bowActionLog.count({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                attributedRevenue: { gt: 0 }
            }
        });

        return {
            totalAttributedRevenue: revenueData._sum.attributedRevenue || 0,
            conversionActions,
            averageRevenuePerAction: revenueData._count.id > 0
                ? (revenueData._sum.attributedRevenue || 0) / revenueData._count.id
                : 0
        };
    }

    /**
     * Get user engagement statistics
     */
    private async getUserEngagementStats(startDate: Date, endDate: Date) {
        const [
            activeUsers,
            newUsers,
            repeatUsers
        ] = await Promise.all([
            (this.prisma as any).bowActionLog.findMany({
                where: { createdAt: { gte: startDate, lte: endDate } },
                select: { userId: true },
                distinct: ['userId']
            }),
            this.getNewUserCount(startDate, endDate),
            this.getRepeatUserCount(startDate, endDate)
        ]);

        return {
            activeUsers: activeUsers.length,
            newUsers,
            repeatUsers,
            engagementRate: activeUsers.length > 0 ? repeatUsers / activeUsers.length : 0
        };
    }

    /**
     * Get Bow configuration settings
     */
    async getBowSettings() {
        // Get settings from Redis/config
        const settings = {
            globalEnabled: !(await this.redis.get(this.GLOBAL_KILL_SWITCH)),
            maxAutoAddPrice: await this.redis.get('bow:settings:max_auto_add_price') || '499',
            actionCooldownMinutes: await this.redis.get('bow:settings:action_cooldown') || '1440',
            dailyActionLimit: await this.redis.get('bow:settings:daily_limit') || '3',
            restrictedCategories: [], // Simplified - would need Redis set operations
            enabledActionTypes: await this.getEnabledActionTypes(),
            experiments: await this.getExperimentConfigs()
        };

        return settings;
    }

    /**
     * Update Bow configuration settings
     */
    async updateBowSettings(settings: any) {
        const updates: any[] = [];

        if (settings.maxAutoAddPrice !== undefined) {
            await this.redis.set('bow:settings:max_auto_add_price', settings.maxAutoAddPrice.toString(), 86400);
        }

        if (settings.actionCooldownMinutes !== undefined) {
            await this.redis.set('bow:settings:action_cooldown', settings.actionCooldownMinutes.toString(), 86400);
        }

        if (settings.dailyActionLimit !== undefined) {
            await this.redis.set('bow:settings:daily_limit', settings.dailyActionLimit.toString(), 86400);
        }

        // Simplified category restrictions - would need more complex storage

        await Promise.all(updates);

        return { message: 'Bow settings updated successfully' };
    }

    /**
     * Toggle specific action types on/off
     */
    async toggleActionType(actionType: string, enabled: boolean) {
        const key = `${this.ACTION_TYPE_KILL_SWITCH}${actionType}`;
        if (enabled) {
            await this.redis.del(key);
        } else {
            await this.redis.set(key, 'disabled', 86400);
        }

        return { message: `Action type ${actionType} ${enabled ? 'enabled' : 'disabled'}` };
    }

    /**
     * Toggle Bow actions for specific categories
     */
    async toggleCategoryActions(categoryId: string, enabled: boolean) {
        const key = `${this.CATEGORY_KILL_SWITCH}${categoryId}`;
        if (enabled) {
            await this.redis.del(key);
        } else {
            await this.redis.set(key, 'disabled', 86400);
        }

        return { message: `Category ${categoryId} actions ${enabled ? 'enabled' : 'disabled'}` };
    }

    /**
     * Toggle Bow actions for specific vendors
     */
    async toggleVendorActions(vendorId: string, enabled: boolean) {
        const key = `${this.VENDOR_KILL_SWITCH}${vendorId}`;
        if (enabled) {
            await this.redis.del(key);
        } else {
            await this.redis.set(key, 'disabled', 86400);
        }

        return { message: `Vendor ${vendorId} actions ${enabled ? 'enabled' : 'disabled'}` };
    }

    /**
     * Emergency shutdown of all Bow auto-actions
     */
    async emergencyShutdown() {
        await this.redis.set(this.GLOBAL_KILL_SWITCH, 'shutdown', 86400);
        this.logger.warn('EMERGENCY SHUTDOWN: All Bow auto-actions disabled');

        return {
            message: 'Emergency shutdown activated - all Bow auto-actions disabled',
            timestamp: new Date()
        };
    }

    /**
     * Restart Bow auto-actions after emergency shutdown
     */
    async emergencyRestart() {
        await this.redis.del(this.GLOBAL_KILL_SWITCH);
        this.logger.warn('EMERGENCY RESTART: Bow auto-actions re-enabled');

        return {
            message: 'Bow auto-actions re-enabled',
            timestamp: new Date()
        };
    }

    /**
     * Get BullMQ queue status
     */
    async getQueueStatus() {
        return this.queuesService.getQueueStats();
    }

    /**
     * Get Bow status for specific user
     */
    async getUserBowStatus(userId: string) {
        const [
            recentActions,
            cachedSignals,
            cachedStrategies,
            preferences
        ] = await Promise.all([
            (this.prisma as any).bowActionLog.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 10
            }),
            this.redis.get(`cart:signals:${userId}`),
            this.redis.get(`bow:strategies:${userId}`),
            (this.prisma as any).userPreferenceProfile.findUnique({
                where: { userId }
            })
        ]);

        return {
            userId,
            recentActions: recentActions.length,
            activeSignals: cachedSignals ? JSON.parse(cachedSignals).length : 0,
            cachedStrategies: cachedStrategies ? JSON.parse(cachedStrategies).length : 0,
            hasPreferences: !!preferences,
            lastActivity: recentActions[0]?.createdAt || null
        };
    }

    /**
     * Reset Bow state for specific user (for testing/debugging)
     */
    async resetUserBowState(userId: string) {
        const keysToDelete = [
            `cart:signals:${userId}`,
            `bow:strategies:${userId}`,
            `bow:cooldown:${userId}:*`,
            `bow:daily:${userId}:*`
        ];

        // Note: Redis DEL with pattern not directly supported, would need individual keys
        // For now, we'll clear what we can
        await this.redis.del(`cart:signals:${userId}`);
        await this.redis.del(`bow:strategies:${userId}`);

        return { message: `Bow state reset for user ${userId}` };
    }

    /**
     * Get A/B testing experiments
     */
    async getExperiments() {
        // Placeholder for experiment management
        return {
            activeExperiments: [],
            message: 'Experiment management not yet implemented'
        };
    }

    /**
     * Update A/B testing experiment
     */
    async updateExperiment(experimentId: string, config: any) {
        // Placeholder for experiment updates
        return { message: 'Experiment update not yet implemented' };
    }

    /**
     * Get system health status
     */
    async getSystemHealth() {
        const [
            queueStatus,
            redisStatus,
            dbStatus
        ] = await Promise.all([
            this.getQueueStatus(),
            this.checkRedisHealth(),
            this.checkDatabaseHealth()
        ]);

        return {
            timestamp: new Date(),
            services: {
                redis: redisStatus,
                database: dbStatus,
                queues: queueStatus
            },
            killSwitches: await this.getKillSwitchStatus()
        };
    }

    // Helper methods

    private async getStrategyPerformance(strategy: string, startDate: Date, endDate: Date) {
        // Implementation would analyze RecommendationEvent table
        return {
            strategy,
            shown: 0,
            accepted: 0,
            acceptanceRate: 0,
            revenueImpact: 0
        };
    }

    private async getDailyActionBreakdown(startDate: Date, endDate: Date) {
        // Group actions by date
        const actions = await (this.prisma as any).bowActionLog.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate }
            },
            select: {
                createdAt: true,
                actionType: true
            }
        });

        const dailyStats = {};
        actions.forEach((action: any) => {
            const date = action.createdAt.toISOString().split('T')[0];
            if (!(dailyStats as any)[date]) {
                (dailyStats as any)[date] = { total: 0, byType: {} };
            }
            (dailyStats as any)[date].total++;
            (dailyStats as any)[date].byType[action.actionType] = ((dailyStats as any)[date].byType[action.actionType] || 0) + 1;
        });

        return dailyStats;
    }

    private async getNewUserCount(startDate: Date, endDate: Date) {
        // Users who had their first Bow action in this period
        const newUsers = await (this.prisma as any).bowActionLog.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate }
            },
            select: { userId: true },
            distinct: ['userId']
        });

        // This is a simplified version - ideally we'd check if they had actions before startDate
        return newUsers.length;
    }

    private async getRepeatUserCount(startDate: Date, endDate: Date) {
        // Users with multiple actions in the period
        const userActionCounts = await (this.prisma as any).bowActionLog.groupBy({
            by: ['userId'],
            where: {
                createdAt: { gte: startDate, lte: endDate }
            },
            _count: { id: true },
            having: { id: { _count: { gt: 1 } } }
        });

        return userActionCounts.length;
    }

    private async getEnabledActionTypes() {
        const actionTypes = [
            'ADD_TO_CART',
            'SUGGEST_BUNDLE',
            'SUGGEST_GIFT',
            'SUGGEST_UPSELL',
            'REMOVE_SUGGESTION'
        ];

        const enabledTypes = [];
        for (const type of actionTypes) {
            const isDisabled = await this.redis.get(`${this.ACTION_TYPE_KILL_SWITCH}${type}`);
            if (!isDisabled) {
                enabledTypes.push(type);
            }
        }

        return enabledTypes;
    }

    private async getExperimentConfigs() {
        // Placeholder
        return {};
    }

    private async getKillSwitchStatus() {
        const globalKill = await this.redis.get(this.GLOBAL_KILL_SWITCH);
        // Detailed per-action kill switch status (SCAN-based via RedisService.keys)
        const actionKeys = await this.redis.keys(`${this.ACTION_TYPE_KILL_SWITCH}*`).catch(() => []);
        const actionStatuses: Record<string, boolean> = {};

        for (const key of actionKeys) {
            const actionType = key.replace(this.ACTION_TYPE_KILL_SWITCH, '');
            const value = await this.redis.get(key);
            // Convention: presence of key means disabled; value can be 'true' or reason
            actionStatuses[actionType] = !!value;
        }

        return {
            global: !!globalKill,
            actions: actionStatuses,
        };
    }

    private async checkRedisHealth() {
        try {
            await this.redis.set('health_check', 'ok', 10);
            return { status: 'healthy', latency: 0 };
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }

    private async checkDatabaseHealth() {
        try {
            await (this.prisma as any).$queryRaw`SELECT 1`;
            return { status: 'healthy' };
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }
}