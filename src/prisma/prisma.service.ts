import { Injectable, OnModuleInit, OnModuleDestroy, INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private configService?: ConfigService;

    constructor(configService?: ConfigService) {
        // Read environment variables BEFORE calling super() (can't use 'this' before super)
        let databaseUrl = process.env.DATABASE_URL;

        if (databaseUrl && databaseUrl.includes('supabase.com')) {
            // Ensure pool configuration is present for Supabase
            if (!databaseUrl.includes('connection_limit=')) {
                const separator = databaseUrl.includes('?') ? '&' : '?';
                databaseUrl += `${separator}connection_limit=20`;
            }
            if (!databaseUrl.includes('pool_timeout=')) {
                databaseUrl += '&pool_timeout=30';
            }
            if (!databaseUrl.includes('pgbouncer=true') && databaseUrl.includes(':6543')) {
                databaseUrl += '&pgbouncer=true';
            }
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
        await this.connectWithRetry();
    }

    private async connectWithRetry(maxRetries: number = 5, delayMs: number = 2000): Promise<void> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.$connect();
                this.logger.log('✅ Database connected successfully');
                return;
            } catch (error) {
                this.logger.error(
                    `❌ Database connection attempt ${attempt}/${maxRetries} failed: ${error.message}`
                );

                if (attempt === maxRetries) {
                    this.logger.error('❌ All database connection attempts failed');
                    throw error;
                }

                this.logger.log(`⏳ Retrying in ${delayMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                // Exponential backoff
                delayMs = Math.min(delayMs * 2, 30000); // Cap at 30 seconds
            }
        }
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
