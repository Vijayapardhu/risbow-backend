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
import { Admin } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { AdminLoginDto, AdminLoginResponseDto } from './dto/admin-login.dto';
import { AdminRefreshResponseDto } from './dto/admin-refresh.dto';
import { SetupMfaResponseDto } from './dto/setup-mfa.dto';
import { VerifyMfaResponseDto } from './dto/verify-mfa.dto';
import { AdminRole } from './types';

// Extended Admin type with optional fields that may not exist in schema yet
// TODO: Add these fields to the Admin model in schema.prisma when ready:
// - passwordHash: String (rename password to passwordHash)
// - mfaEnabled: Boolean @default(false)
// - mfaSecret: String?
// - backupCodes: String[]
// - failedAttempts: Int @default(0)
// - lockedUntil: DateTime?
// - lastLoginIp: String?
interface AdminWithMfa extends Admin {
  passwordHash?: string;
  mfaEnabled?: boolean;
  mfaSecret?: string | null;
  backupCodes?: string[];
  failedAttempts?: number;
  lockedUntil?: Date | null;
  lastLoginIp?: string | null;
}

// In-memory session store (TODO: Replace with AdminSession model in database)
interface InMemorySession {
  id: string;
  adminId: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  isRevoked: boolean;
  admin: Admin;
}
const sessionStore = new Map<string, InMemorySession>();

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
  role: string;
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
  async validateAdmin(email: string, password: string): Promise<Admin | null> {
    const admin = await this.prisma.admin.findUnique({
      where: { email: email.toLowerCase() },
    }) as AdminWithMfa | null;

    if (!admin || !admin.isActive) {
      return null;
    }

    // Check if account is locked (if lockedUntil field exists)
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (admin.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Account is locked. Try again in ${remainingMinutes} minutes.`,
      );
    }

    // Use passwordHash if exists, otherwise fall back to password field
    const passwordField = admin.passwordHash || admin.password;
    const isPasswordValid = await bcrypt.compare(password, passwordField);

    if (!isPasswordValid) {
      // Increment failed attempts if field exists
      // TODO: Enable when failedAttempts field is added to Admin model
      // const failedAttempts = (admin.failedAttempts || 0) + 1;
      // const updateData: any = { failedAttempts };
      // if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      //   updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
      // }
      // await this.prisma.admin.update({
      //   where: { id: admin.id },
      //   data: updateData,
      // });
      return null;
    }

    // Reset failed attempts on successful validation
    // TODO: Enable when failedAttempts field is added to Admin model
    // if ((admin.failedAttempts || 0) > 0) {
    //   await this.prisma.admin.update({
    //     where: { id: admin.id },
    //     data: { failedAttempts: 0, lockedUntil: null },
    //   });
    // }

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
    const admin = await this.validateAdmin(dto.email, dto.password) as AdminWithMfa | null;

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if MFA is required (if mfaEnabled field exists)
    if (admin.mfaEnabled) {
      if (!dto.mfaCode) {
        // Return temp token for MFA step
        const tempToken = await this.createTempToken(admin);
        return { requiresMfa: true, tempToken };
      }

      // Verify MFA code
      const isValidMfa = this.verifyMfaCode(admin.mfaSecret!, dto.mfaCode, admin.backupCodes || []);
      if (!isValidMfa.valid) {
        throw new UnauthorizedException('Invalid MFA code');
      }

      // If backup code was used, remove it
      // TODO: Enable when backupCodes field is added to Admin model
      // if (isValidMfa.usedBackupCode) {
      //   await this.prisma.admin.update({
      //     where: { id: admin.id },
      //     data: {
      //       backupCodes: (admin.backupCodes || []).filter((c) => c !== dto.mfaCode),
      //     },
      //   });
      // }
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

    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
    }) as AdminWithMfa | null;

    if (!admin || !admin.isActive || !admin.mfaEnabled) {
      throw new UnauthorizedException('Invalid admin account');
    }

    // Verify MFA code
    const isValidMfa = this.verifyMfaCode(admin.mfaSecret!, code, admin.backupCodes || []);
    if (!isValidMfa.valid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    // If backup code was used, remove it
    // TODO: Enable when backupCodes field is added to Admin model
    // if (isValidMfa.usedBackupCode) {
    //   await this.prisma.admin.update({
    //     where: { id: admin.id },
    //     data: {
    //       backupCodes: (admin.backupCodes || []).filter((c) => c !== code),
    //     },
    //   });
    // }

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

    // Find session from in-memory store
    // TODO: Replace with prisma.adminSession when model is added to schema
    const session = sessionStore.get(payload.sessionId);

    if (!session || session.refreshToken !== refreshToken || session.isRevoked) {
      throw new UnauthorizedException('Session not found or revoked');
    }

    // Check session timeout
    const sessionAge = Date.now() - session.createdAt.getTime();
    const idleTime = Date.now() - session.lastActiveAt.getTime();

    if (sessionAge > SESSION_ABSOLUTE_TIMEOUT || idleTime > SESSION_IDLE_TIMEOUT) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Session expired');
    }

    // Check if admin is still active
    const admin = await this.prisma.admin.findUnique({
      where: { id: session.adminId },
    });
    if (!admin || !admin.isActive) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Account deactivated');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken(admin, session.id);

    // Update session activity
    session.lastActiveAt = new Date();
    sessionStore.set(session.id, session);

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
    // TODO: Replace with prisma.adminSession.updateMany when model is added to schema
    for (const [id, session] of sessionStore) {
      if (session.adminId === adminId && !session.isRevoked) {
        session.isRevoked = true;
        sessionStore.set(id, session);
      }
    }
  }

  /**
   * Get active sessions for admin
   */
  async getSessions(adminId: string) {
    // TODO: Replace with prisma.adminSession.findMany when model is added to schema
    const sessions: Array<{
      id: string;
      ipAddress: string;
      userAgent: string;
      createdAt: Date;
      lastActiveAt: Date;
    }> = [];
    
    for (const session of sessionStore.values()) {
      if (session.adminId === adminId && !session.isRevoked) {
        sessions.push({
          id: session.id,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          createdAt: session.createdAt,
          lastActiveAt: session.lastActiveAt,
        });
      }
    }
    
    return sessions.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
  }

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    // TODO: Replace with prisma.adminSession.update when model is added to schema
    const session = sessionStore.get(sessionId);
    if (session) {
      session.isRevoked = true;
      sessionStore.set(sessionId, session);
    }
  }

  /**
   * Setup MFA for admin
   */
  async setupMfa(adminId: string): Promise<SetupMfaResponseDto> {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    }) as AdminWithMfa | null;

    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    if (admin.mfaEnabled) {
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
    // TODO: Enable when mfaSecret and backupCodes fields are added to Admin model
    // await this.prisma.admin.update({
    //   where: { id: adminId },
    //   data: {
    //     mfaSecret: secret.base32,
    //     backupCodes,
    //   },
    // });

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
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    }) as AdminWithMfa | null;

    if (!admin || !admin.mfaSecret) {
      throw new BadRequestException('MFA setup not initiated');
    }

    if (admin.mfaEnabled) {
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
    // TODO: Enable when mfaEnabled field is added to Admin model
    // await this.prisma.admin.update({
    //   where: { id: adminId },
    //   data: { mfaEnabled: true },
    // });

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
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    }) as AdminWithMfa | null;

    if (!admin || !admin.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify password (use passwordHash if exists, otherwise password field)
    const passwordField = admin.passwordHash || admin.password;
    const isPasswordValid = await bcrypt.compare(password, passwordField);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify MFA code
    const isValidMfa = this.verifyMfaCode(admin.mfaSecret!, code, admin.backupCodes || []);
    if (!isValidMfa.valid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    // Disable MFA
    // TODO: Enable when mfaEnabled, mfaSecret, backupCodes fields are added to Admin model
    // await this.prisma.admin.update({
    //   where: { id: adminId },
    //   data: {
    //     mfaEnabled: false,
    //     mfaSecret: null,
    //     backupCodes: [],
    //   },
    // });

    return { success: true };
  }

  /**
   * Get current admin profile
   */
  async getProfile(adminId: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    return {
      ...admin,
      mfaEnabled: false, // TODO: Add mfaEnabled field to Admin model
    };
  }

  /**
   * Change password
   */
  async changePassword(
    adminId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    }) as AdminWithMfa | null;

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    // Verify current password (use passwordHash if exists, otherwise password field)
    const passwordField = admin.passwordHash || admin.password;
    const isPasswordValid = await bcrypt.compare(currentPassword, passwordField);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password and invalidate all sessions
    await this.prisma.admin.update({
      where: { id: adminId },
      data: { password: newPasswordHash },
    });
    
    // Revoke all sessions for this admin
    await this.logoutAll(adminId);

    return { success: true };
  }

  // ============== Private Helper Methods ==============

  private async createSession(
    admin: Admin,
    ipAddress: string,
    userAgent: string,
  ): Promise<AdminLoginResponseDto> {
    // Create session in memory store
    // TODO: Replace with prisma.adminSession.create when model is added to schema
    const sessionId = crypto.randomBytes(16).toString('hex');
    const refreshTokenValue = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    
    const session: InMemorySession = {
      id: sessionId,
      adminId: admin.id,
      refreshToken: refreshTokenValue,
      ipAddress,
      userAgent,
      createdAt: now,
      lastActiveAt: now,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000),
      isRevoked: false,
      admin,
    };

    // Generate tokens
    const accessToken = this.generateAccessToken(admin, sessionId);
    const refreshTokenJwt = this.generateRefreshToken(admin, sessionId);

    // Update session with JWT refresh token
    session.refreshToken = refreshTokenJwt;
    sessionStore.set(sessionId, session);

    // Update last login
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
        // TODO: Add lastLoginIp field to Admin model
        // lastLoginIp: ipAddress,
      },
    });

    return {
      accessToken,
      expiresIn: ACCESS_TOKEN_EXPIRY,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name || '',
        role: admin.role,
        mfaEnabled: false, // TODO: Add mfaEnabled field to Admin model
      },
    };
  }

  private async createTempToken(admin: Admin): Promise<string> {
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

  private generateAccessToken(admin: Admin, sessionId: string): string {
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

  private generateRefreshToken(admin: Admin, sessionId: string): string {
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
