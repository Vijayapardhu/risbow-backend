import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GlobalExceptionsFilter } from './common/filters/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';

// Trigger deployment update - v4 - Trigger restart for AdminService fix
async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
    console.log("🚀 BOOTSTRAP V5 - VERIFICATION MODE");


    // Security middleware
    app.use(helmet({
        crossOriginEmbedderPolicy: false, // Allow embedding for Flutter web
        contentSecurityPolicy: false, // Disable CSP for API server
    }));

    // Serve static files from public directory
    app.useStaticAssets(join(__dirname, '..', 'public'));

    // Global Config
    app.setGlobalPrefix('api/v1');

    // CORS configuration - allow localhost for Flutter web development
    app.enableCors({
        origin: true, // Allow all origins (will be restricted in production)
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        optionsSuccessStatus: 200, // For legacy browsers
        preflightContinue: false,
    });

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true, // Reject requests with unknown properties
        transform: true, // Auto-transform payloads to DTO instances
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
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
        customSiteTitle: 'RISBOW API Docs',
        customfavIcon: 'https://risbow.com/favicon.ico',
        customCss: '.swagger-ui .topbar { display: none }',
    });

    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');
    console.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();
