import { Injectable, OnModuleInit, OnModuleDestroy, INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private configService?: ConfigService;

    constructor(configService?: ConfigService) {
        // Read environment variables BEFORE calling super() (can't use 'this' before super)
        // Support both standard DB_* vars and PostgreSQL client vars (PGHOST, PGUSER, etc.)
        let databaseUrl = process.env.DATABASE_URL;
        let constructedFromEnvVars = false;
        
        if (!databaseUrl) {
            // Try to construct from individual environment variables
            const dbHost = process.env.DB_HOST || process.env.PGHOST;
            const dbPort = process.env.DB_PORT || process.env.PGPORT || '5432';
            const dbName = process.env.DB_NAME || process.env.PGDATABASE || 'postgres';
            const dbUser = process.env.DB_USER || process.env.PGUSER;
            const dbPassword = process.env.DB_PASSWORD || process.env.PGPASSWORD;
            const dbSsl = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

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

        // Store ConfigService for later use (after super())
        this.configService = configService;

        // Now we can use this.logger and this.configService after super()
        if (constructedFromEnvVars) {
            this.logger.log('Constructed DATABASE_URL from individual environment variables');
        }

        // Debug logging (only in development) - now we can use this.configService
        if (process.env.NODE_ENV === 'development') {
            const configServiceUrl = this.configService?.get<string>('DATABASE_URL');
            this.logger.debug(`DATABASE_URL from ConfigService: ${configServiceUrl ? 'SET' : 'NOT SET'}`);
            this.logger.debug(`DATABASE_URL from process.env: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
            this.logger.debug(`DB_HOST: ${process.env.DB_HOST || process.env.PGHOST || 'NOT SET'}`);
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
