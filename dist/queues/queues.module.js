"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueuesModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const analytics_processor_1 = require("./processors/analytics.processor");
const notification_processor_1 = require("./processors/notification.processor");
const order_processor_1 = require("./processors/order.processor");
const cleanup_processor_1 = require("./processors/cleanup.processor");
const queues_service_1 = require("./queues.service");
const prisma_module_1 = require("../prisma/prisma.module");
let QueuesModule = class QueuesModule {
};
exports.QueuesModule = QueuesModule;
exports.QueuesModule = QueuesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            bullmq_1.BullModule.registerQueue({
                name: 'analytics',
            }),
            bullmq_1.BullModule.registerQueue({
                name: 'notifications',
            }),
            bullmq_1.BullModule.registerQueue({
                name: 'orders',
            }),
            bullmq_1.BullModule.registerQueue({
                name: 'cleanup',
            }),
        ],
        providers: [
            queues_service_1.QueuesService,
            analytics_processor_1.AnalyticsProcessor,
            notification_processor_1.NotificationProcessor,
            order_processor_1.OrderProcessor,
            cleanup_processor_1.CleanupProcessor,
        ],
        exports: [queues_service_1.QueuesService],
    })
], QueuesModule);
//# sourceMappingURL=queues.module.js.map