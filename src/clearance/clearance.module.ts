import { Module, forwardRef } from '@nestjs/common';
import { ClearanceController } from './clearance.controller';
import { ClearanceService } from './clearance.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RoomsModule } from '../rooms/rooms.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [PrismaModule, forwardRef(() => RoomsModule), SharedModule],
  controllers: [ClearanceController],
  providers: [ClearanceService],
  exports: [ClearanceService],
})
export class ClearanceModule {}
