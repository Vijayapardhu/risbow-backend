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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async createNotification(userId, title, body, type, targetAudience = 'INDIVIDUAL') {
        try {
            const notification = await this.prisma.notification.create({
                data: {
                    userId,
                    title,
                    body,
                    type,
                    targetAudience,
                    isRead: false
                }
            });
            this.logger.log(`[DB NOTIFICATION] Created for User ${userId}: ${title}`);
            await this.sendPush(userId, title, body);
            return notification;
        }
        catch (error) {
            this.logger.error(`Failed to create notification for user ${userId}`, error.stack);
        }
    }
    async sendPush(userId, title, body) {
        this.logger.log(`[PUSH -> ${userId}] ${title}: ${body}`);
        return true;
    }
    async sendSMS(mobile, message) {
        this.logger.log(`[SMS -> ${mobile}] ${message}`);
        return true;
    }
    async sendEmail(email, subject, content) {
        this.logger.log(`[EMAIL -> ${email}] ${subject}`);
        return true;
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map