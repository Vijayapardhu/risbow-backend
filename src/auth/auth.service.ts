import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis.service';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private redisService: RedisService,
    ) { }

    async sendOtp(mobile: string) {
        // Generate real 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store in Redis (TTL 5 min)
        await this.redisService.setOtp(mobile, otp);

        // Env check for real SMS or Dev log
        if (process.env.MSG91_AUTHKEY) {
            // await this.notificationService.sendSMS(mobile, `Your Risbow OTP is ${otp}`);
        }

        console.log(`[DEV] OTP for ${mobile}: ${otp}`); // Keep for testing without SMS cost
        return { message: 'OTP sent successfully' };
    }

    async verifyOtp(mobile: string, otp: string) {
        const storedOtp = await this.redisService.getOtp(mobile);

        if (!storedOtp || storedOtp !== otp) {
            // Fallback for hardcoded test number if needed (e.g. Apple review)
            if (mobile === '9999999999' && otp === '123456') {
                // allow pass
            } else {
                throw new UnauthorizedException('Invalid or Expired OTP');
            }
        }

        // Clear OTP after success to prevent replay
        await this.redisService.delOtp(mobile);

        // Find or Create User
        let user = await this.prisma.user.findUnique({
            where: { mobile },
        });

        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    mobile,
                    // Generate a simple ref code, in prod use something more unique/robust
                    referralCode: Math.random().toString(36).substring(7).toUpperCase(),
                },
            });
        }

        const payload = { sub: user.id, mobile: user.mobile };
        return {
            access_token: this.jwtService.sign(payload),
            user,
        };
    }
}
