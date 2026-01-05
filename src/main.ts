import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GlobalExceptionsFilter } from './common/filters/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Serve static files from public directory
    app.useStaticAssets(join(__dirname, '..', 'public'));

    // Global Config
    app.setGlobalPrefix('api/v1');
    app.enableCors();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
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

    await app.listen(process.env.PORT || 3000);
}
bootstrap();
