"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CleanupProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleanupProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let CleanupProcessor = CleanupProcessor_1 = class CleanupProcessor extends bullmq_1.WorkerHost {
    constructor(prisma) {
        super();
        this.prisma = prisma;
        this.logger = new common_1.Logger(CleanupProcessor_1.name);
    }
    async process(job) {
        this.logger.log(`Processing cleanup job: ${job.data.type}`);
        try {
            const { type } = job.data;
            switch (type) {
                case 'expiredBanners':
                    return await this.cleanupExpiredBanners();
                case 'expiredCoupons':
                    return await this.cleanupExpiredCoupons();
                case 'abandonedCheckouts':
                    return await this.cleanupAbandonedCheckouts();
                default:
                    throw new Error(`Unknown cleanup type: ${type}`);
            }
        }
        catch (error) {
            this.logger.error(`Cleanup job failed: ${error.message}`, error.stack);
            throw error;
        }
    }
    async cleanupExpiredBanners() {
        const now = new Date();
        const result = await this.prisma.banner.updateMany({
            where: {
                endDate: { lt: now },
                isActive: true,
            },
            data: {
                isActive: false,
            },
        });
        this.logger.log(`Deactivated ${result.count} expired banners`);
        return { success: true, deactivated: result.count };
    }
    async cleanupExpiredCoupons() {
        const now = new Date();
        const result = await this.prisma.coupon.updateMany({
            where: {
                validUntil: { lt: now },
                isActive: true,
            },
            data: {
                isActive: false,
            },
        });
        this.logger.log(`Deactivated ${result.count} expired coupons`);
        return { success: true, deactivated: result.count };
    }
    async cleanupAbandonedCheckouts() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const result = await this.prisma.abandonedCheckout.deleteMany({
            where: {
                abandonedAt: { lt: thirtyDaysAgo },
                status: 'DROPPED',
            },
        });
        this.logger.log(`Deleted ${result.count} old abandoned checkouts`);
        return { success: true, deleted: result.count };
    }
};
exports.CleanupProcessor = CleanupProcessor;
exports.CleanupProcessor = CleanupProcessor = CleanupProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('cleanup', {
        concurrency: 1,
    }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CleanupProcessor);
//# sourceMappingURL=cleanup.processor.js.map