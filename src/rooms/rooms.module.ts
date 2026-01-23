import { Module, forwardRef } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomMonetizationService } from './room-monetization.service';
import { RoomsController } from './rooms.controller';
import { RoomsGateway } from './rooms.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';
import { BowRoomIntelligenceService } from '../bow/bow-room-intelligence.service';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [PrismaModule, SharedModule, AuditModule],
    controllers: [RoomsController],
    providers: [RoomsService, RoomMonetizationService, RoomsGateway, BowRoomIntelligenceService],
    exports: [RoomsService, RoomMonetizationService, RoomsGateway, BowRoomIntelligenceService],
})
export class RoomsModule { }
