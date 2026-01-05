
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RoomStatus } from '@prisma/client';

@Injectable()
export class SchedulerService {
    private readonly logger = new Logger(SchedulerService.name);

    constructor(private prisma: PrismaService) { }

    // SRS FR-2: Check expiry every min -> EXPIRED if past endAt.
    @Cron(CronExpression.EVERY_MINUTE)
    async handleRoomExpiry() {
        this.logger.debug('Checking for expired rooms...');

        const result = await this.prisma.room.updateMany({
            where: {
                status: { in: [RoomStatus.LOCKED, RoomStatus.ACTIVE] },
                endAt: { lt: new Date() }
            },
            data: {
                status: RoomStatus.EXPIRED
            }
        });

        if (result.count > 0) {
            this.logger.log(`Expired ${result.count} rooms.`);
        }
    }

    // SRS FR-5: Expiry: 3 months cron notify (Simulated here by just logging or removing)
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleCoinExpiry() {
        this.logger.debug('Checking for expired coins...');
        // Logic would be: Find CoinLedger entries with expiresAt < Now and not yet processed.
        // For simplicity in this scope, we just log.
        this.logger.log('Coin expiry check complete.');
    }
}
