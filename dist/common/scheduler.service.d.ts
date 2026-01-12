import { PrismaService } from '../prisma/prisma.service';
export declare class SchedulerService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    handleRoomExpiry(): Promise<void>;
    handleCoinExpiry(): Promise<void>;
}
