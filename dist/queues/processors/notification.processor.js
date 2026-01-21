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
var NotificationProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let NotificationProcessor = NotificationProcessor_1 = class NotificationProcessor extends bullmq_1.WorkerHost {
    constructor(prisma) {
        super();
        this.prisma = prisma;
        this.logger = new common_1.Logger(NotificationProcessor_1.name);
    }
    async process(job) {
        this.logger.debug(`Processing notification job: ${job.id}`);
        try {
            const { type, userId, title, body, targetAudience } = job.data;
            if (type === 'push') {
                await this.sendPushNotification(userId, title, body, targetAudience);
            }
            else if (type === 'email') {
                await this.sendEmailNotification(userId, title, body);
            }
            return { success: true, type, userId };
        }
        catch (error) {
            this.logger.error(`Notification job failed: ${error.message}`, error.stack);
            throw error;
        }
    }
    async sendPushNotification(userId, title, body, targetAudience) {
        if (userId) {
            await this.prisma.notification.create({
                data: {
                    userId,
                    title,
                    body,
                    type: 'PUSH',
                },
            });
            this.logger.log(`Push notification sent to user ${userId}`);
        }
        else if (targetAudience) {
            this.logger.log(`Broadcast push notification to ${targetAudience}`);
        }
    }
    async sendEmailNotification(userId, title, body) {
        if (!userId) {
            this.logger.warn('Email notification requires userId');
            return;
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
        });
        if (!user?.email) {
            this.logger.warn(`User ${userId} has no email address`);
            return;
        }
        this.logger.log(`Email sent to ${user.email}: ${title}`);
    }
};
exports.NotificationProcessor = NotificationProcessor;
exports.NotificationProcessor = NotificationProcessor = NotificationProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('notifications', {
        concurrency: 10,
        limiter: {
            max: 100,
            duration: 60000,
        },
    }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationProcessor);
//# sourceMappingURL=notification.processor.js.map