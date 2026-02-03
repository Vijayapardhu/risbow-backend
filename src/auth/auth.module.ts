import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
    imports: [
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const privateKey = configService.get<string>('JWT_PRIVATE_KEY');
                const publicKey = configService.get<string>('JWT_PUBLIC_KEY');
                const secret = configService.get<string>('JWT_SECRET');
                const expiresIn = process.env.JWT_EXPIRES_IN || '15m';

                // Use RS256 (asymmetric) if keys are configured, otherwise fall back to HS256
                if (privateKey && publicKey) {
                    return {
                        privateKey: privateKey.replace(/\\n/g, '\n'),
                        publicKey: publicKey.replace(/\\n/g, '\n'),
                        signOptions: {
                            algorithm: 'RS256',
                            expiresIn,
                        },
                        verifyOptions: {
                            algorithms: ['RS256'],
                        },
                    };
                }

                // Fallback to HS256 (symmetric) - acceptable for single-service deployments
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
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule { }
