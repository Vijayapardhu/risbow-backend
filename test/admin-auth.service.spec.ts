import { Test, TestingModule } from '@nestjs/testing';
import { AdminAuthService } from '../src/admin/auth/admin-auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock Prisma Service
const mockPrismaService = {
  adminUser: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  adminSession: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  adminLoginAttempt: {
    count: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  adminAuditLog: {
    create: jest.fn(),
  },
};

// Mock JWT Service
const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

// Mock Config Service
const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, any> = {
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_REFRESH_EXPIRES_IN: '7d',
      ADMIN_LOGIN_MAX_ATTEMPTS: 5,
      ADMIN_LOGIN_LOCKOUT_MINUTES: 30,
    };
    return config[key];
  }),
};

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let prismaService: typeof mockPrismaService;
  let jwtService: typeof mockJwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AdminAuthService>(AdminAuthService);
    prismaService = mockPrismaService;
    jwtService = mockJwtService;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('validateAdmin', () => {
    const mockAdmin = {
      id: 'admin-123',
      email: 'admin@test.com',
      password: bcrypt.hashSync('password123', 10),
      isActive: true,
      lockedUntil: null,
      role: 'ADMIN',
      mfaEnabled: false,
      firstName: 'Test',
      lastName: 'Admin',
    };

    it('should return admin for valid credentials', async () => {
      prismaService.adminUser.findUnique.mockResolvedValue(mockAdmin);
      prismaService.adminLoginAttempt.count.mockResolvedValue(0);
      prismaService.adminLoginAttempt.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.validateAdmin('admin@test.com', 'password123');

      expect(result).toBeDefined();
      expect(result.email).toBe('admin@test.com');
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      prismaService.adminUser.findUnique.mockResolvedValue(null);

      await expect(
        service.validateAdmin('invalid@test.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive admin', async () => {
      prismaService.adminUser.findUnique.mockResolvedValue({
        ...mockAdmin,
        isActive: false,
      });

      await expect(
        service.validateAdmin('admin@test.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for locked account', async () => {
      prismaService.adminUser.findUnique.mockResolvedValue({
        ...mockAdmin,
        lockedUntil: new Date(Date.now() + 3600000), // Locked for 1 hour
      });

      await expect(
        service.validateAdmin('admin@test.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prismaService.adminUser.findUnique.mockResolvedValue(mockAdmin);
      prismaService.adminLoginAttempt.count.mockResolvedValue(0);
      prismaService.adminLoginAttempt.create.mockResolvedValue({});

      await expect(
        service.validateAdmin('admin@test.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should lock account after max failed attempts', async () => {
      prismaService.adminUser.findUnique.mockResolvedValue(mockAdmin);
      prismaService.adminLoginAttempt.count.mockResolvedValue(4); // 4 previous attempts
      prismaService.adminLoginAttempt.create.mockResolvedValue({});
      prismaService.adminUser.update.mockResolvedValue({});

      await expect(
        service.validateAdmin('admin@test.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);

      expect(prismaService.adminUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockAdmin.id },
          data: expect.objectContaining({
            lockedUntil: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('login', () => {
    const mockAdmin = {
      id: 'admin-123',
      email: 'admin@test.com',
      role: 'ADMIN',
      mfaEnabled: false,
      firstName: 'Test',
      lastName: 'Admin',
    };

    it('should return access and refresh tokens', async () => {
      const mockSession = {
        id: 'session-123',
        refreshToken: 'hashed-refresh',
      };

      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      prismaService.adminSession.create.mockResolvedValue(mockSession);
      prismaService.adminAuditLog.create.mockResolvedValue({});

      const result = await service.login(mockAdmin as any, {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.admin).toBeDefined();
    });

    it('should require MFA if enabled', async () => {
      const mfaAdmin = { ...mockAdmin, mfaEnabled: true };

      const result = await service.login(mfaAdmin as any, {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(result.requiresMfa).toBe(true);
      expect(result.tempToken).toBeDefined();
      expect(result.accessToken).toBeUndefined();
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token', async () => {
      const mockSession = {
        id: 'session-123',
        refreshToken: bcrypt.hashSync('valid-refresh-token', 10),
        expiresAt: new Date(Date.now() + 3600000),
        admin: {
          id: 'admin-123',
          email: 'admin@test.com',
          role: 'ADMIN',
          isActive: true,
        },
      };

      jwtService.verify.mockReturnValue({ sessionId: 'session-123' });
      prismaService.adminSession.findUnique.mockResolvedValue(mockSession);
      jwtService.sign.mockReturnValueOnce('new-access').mockReturnValueOnce('new-refresh');
      prismaService.adminSession.update.mockResolvedValue({});

      const result = await service.refreshToken('valid-refresh-token');

      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
    });

    it('should throw for invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw for expired session', async () => {
      const mockSession = {
        id: 'session-123',
        refreshToken: bcrypt.hashSync('valid-refresh-token', 10),
        expiresAt: new Date(Date.now() - 3600000), // Expired
        admin: {
          id: 'admin-123',
          isActive: true,
        },
      };

      jwtService.verify.mockReturnValue({ sessionId: 'session-123' });
      prismaService.adminSession.findUnique.mockResolvedValue(mockSession);

      await expect(service.refreshToken('valid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    const mockAdmin = {
      id: 'admin-123',
      password: bcrypt.hashSync('currentpassword', 10),
    };

    it('should change password successfully', async () => {
      prismaService.adminUser.findUnique.mockResolvedValue(mockAdmin);
      prismaService.adminUser.update.mockResolvedValue({});
      prismaService.adminSession.updateMany.mockResolvedValue({});
      prismaService.adminAuditLog.create.mockResolvedValue({});

      await expect(
        service.changePassword('admin-123', 'currentpassword', 'newpassword123'),
      ).resolves.not.toThrow();
    });

    it('should throw for incorrect current password', async () => {
      prismaService.adminUser.findUnique.mockResolvedValue(mockAdmin);

      await expect(
        service.changePassword('admin-123', 'wrongpassword', 'newpassword123'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
