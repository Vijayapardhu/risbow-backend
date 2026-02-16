import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GlobalExceptionsFilter } from './common/filters/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';

// Trigger deployment update
async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Security middleware
    app.use(helmet({
        crossOriginEmbedderPolicy: false, // Allow embedding for Flutter web
        contentSecurityPolicy: false, // Disable CSP for API server
    }));

    // Serve static files from public directory
    app.useStaticAssets(join(__dirname, '..', 'public'));

    // Global Config
    app.setGlobalPrefix('api/v1');

    // CORS configuration - allow localhost for development and production URLs
    const isDevelopment = process.env.NODE_ENV !== 'production';
    app.enableCors({
        origin: (origin, callback) => {
            const allowedOrigins = [
                'https://risbow.com',
                'https://www.risbow.com',
                'https://admin.risbow.com',
                'https://vendor.risbow.com',
                process.env.FRONTEND_URL,
                process.env.ADMIN_URL,
                process.env.VENDOR_URL,
            ].filter(Boolean);

            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) {
                callback(null, true);
            } else if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
                // Allow all localhost ports for development
                callback(null, true);
            } else if (isDevelopment) {
                // In development mode, allow all origins
                callback(null, true);
            } else {
                console.warn(`CORS blocked origin: ${origin}`);
                callback(null, false);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-request-id'],
        exposedHeaders: ['Content-Range', 'X-Total-Count'],
        preflightContinue: false,
        optionsSuccessStatus: 204,
    });

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true, // Reject requests with unknown properties
        transform: true, // Auto-transform payloads to DTO instances
    }));
    app.useGlobalFilters(new GlobalExceptionsFilter());

    // Global rate limiting is now handled via APP_GUARD in AppModule

    // Swagger Setup
    const config = new DocumentBuilder()
        .setTitle('RISBOW API')
        .setDescription('The RISBOW Ecommerce Super App API description')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');
    console.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();
