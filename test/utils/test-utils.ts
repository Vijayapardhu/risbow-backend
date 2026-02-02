/**
 * Test Utilities for RisBow Admin Panel
 * 
 * Common utilities, mocks, and helpers for testing admin modules.
 */

import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

/**
 * Create a mock admin user for testing
 */
export function createMockAdmin(overrides: Partial<any> = {}) {
  return {
    id: 'admin-test-123',
    email: 'test@risbow.com',
    password: bcrypt.hashSync('password123', 10),
    firstName: 'Test',
    lastName: 'Admin',
    role: 'ADMIN',
    isActive: true,
    mfaEnabled: false,
    mfaSecret: null,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock vendor for testing
 */
export function createMockVendor(overrides: Partial<any> = {}) {
  return {
    id: 'vendor-test-123',
    userId: 'user-test-123',
    storeName: 'Test Store',
    isActive: true,
    isVerified: true,
    isBanned: false,
    suspendedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-test-123',
    email: 'user@test.com',
    phone: '+919876543210',
    firstName: 'Test',
    lastName: 'User',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    coinBalance: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock order for testing
 */
export function createMockOrder(overrides: Partial<any> = {}) {
  return {
    id: 'order-test-123',
    userId: 'user-test-123',
    vendorId: 'vendor-test-123',
    totalAmount: 1000,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock product for testing
 */
export function createMockProduct(overrides: Partial<any> = {}) {
  return {
    id: 'product-test-123',
    vendorId: 'vendor-test-123',
    name: 'Test Product',
    description: 'A test product',
    price: 100,
    stock: 50,
    sku: 'TEST-SKU-001',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Mock Prisma Service factory
 */
export function createMockPrismaService(): Partial<PrismaService> {
  return {
    adminUser: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    } as any,
    adminSession: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    } as any,
    adminAuditLog: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    } as any,
    adminLoginAttempt: {
      count: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    } as any,
    vendorStrike: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    } as any,
    vendor: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    } as any,
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    } as any,
    coinTransaction: {
      findMany: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    } as any,
    coinConfig: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as any,
    bannerCampaign: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any,
    bannerMetric: {
      aggregate: jest.fn(),
      upsert: jest.fn(),
    } as any,
    contentFlag: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    } as any,
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    } as any,
    order: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    } as any,
    orderItem: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    } as any,
    review: {
      aggregate: jest.fn(),
    } as any,
  };
}

/**
 * Mock JWT Service factory
 */
export function createMockJwtService(): Partial<JwtService> {
  return {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn().mockReturnValue({ sub: 'admin-test-123', sessionId: 'session-123' }),
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    verifyAsync: jest.fn().mockResolvedValue({ sub: 'admin-test-123', sessionId: 'session-123' }),
  };
}

/**
 * Create JWT token for testing
 */
export function createTestToken(
  payload: { sub: string; email: string; role: string; sessionId: string },
  secret = 'test-secret',
) {
  const jwtService = new JwtService({ secret });
  return jwtService.sign(payload);
}

/**
 * Date utilities for testing
 */
export const dateUtils = {
  daysAgo: (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  },
  daysFromNow: (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  },
  hoursAgo: (hours: number) => {
    const date = new Date();
    date.setHours(date.getHours() - hours);
    return date;
  },
  hoursFromNow: (hours: number) => {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date;
  },
};

/**
 * Reset all mocks in a mock service
 */
export function resetMocks(mockService: any) {
  Object.keys(mockService).forEach((key) => {
    if (mockService[key] && typeof mockService[key] === 'object') {
      Object.keys(mockService[key]).forEach((method) => {
        if (jest.isMockFunction(mockService[key][method])) {
          mockService[key][method].mockReset();
        }
      });
    }
  });
}
