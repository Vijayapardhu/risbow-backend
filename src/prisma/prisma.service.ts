import { Injectable, OnModuleInit, OnModuleDestroy, INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor(private configService?: ConfigService) {
        // Try to get DATABASE_URL from ConfigService first, then fallback to process.env
        // This ensures we get values from ConfigModule if available
        let databaseUrl = this.configService?.get<string>('DATABASE_URL') || process.env.DATABASE_URL;
        let constructedFromEnvVars = false;
        
        // Debug logging (only in development)
        if (process.env.NODE_ENV === 'development') {
            console.log('[PrismaService] DATABASE_URL from ConfigService:', this.configService?.get<string>('DATABASE_URL') ? 'SET' : 'NOT SET');
            console.log('[PrismaService] DATABASE_URL from process.env:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
            console.log('[PrismaService] DB_HOST:', process.env.DB_HOST || this.configService?.get<string>('DB_HOST') || 'NOT SET');
        }
        
        if (!databaseUrl) {
            // Try ConfigService first, then process.env
            const dbHost = this.configService?.get<string>('DB_HOST') || process.env.DB_HOST;
            const dbPort = this.configService?.get<string>('DB_PORT') || process.env.DB_PORT || '5432';
            const dbName = this.configService?.get<string>('DB_NAME') || process.env.DB_NAME || 'postgres';
            const dbUser = this.configService?.get<string>('DB_USER') || process.env.DB_USER;
            const dbPassword = this.configService?.get<string>('DB_PASSWORD') || process.env.DB_PASSWORD;
            const dbSsl = (this.configService?.get<string>('DB_SSL') || process.env.DB_SSL) === 'true' || 
                          (this.configService?.get<string>('DB_SSL') || process.env.DB_SSL) === '1';

            if (dbHost && dbUser && dbPassword) {
                const sslParam = dbSsl ? '?sslmode=require' : '';
                databaseUrl = `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}${sslParam}`;
                constructedFromEnvVars = true;
            }
        }

        // Validate database URL is set
        if (!databaseUrl) {
            // Debug: Show what environment variables are actually available
            const availableVars = {
                DATABASE_URL: process.env.DATABASE_URL ? 'SET (length: ' + process.env.DATABASE_URL.length + ')' : 'NOT SET',
                DB_HOST: process.env.DB_HOST || 'NOT SET',
                DB_USER: process.env.DB_USER ? 'SET' : 'NOT SET',
                DB_PASSWORD: process.env.DB_PASSWORD ? 'SET' : 'NOT SET',
                DB_NAME: process.env.DB_NAME || 'NOT SET',
                DB_PORT: process.env.DB_PORT || 'NOT SET',
                DB_SSL: process.env.DB_SSL || 'NOT SET',
            };
            
            const errorMessage = [
                '❌ Database connection is not configured!',
                '',
                'Environment variables status:',
                ...Object.entries(availableVars).map(([key, value]) => `  ${key}: ${value}`),
                '',
                'Please set one of the following:',
                '  1. DATABASE_URL (full connection string)',
                '  2. Or individual variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DB_SSL',
                '',
                'Example DATABASE_URL:',
                '  postgresql://user:password@host:5432/database?sslmode=require',
                '',
                'Note: After setting environment variables in Azure App Service, you must restart the application.',
            ].join('\n');
            
            console.error(errorMessage);
            throw new Error('DATABASE_URL is required. Please configure database connection in environment variables.');
        }

        // Call super() first - must be before accessing 'this'
        super({
            datasources: {
                db: {
                    url: databaseUrl,
                },
            },
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        });

        // Now we can use this.logger after super()
        if (constructedFromEnvVars) {
            this.logger.log('Constructed DATABASE_URL from individual environment variables');
        }

        // Add middleware to log slow queries
        this.$use(async (params, next) => {
            const before = Date.now();
            const result = await next(params);
            const after = Date.now();
            const duration = after - before;

            if (duration > 1000) {
                this.logger.warn(`Slow query: ${params.model}.${params.action} took ${duration}ms`);
            }

            return result;
        });
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.log('✅ Database connected successfully');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('Database disconnected');
    }

    async enableShutdownHooks(app: INestApplication) {
        this.$on('beforeExit' as never, async () => {
            await app.close();
        });
    }
}
