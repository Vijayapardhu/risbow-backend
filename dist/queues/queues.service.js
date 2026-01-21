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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var QueuesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueuesService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
let QueuesService = QueuesService_1 = class QueuesService {
    constructor(analyticsQueue, notificationsQueue, ordersQueue, cleanupQueue) {
        this.analyticsQueue = analyticsQueue;
        this.notificationsQueue = notificationsQueue;
        this.ordersQueue = ordersQueue;
        this.cleanupQueue = cleanupQueue;
        this.logger = new common_1.Logger(QueuesService_1.name);
    }
    async addBannerAnalytics(job) {
        try {
            await this.analyticsQueue.add('banner-event', job, {
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            });
            this.logger.debug(`Queued banner ${job.eventType}: ${job.bannerId}`);
        }
        catch (error) {
            this.logger.error(`Failed to queue banner analytics: ${error.message}`);
        }
    }
    async addNotification(job) {
        try {
            await this.notificationsQueue.add('send-notification', job, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
            });
            this.logger.debug(`Queued notification: ${job.title}`);
        }
        catch (error) {
            this.logger.error(`Failed to queue notification: ${error.message}`);
        }
    }
    async addOrderProcessing(job) {
        try {
            await this.ordersQueue.add(job.action, job, {
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            });
            this.logger.debug(`Queued order ${job.action}: ${job.orderId}`);
        }
        catch (error) {
            this.logger.error(`Failed to queue order processing: ${error.message}`);
        }
    }
    async scheduleCleanup(job) {
        try {
            await this.cleanupQueue.add(job.type, job, {
                attempts: 1,
                removeOnComplete: true,
            });
            this.logger.log(`Scheduled cleanup: ${job.type}`);
        }
        catch (error) {
            this.logger.error(`Failed to schedule cleanup: ${error.message}`);
        }
    }
    async getQueueStats() {
        const [analytics, notifications, orders, cleanup] = await Promise.all([
            this.analyticsQueue.getJobCounts(),
            this.notificationsQueue.getJobCounts(),
            this.ordersQueue.getJobCounts(),
            this.cleanupQueue.getJobCounts(),
        ]);
        return {
            analytics,
            notifications,
            orders,
            cleanup,
        };
    }
};
exports.QueuesService = QueuesService;
exports.QueuesService = QueuesService = QueuesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('analytics')),
    __param(1, (0, bullmq_1.InjectQueue)('notifications')),
    __param(2, (0, bullmq_1.InjectQueue)('orders')),
    __param(3, (0, bullmq_1.InjectQueue)('cleanup')),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue,
        bullmq_2.Queue])
], QueuesService);
//# sourceMappingURL=queues.service.js.map