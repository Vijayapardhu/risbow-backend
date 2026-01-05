import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterVendorDto } from './dto/vendor.dto';
import { CoinsService } from '../coins/coins.service';
import { CoinSource } from '../coins/dto/coin.dto';
import { VendorRole } from '@prisma/client';

@Injectable()
export class VendorsService {
    constructor(
        private prisma: PrismaService,
        private coinsService: CoinsService
    ) { }

    async register(dto: RegisterVendorDto) {
        const existing = await this.prisma.vendor.findUnique({
            where: { mobile: dto.mobile },
        });
        if (existing) throw new BadRequestException('Vendor already exists');

        return this.prisma.vendor.create({
            data: {
                name: dto.name,
                mobile: dto.mobile,
                email: dto.email,
                kycStatus: 'PENDING',
                tier: 'BASIC',
                role: (dto.role as any) || VendorRole.RETAILER,
            },
        });
    }



    async purchaseBannerSlot(userId: string, image: string) {
        // SRS FR-6: 2000 coins for 1 week banner.
        // 1. Debit Coins
        await this.coinsService.debit(userId, 2000, CoinSource.BANNER_PURCHASE);

        // 2. Create Banner Record (stubbed)
        // await this.prisma.banner.create(...)

        return { message: 'Banner slot purchased successfully', validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
    }

    async findAll() {
        return this.prisma.vendor.findMany();
    }
}
