import { Module } from '@nestjs/common';
import { VendorFollowersService } from './vendor-followers.service';
import { VendorFollowersController } from './vendor-followers.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [VendorFollowersController],
    providers: [VendorFollowersService],
})
export class VendorFollowersModule { }
