import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';

@Global()
@Module({
    imports: [ConfigModule], // Import ConfigModule to ensure ConfigService is available
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule { }
