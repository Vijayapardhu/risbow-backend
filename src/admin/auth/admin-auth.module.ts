import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminLocalStrategy } from './strategies/admin-local.strategy';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { AdminPermissionsGuard } from './guards/admin-permissions.guard';
import { AdminMfaGuard } from './guards/admin-mfa.guard';
import { AdminRbacModule } from '../rbac/admin-rbac.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m', // Access token: 15 minutes
        },
      }),
      inject: [ConfigService],
    }),
    AdminRbacModule,
  ],
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    AdminJwtStrategy,
    AdminLocalStrategy,
    AdminJwtAuthGuard,
    AdminRolesGuard,
    AdminPermissionsGuard,
    AdminMfaGuard,
  ],
  exports: [
    AdminAuthService,
    JwtModule,
    AdminJwtAuthGuard,
    AdminRolesGuard,
    AdminPermissionsGuard,
    AdminMfaGuard,
  ],
})
export class AdminAuthModule {}
