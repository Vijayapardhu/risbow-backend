import { Injectable, OnModuleInit, OnModuleDestroy, INestApplication, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        // Construct DATABASE_URL from individual env vars if DATABASE_URL is not set (Azure compatibility)
        let databaseUrl = process.env.DATABASE_URL;
        let constructedFromEnvVars = false;
        
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
                constructedFromEnvVars = true;
            }
        }

        // Validate database URL is set
        if (!databaseUrl) {
            const errorMessage = [
                '❌ Database connection is not configured!',
                '',
                'Please set one of the following:',
                '  1. DATABASE_URL (full connection string)',
                '  2. Or individual variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DB_SSL',
                '',
                'Example DATABASE_URL:',
                '  postgresql://user:password@host:5432/database?sslmode=require',
                '',
                'Example individual variables:',
                '  DB_HOST=your-db-host',
                '  DB_USER=your-db-user',
                '  DB_PASSWORD=your-db-password',
                '  DB_NAME=postgres',
                '  DB_PORT=5432',
                '  DB_SSL=true',
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
