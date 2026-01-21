"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const path_1 = require("path");
const helmet_1 = __importDefault(require("@fastify/helmet"));
const compress_1 = __importDefault(require("@fastify/compress"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter());
    console.log("🚀 BOOTSTRAP V6 - FASTIFY EDITION");
    await app.register(helmet_1.default, {
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: false,
    });
    await app.register(compress_1.default);
    app.useStaticAssets({
        root: (0, path_1.join)(__dirname, '..', 'public'),
        prefix: '/public/',
    });
    app.setGlobalPrefix('api/v1');
    const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || [];
    if (process.env.FRONTEND_URL)
        corsOrigins.push(process.env.FRONTEND_URL);
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (process.env.NODE_ENV !== 'production')
                return callback(null, true);
            if (corsOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'), false);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'sentry-trace', 'baggage'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalFilters(new http_exception_filter_1.GlobalExceptionsFilter());
    const config = new swagger_1.DocumentBuilder()
        .setTitle('RISBOW API')
        .setDescription(`
# RISBOW Ecommerce Super App API

Welcome to the RISBOW API documentation! This API powers the RISBOW platform with features including:

- 🔐 **Authentication** - OTP & Email/Password login
- 🛒 **Orders** - Complete order lifecycle management with state machine
- 📦 **Products** - Product catalog and inventory
- 💳 **Payments** - Razorpay integration for online payments
- 🎁 **Gifts & Coupons** - Promotional features
- ⭐ **Reviews** - Product reviews and ratings
- 🏪 **Vendors** - Multi-vendor marketplace
- 👥 **Rooms** - Live shopping rooms

## Getting Started

1. **Authenticate**: Use \`POST /auth/login\` with credentials \`admin@risbow.com\` / \`password123\`
2. **Authorize**: Click the 🔓 button above and paste your access token
3. **Test**: Try any endpoint - all have example values pre-filled!

📖 **Full Testing Guide**: See \`SWAGGER_TESTING_GUIDE.md\` in the project root
        `)
        .setVersion('1.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT token from /auth/login',
        in: 'header',
    })
        .addServer('http://localhost:3001', 'Local Development')
        .addServer('https://api.risbow.com', 'Production')
        .addTag('Auth', '🔐 Authentication - Login, Register, OTP verification')
        .addTag('Users', '👤 User Management - Profile, Addresses, Preferences')
        .addTag('Cart', '🛒 Shopping Cart - Add, Update, Remove items')
        .addTag('Checkout', '💳 Checkout Flow - Process orders with COD/Online payment')
        .addTag('Products', '📦 Product Catalog - Browse, Search, Filter products')
        .addTag('Catalog', '🗂️ Categories & Specifications - Product organization')
        .addTag('Vendors', '🏪 Vendor Management - Multi-vendor marketplace')
        .addTag('Orders', '📋 Order Management - Create, Track, Update orders')
        .addTag('Payments', '💰 Payment Processing - Razorpay integration, COD')
        .addTag('Refunds', '💸 Refund Management - Request and process refunds')
        .addTag('Returns', '↩️ Returns & Replacements - Return requests and QC')
        .addTag('Gifts', '🎁 Gift SKU System - Free gifts based on cart eligibility')
        .addTag('Coupons', '🎟️ Coupon Management - Discount codes and validation')
        .addTag('Banners', '🖼️ Banner System - Promotional banners with slot management')
        .addTag('Reviews', '⭐ Reviews & Ratings - Product and vendor reviews')
        .addTag('Rooms', '👥 Live Shopping Rooms - Group buying and live sessions')
        .addTag('Coins', '🪙 Loyalty Coins - Earn and redeem coins')
        .addTag('Admin', '⚙️ Admin Operations - Platform management')
        .addTag('Analytics', '📊 Analytics & Reports - Business insights')
        .addTag('Telecaller', '📞 Telecaller Dashboard - Abandoned cart recovery')
        .addTag('Audit', '📝 Audit Logs - System activity tracking')
        .addTag('Upload', '📤 File Upload - Image and document uploads')
        .addTag('Health', '🏥 Health Check - System status')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        customSiteTitle: 'RISBOW API Docs',
        customfavIcon: 'https://risbow.com/favicon.ico',
        customCss: '.swagger-ui .topbar { display: none }',
    });
    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');
    console.log(`Worker ${process.pid} started on: http://0.0.0.0:${port}`);
}
const os = __importStar(require("os"));
if (process.env.CLUSTER_MODE === 'true') {
    const cluster = require('cluster');
    if (cluster.isPrimary) {
        const numCPUs = os.cpus().length;
        console.log(`🚀 Primary ${process.pid} is running. Forking ${numCPUs} workers for maximum performance...`);
        for (let i = 0; i < numCPUs; i++) {
            cluster.fork();
        }
        cluster.on('exit', (worker, code, signal) => {
            console.log(`❌ Worker ${worker.process.pid} died. Restarting...`);
            cluster.fork();
        });
    }
    else {
        bootstrap();
    }
}
else {
    bootstrap();
}
//# sourceMappingURL=main.js.map