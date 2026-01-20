"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const prisma_module_1 = require("./prisma/prisma.module");
const audit_module_1 = require("./audit/audit.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const coins_module_1 = require("./coins/coins.module");
const rooms_module_1 = require("./rooms/rooms.module");
const catalog_module_1 = require("./catalog/catalog.module");
const orders_module_1 = require("./orders/orders.module");
const vendors_module_1 = require("./vendors/vendors.module");
const payments_module_1 = require("./payments/payments.module");
const admin_module_1 = require("./admin/admin.module");
const bow_module_1 = require("./bow/bow.module");
const checkout_module_1 = require("./checkout/checkout.module");
const schedule_1 = require("@nestjs/schedule");
const bullmq_1 = require("@nestjs/bullmq");
const analytics_module_1 = require("./analytics/analytics.module");
const telecaller_module_1 = require("./telecaller/telecaller.module");
const returns_module_1 = require("./returns/returns.module");
const cart_module_1 = require("./cart/cart.module");
const upload_module_1 = require("./upload/upload.module");
const reviews_module_1 = require("./reviews/reviews.module");
const refunds_module_1 = require("./refunds/refunds.module");
const shared_module_1 = require("./shared/shared.module");
const health_controller_1 = require("./common/health.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            throttler_1.ThrottlerModule.forRoot([{
                    ttl: 60000,
                    limit: 100,
                }]),
            bullmq_1.BullModule.forRoot({
                connection: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT) || 6379,
                },
            }),
            prisma_module_1.PrismaModule,
            audit_module_1.AuditModule,
            analytics_module_1.AnalyticsModule,
            shared_module_1.SharedModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            coins_module_1.CoinsModule,
            rooms_module_1.RoomsModule,
            catalog_module_1.CatalogModule,
            orders_module_1.OrdersModule,
            vendors_module_1.VendorsModule,
            payments_module_1.PaymentsModule,
            admin_module_1.AdminModule,
            checkout_module_1.CheckoutModule,
            bow_module_1.BowModule,
            telecaller_module_1.TelecallerModule,
            returns_module_1.ReturnsModule,
            cart_module_1.CartModule,
            upload_module_1.UploadModule,
            reviews_module_1.ReviewsModule,
            refunds_module_1.RefundsModule,
        ],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map