import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GlobalExceptionsFilter } from './common/filters/http-exception.filter';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { join } from 'path';
import fastifyHelmet from '@fastify/helmet';
import compression from '@fastify/compress';
import { PrismaService } from './prisma/prisma.service';

// Trigger deployment update - v6 - Fastify Migration
async function bootstrap() {
    // SUPPRESSION: BullMQ warns about Redis version and eviction policy on Cloud Redis.
    const originalWarn = console.warn;
    console.warn = (...args) => {
        const message = typeof args[0] === 'string' ? args[0] : String(args[0]);
        // Suppress Redis version warnings (6.0.14 is acceptable for development)
        if (message.includes('It is highly recommended to use a minimum Redis version of 6.2.0')) {
            return;
        }
        // Suppress eviction policy warnings
        if (message.includes('Eviction policy is volatile-lru')) {
            return;
        }
        originalWarn.apply(console, args);
    };

    // CORS: must be configured on FastifyAdapter *before* create so preflight OPTIONS is handled
    const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
    if (process.env.FRONTEND_URL) corsOrigins.push(process.env.FRONTEND_URL.trim());
    const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

    const fastifyAdapter = new FastifyAdapter();
    fastifyAdapter.enableCors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (process.env.NODE_ENV !== 'production') return callback(null, true);
            if (localhostPattern.test(origin) || corsOrigins.indexOf(origin) !== -1) {
                return callback(null, true);
            }
            callback(new Error('Not allowed by CORS'), false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'sentry-trace', 'baggage'],
    });

    // Switch to Fastify Adapter for High Performance (25k+ Req/Sec capability)
    const app = await NestFactory.create(
        AppModule,
        fastifyAdapter as any,
        { rawBody: true }
    ) as unknown as NestFastifyApplication;
    console.log("🚀 BOOTSTRAP V6 - FASTIFY EDITION");

    // Enable graceful shutdown
    app.enableShutdownHooks();

    // Security headers (Fastify Helmet)
    await app.register(fastifyHelmet as any, {
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: false,
    });

    // Compression (Gzip/Brotli)
    await app.register(compression as any);

    // Serve static files (Fastify)
    app.useStaticAssets({
        root: join(__dirname, '..', 'public'),
        prefix: '/public/',
    });

    // Global Config
    app.setGlobalPrefix('api/v1');

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalFilters(new GlobalExceptionsFilter());

    // Swagger Setup
    const config = new DocumentBuilder()
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

        // Core Features
        .addTag('Auth', '🔐 Authentication - Login, Register, OTP verification')
        .addTag('Users', '👤 User Management - Profile, Addresses, Preferences')
        .addTag('Cart', '🛒 Shopping Cart - Add, Update, Remove items')
        .addTag('Checkout', '💳 Checkout Flow - Process orders with COD/Online payment')

        // Catalog & Products
        .addTag('Products', '📦 Product Catalog - Browse, Search, Filter products')
        .addTag('Catalog', '🗂️ Categories & Specifications - Product organization')
        .addTag('Vendors', '🏪 Vendor Management - Multi-vendor marketplace')

        // Orders & Fulfillment
        .addTag('Orders', '📋 Order Management - Create, Track, Update orders')
        .addTag('Payments', '💰 Payment Processing - Razorpay integration, COD')
        .addTag('Refunds', '💸 Refund Management - Request and process refunds')
        .addTag('Returns', '↩️ Returns & Replacements - Return requests and QC')

        // Promotions & Marketing
        .addTag('Gifts', '🎁 Gift SKU System - Free gifts based on cart eligibility')
        .addTag('Coupons', '🎟️ Coupon Management - Discount codes and validation')
        .addTag('Banners', '🖼️ Banner System - Promotional banners with slot management')

        // Social & Engagement
        .addTag('Reviews', '⭐ Reviews & Ratings - Product and vendor reviews')
        .addTag('Rooms', '👥 Live Shopping Rooms - Group buying and live sessions')
        .addTag('Coins', '🪙 Loyalty Coins - Earn and redeem coins')

        // Admin & Analytics
        .addTag('Admin', '⚙️ Admin Operations - Platform management')
        .addTag('Analytics', '📊 Analytics & Reports - Business insights')
        .addTag('Telecaller', '📞 Telecaller Dashboard - Abandoned cart recovery')
        .addTag('Audit', '📝 Audit Logs - System activity tracking')

        // Utilities
        .addTag('Upload', '📤 File Upload - Image and document uploads')
        .addTag('Health', '🏥 Health Check - System status')

        .build();
    const document = SwaggerModule.createDocument(app as any, config);
    SwaggerModule.setup('api/docs', app as any, document, {
        customSiteTitle: 'RISBOW API Docs',
        customfavIcon: 'https://risbow.com/favicon.ico',
        customCss: '.swagger-ui .topbar { display: none }',
    });

    // Health Check
    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.get('/health', async (request, reply) => {
        try {
            // Get PrismaService from the app context using NestJS DI
            const prisma = app.get(PrismaService);
            await prisma.$queryRaw`SELECT 1`;
            return { status: 'ok', timestamp: new Date().toISOString() };
        } catch (e) {
            reply.code(503);
            return { status: 'error', message: 'Database unreachable' };
        }
    });

    // App Service injects PORT dynamically - MUST use process.env.PORT
    const port = parseInt(process.env.PORT || '3000', 10);

    try {
        await app.listen(port, '0.0.0.0');

        // Log startup information
        const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
        console.log('='.repeat(60));
        console.log(`🚀 RISBOW Backend API Started Successfully`);
        console.log(`📡 Listening on: 0.0.0.0:${port}`);
        console.log(`🌐 Base URL: ${baseUrl}`);
        console.log(`📚 API Docs: ${baseUrl}/api/docs`);
        console.log(`❤️  Health Check: ${baseUrl}/health`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`👷 Worker PID: ${process.pid}`);
        console.log('='.repeat(60));
    } catch (error) {
        console.error('❌ Failed to start server on port', port, ':', error);
        throw error;
    }
}

import * as os from 'os';

// Cluster Support for High Concurrency (10k req/sec goal)
if (process.env.CLUSTER_MODE === 'true') {
    const cluster = require('cluster');
    if (cluster.isPrimary) {
        const numCPUs = os.cpus().length;
        console.log(`🚀 Primary ${process.pid} is running. Forking ${numCPUs} workers for maximum performance...`);

        // Fork workers
        for (let i = 0; i < numCPUs; i++) {
            cluster.fork();
        }

        cluster.on('exit', (worker, code, signal) => {
            console.log(`❌ Worker ${worker.process.pid} died. Restarting...`);
            cluster.fork();
        });
    } else {
        // Worker processes run the app
        bootstrap().catch((error) => {
            console.error('❌ Failed to start application:', error);
            process.exit(1);
        });
    }
} else {
    bootstrap().catch((error) => {
        console.error('❌ Failed to start application:', error);
        process.exit(1);
    });
}
