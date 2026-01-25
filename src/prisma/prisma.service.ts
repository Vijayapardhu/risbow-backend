import { Injectable, OnModuleInit, OnModuleDestroy, INestApplication, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        // Construct DATABASE_URL from individual env vars if DATABASE_URL is not set (Azure compatibility)
        let databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            const dbHost = process.env.DB_HOST;
            const dbPort = process.env.DB_PORT || '5432';
            const dbName = process.env.DB_NAME || 'postgres';
            const dbUser = process.env.DB_USER;
            const dbPassword = process.env.DB_PASSWORD;
            const dbSsl = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

            if (dbHost && dbUser && dbPassword) {
                const sslParam = dbSsl ? '?sslmode=require' : '';
                databaseUrl = `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}${sslParam}`;
            }
        }

        super({
            datasources: {
                db: {
                    url: databaseUrl,
                },
            },
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        });

        // Log after super() is called
        if (!process.env.DATABASE_URL && databaseUrl) {
            this.logger.log('Constructed DATABASE_URL from individual environment variables');
        } else if (!process.env.DATABASE_URL && !databaseUrl) {
            this.logger.error('DATABASE_URL not set and individual DB_* variables are incomplete');
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
