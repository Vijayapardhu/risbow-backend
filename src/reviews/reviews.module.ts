import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';
import { VendorsModule } from '../vendors/vendors.module';
import { CoinsModule } from '../coins/coins.module';

@Module({
    imports: [PrismaModule, SharedModule, VendorsModule, CoinsModule],
    controllers: [ReviewsController],
    providers: [ReviewsService],
    exports: [ReviewsService],
})
export class ReviewsModule { }
