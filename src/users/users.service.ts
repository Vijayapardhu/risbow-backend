import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findOne(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        return this.prisma.user.update({
            where: { id },
            data: {
                name: updateUserDto.name,
                email: updateUserDto.email,
                gender: updateUserDto.gender,
                size: updateUserDto.size,
                footwearSize: updateUserDto.footwearSize,
                stylePrefs: updateUserDto.stylePrefs,
                colors: updateUserDto.colors
            },
        });
    }

    async claimReferral(userId: string, refCode: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user.referredBy) {
            throw new BadRequestException('Already referred by someone');
        }

        if (user.referralCode === refCode) {
            throw new BadRequestException('Cannot refer yourself');
        }

        const referrer = await this.prisma.user.findUnique({
            where: { referralCode: refCode },
        });

        if (!referrer) {
            throw new BadRequestException('Invalid referral code');
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: { referredBy: referrer.id },
        });
    }
}
