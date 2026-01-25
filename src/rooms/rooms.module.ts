import { Module, forwardRef } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomMonetizationService } from './room-monetization.service';
import { RoomPromotionPackagesService } from './room-promotion-packages.service';
import { RoomsController } from './rooms.controller';
import { RoomsGateway } from './rooms.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { BowRoomIntelligenceService } from '../bow/bow-room-intelligence.service';
import { AuditModule } from '../audit/audit.module';
import { PaymentsModule } from '../payments/payments.module';
import { CoinsModule } from '../coins/coins.module';

@Module({
    imports: [PrismaModule, AuditModule, forwardRef(() => PaymentsModule), CoinsModule],
    controllers: [RoomsController],
    providers: [RoomsService, RoomMonetizationService, RoomPromotionPackagesService, RoomsGateway, BowRoomIntelligenceService],
    exports: [RoomsService, RoomMonetizationService, RoomPromotionPackagesService, RoomsGateway, BowRoomIntelligenceService],
})
export class RoomsModule { }
