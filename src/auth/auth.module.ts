import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { VendorOnboardingService } from './vendor-onboarding.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { RazorpayService } from '../shared/razorpay.service';
import { FileUploadService } from '../shared/file-upload.service';

@Module({
    imports: [
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const secret = configService.get<string>('JWT_SECRET');
                const expiresIn = process.env.JWT_EXPIRES_IN || '15m';

                return {
                    secret,
                    signOptions: {
                        expiresIn,
                    },
                };
            },
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService, 
        VendorOnboardingService,
        JwtStrategy,
        RazorpayService,
        FileUploadService
    ],
    exports: [AuthService, VendorOnboardingService],
})
export class AuthModule { }
