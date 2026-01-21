
process.env.NODE_ENV = 'test'; // Ensure Redis is disabled
process.env.JWT_SECRET = 'somerandomsecretkeyrequiredforauthmodule';

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

async function generate() {
    console.log('Initializing Application for Swagger Generation...');
    const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });

    const config = new DocumentBuilder()
        .setTitle('RISBOW API')
        .setDescription(`
# RISBOW Ecommerce Super App API

Welcome to the RISBOW API documentation!

## Key Features:
- 🔐 **Authentication** - OTP & Email/Password login
- 🛒 **Orders** - Complete order lifecycle
- 📦 **Products** - Rich catalog
- 💳 **Payments** - Razorpay integration
- 🎁 **Promotions** - Gifts & Coupons
- 👥 **Rooms** - Live shopping

## Usage:
Refer to 'API_INTEGRATION_GUIDE.md' for flow details.
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
        .addServer('http://localhost:3000', 'Local Development')
        .addServer('https://api.risbow.com', 'Production')

        // Tags
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

    const document = SwaggerModule.createDocument(app, config);
    const outputPath = path.join(process.cwd(), 'openapi.json');

    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
    console.log(`✅ Generated openapi.json at ${outputPath}`);

    await app.close();
    process.exit(0);
}

generate();
