import { PrismaService } from '../prisma/prisma.service';
export declare class HealthController {
    private prisma;
    constructor(prisma: PrismaService);
    check(): Promise<{
        status: string;
        timestamp: string;
        message?: undefined;
    } | {
        status: string;
        message: string;
        timestamp?: undefined;
    }>;
}
