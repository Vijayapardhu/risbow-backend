import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GlobalExceptionsFilter } from './common/filters/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';

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
    
    // CORS configuration - allow localhost for Flutter web development
    app.enableCors({
        origin: (origin, callback) => {
            const allowedOrigins = [
                'https://risbow.com',
                'https://www.risbow.com',
                'https://admin.risbow.com',
                process.env.FRONTEND_URL,
            ].filter(Boolean);
            
            // Allow requests with no origin (mobile apps, Postman, etc.)
            // Also allow localhost for development
            if (!origin || origin.startsWith('http://localhost') || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
