import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRole, AdminUser } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { AdminLoginDto, AdminLoginResponseDto } from './dto/admin-login.dto';
import { AdminRefreshResponseDto } from './dto/admin-refresh.dto';
import { SetupMfaResponseDto } from './dto/setup-mfa.dto';
import { VerifyMfaResponseDto } from './dto/verify-mfa.dto';

// Constants
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const SESSION_ABSOLUTE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_IDLE_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

interface JwtPayload {
  sub: string;
  email: string;
  role: AdminRole;
  sessionId: string;
  type: 'access' | 'refresh' | 'temp';
}

@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Validate admin credentials
   */
  async validateAdmin(email: string, password: string): Promise<AdminUser | null> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!admin || !admin.isActive) {
      return null;
    }

    // Check if account is locked
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (admin.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Account is locked. Try again in ${remainingMinutes} minutes.`,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      // Increment failed attempts
      const failedAttempts = admin.failedAttempts + 1;
      const updateData: any = { failedAttempts };

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
      }

      await this.prisma.adminUser.update({
        where: { id: admin.id },
        data: updateData,
      });

      return null;
    }

    // Reset failed attempts on successful validation
    if (admin.failedAttempts > 0) {
      await this.prisma.adminUser.update({
        where: { id: admin.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });
    }

    return admin;
  }

  /**
   * Login admin user
   */
  async login(
    dto: AdminLoginDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AdminLoginResponseDto | { requiresMfa: true; tempToken: string }> {
    const admin = await this.validateAdmin(dto.email, dto.password);

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if MFA is required
    if (admin.isMfaEnabled) {
      if (!dto.mfaCode) {
        // Return temp token for MFA step
        const tempToken = await this.createTempToken(admin);
        return { requiresMfa: true, tempToken };
      }

      // Verify MFA code
      const isValidMfa = this.verifyMfaCode(admin.mfaSecret!, dto.mfaCode, admin.backupCodes);
      if (!isValidMfa.valid) {
        throw new UnauthorizedException('Invalid MFA code');
      }

      // If backup code was used, remove it
      if (isValidMfa.usedBackupCode) {
        await this.prisma.adminUser.update({
          where: { id: admin.id },
          data: {
            backupCodes: admin.backupCodes.filter((c) => c !== dto.mfaCode),
          },
        });
      }
    }

    // Create session and tokens
    return this.createSession(admin, ipAddress, userAgent);
  }

  /**
   * Verify MFA code for login
   */
  async verifyMfaLogin(
    tempToken: string,
    code: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<VerifyMfaResponseDto> {
    // Verify temp token
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(tempToken, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired temporary token');
    }

    if (payload.type !== 'temp') {
      throw new UnauthorizedException('Invalid token type');
    }

    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
    });

    if (!admin || !admin.isActive || !admin.isMfaEnabled) {
      throw new UnauthorizedException('Invalid admin account');
    }

    // Verify MFA code
    const isValidMfa = this.verifyMfaCode(admin.mfaSecret!, code, admin.backupCodes);
    if (!isValidMfa.valid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    // If backup code was used, remove it
    if (isValidMfa.usedBackupCode) {
      await this.prisma.adminUser.update({
        where: { id: admin.id },
        data: {
          backupCodes: admin.backupCodes.filter((c) => c !== code),
        },
      });
    }

    // Create full session
    return this.createSession(admin, ipAddress, userAgent);
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    refreshToken: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<AdminRefreshResponseDto> {
    // Verify refresh token
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Find session
    const session = await this.prisma.adminSession.findFirst({
      where: {
        id: payload.sessionId,
        token: refreshToken,
        isActive: true,
      },
      include: { AdminUser: true },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found or revoked');
    }

    // Check session timeout
    const sessionAge = Date.now() - session.createdAt.getTime();
    const idleTime = Date.now() - session.lastActive.getTime();

    if (sessionAge > SESSION_ABSOLUTE_TIMEOUT || idleTime > SESSION_IDLE_TIMEOUT) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Session expired');
    }

    // Check if admin is still active
    if (!session.AdminUser.isActive) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Account deactivated');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken(
      session.AdminUser,
      session.id,
    );

    // Update session activity
    await this.prisma.adminSession.update({
      where: { id: session.id },
      data: { lastActive: new Date() },
    });

    return {
      accessToken,
      expiresIn: ACCESS_TOKEN_EXPIRY,
    };
  }

  /**
   * Logout - revoke session
   */
  async logout(sessionId: string): Promise<void> {
    await this.revokeSession(sessionId);
  }

  /**
   * Logout from all sessions
   */
  async logoutAll(adminId: string): Promise<void> {
    await this.prisma.adminSession.updateMany({
      where: { adminUserId: adminId, isActive: true },
      data: { isActive: false },
    });
  }

  /**
   * Get active sessions for admin
   */
  async getSessions(adminId: string) {
    return this.prisma.adminSession.findMany({
      where: { adminUserId: adminId, isActive: true },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastActive: true,
      },
      orderBy: { lastActive: 'desc' },
    });
  }

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.adminSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
  }

  /**
   * Setup MFA for admin
   */
  async setupMfa(adminId: string): Promise<SetupMfaResponseDto> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    if (admin.isMfaEnabled) {
      throw new ConflictException('MFA is already enabled');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `RisBow Admin (${admin.email})`,
      issuer: 'RisBow',
      length: 20,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);

    // Store secret temporarily (not enabled yet)
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: {
        mfaSecret: secret.base32,
        backupCodes,
      },
    });

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify and enable MFA
   */
  async verifyMfaSetup(adminId: string, code: string): Promise<{ success: boolean }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin || !admin.mfaSecret) {
      throw new BadRequestException('MFA setup not initiated');
    }

    if (admin.isMfaEnabled) {
      throw new ConflictException('MFA is already enabled');
    }

    // Verify code
    const verified = speakeasy.totp.verify({
      secret: admin.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      throw new BadRequestException('Invalid verification code');
    }

    // Enable MFA
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { isMfaEnabled: true },
    });

    return { success: true };
  }

  /**
   * Disable MFA
   */
  async disableMfa(
    adminId: string,
    code: string,
    password: string,
  ): Promise<{ success: boolean }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin || !admin.isMfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify MFA code
    const isValidMfa = this.verifyMfaCode(admin.mfaSecret!, code, admin.backupCodes);
    if (!isValidMfa.valid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    // Disable MFA
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: {
        isMfaEnabled: false,
        mfaSecret: null,
        backupCodes: [],
      },
    });

    return { success: true };
  }

  /**
   * Get current admin profile
   */
  async getProfile(adminId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isMfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    return admin;
  }

  /**
   * Change password
   */
  async changePassword(
    adminId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password and invalidate all sessions
    await this.prisma.$transaction([
      this.prisma.adminUser.update({
        where: { id: adminId },
        data: { password: passwordHash },
      }),
      this.prisma.adminSession.updateMany({
        where: { adminUserId: adminId },
        data: { isActive: false },
      }),
    ]);

    return { success: true };
  }

  // ============== Private Helper Methods ==============

  private async createSession(
    admin: AdminUser,
    ipAddress: string,
    userAgent: string,
  ): Promise<AdminLoginResponseDto> {
    // Create session
    const session = await this.prisma.adminSession.create({
      data: {
        adminUserId: admin.id,
        token: crypto.randomBytes(32).toString('hex'),
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000),
      },
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(admin, session.id);
    const refreshTokenJwt = this.generateRefreshToken(admin, session.id);

    // Update last login
    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return {
      accessToken,
      expiresIn: ACCESS_TOKEN_EXPIRY,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        mfaEnabled: admin.isMfaEnabled,
      },
    };
  }

  private async createTempToken(admin: AdminUser): Promise<string> {
    const payload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      sessionId: '',
      type: 'temp',
    };

    return this.jwtService.sign(payload, {
      expiresIn: '5m', // 5 minutes for MFA step
    });
  }

  private generateAccessToken(admin: AdminUser, sessionId: string): string {
    const payload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      sessionId,
      type: 'access',
    };

    return this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  }

  private generateRefreshToken(admin: AdminUser, sessionId: string): string {
    const payload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      sessionId,
      type: 'refresh',
    };

    return this.jwtService.sign(payload, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });
  }

  private verifyMfaCode(
    secret: string,
    code: string,
    backupCodes: string[],
  ): { valid: boolean; usedBackupCode: boolean } {
    // First try TOTP
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (verified) {
      return { valid: true, usedBackupCode: false };
    }

    // Try backup codes
    if (backupCodes.includes(code)) {
      return { valid: true, usedBackupCode: true };
    }

    return { valid: false, usedBackupCode: false };
  }

  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
}
