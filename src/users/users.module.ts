import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController, ReferralsController } from './users.controller';
import { CoinsModule } from '../coins/coins.module';

@Module({
    imports: [CoinsModule],
    controllers: [UsersController, ReferralsController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
