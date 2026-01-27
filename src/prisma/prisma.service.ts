import { Injectable, OnModuleInit, OnModuleDestroy, INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private configService?: ConfigService;

    constructor(configService?: ConfigService) {
        // Read environment variables BEFORE calling super() (can't use 'this' before super)
        // Use Supabase PostgreSQL - DATABASE_URL must be set directly
        const databaseUrl = process.env.DATABASE_URL;

        // Validate database URL is set
        if (!databaseUrl) {
            const errorMessage = [
                '❌ Supabase database connection is not configured!',
                '',
                'DATABASE_URL is required. Please set your Supabase PostgreSQL connection string.',
                '',
                'Get your connection string from:',
                '  1. Go to https://supabase.com/dashboard',
                '  2. Select your project',
                '  3. Go to Settings → Database',
                '  4. Copy Connection string → URI (Pooler)',
                '',
                'Example Supabase DATABASE_URL:',
                '  postgresql://postgres.rxticediycnboewmsfmi:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require',
                '',
                'Also set DIRECT_URL for migrations (port 5432):',
                '  DIRECT_URL=postgresql://postgres.rxticediycnboewmsfmi:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require',
                '',
                'Note: Replace [PASSWORD] with your actual Supabase database password.',
            ].join('\n');
            
            console.error(errorMessage);
            throw new Error('DATABASE_URL is required. Please configure Supabase database connection in environment variables.');
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

        // Store ConfigService for later use (after super())
        this.configService = configService;

        // Debug logging (only in development) - now we can use this.configService
        if (process.env.NODE_ENV === 'development') {
            const configServiceUrl = this.configService?.get<string>('DATABASE_URL');
            this.logger.debug(`DATABASE_URL from ConfigService: ${configServiceUrl ? 'SET' : 'NOT SET'}`);
            this.logger.debug(`DATABASE_URL from process.env: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
            // Check if it's a Supabase connection
            if (databaseUrl && databaseUrl.includes('supabase.com')) {
                this.logger.debug('✅ Using Supabase PostgreSQL database');
            }
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
