import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import request from 'supertest';

/**
 * Test utilities for integration tests
 */

let app: INestApplication;
let prisma: PrismaService;

/**
 * Initialize the test application
 */
export async function initTestApp(moduleRef: TestingModule): Promise<INestApplication> {
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
    return app;
}

/**
 * Clean up test application
 */
export async function closeTestApp() {
    if (app) {
        await app.close();
    }
}

/**
 * Authentication helpers
 */
export async function loginAsAdmin(application: INestApplication): Promise<string> {
    const prismaService = application.get<PrismaService>(PrismaService);

    // Ensure admin user exists
    const bcrypt = require('bcrypt');
    await prismaService.user.upsert({
        where: { email: 'admin@risbow.com' },
        create: {
            email: 'admin@risbow.com',
            password: await bcrypt.hash('password123', 10),
            name: 'Admin User',
            mobile: '9999999999',
            role: 'ADMIN',
            status: 'ACTIVE'
        },
        update: {}
    });

    const response = await request(application.getHttpServer())
        .post('/auth/login')
        .send({
            email: 'admin@risbow.com',
            password: 'password123'
        })
        .expect(200);

    return response.body.accessToken;
}

export async function loginAsCustomer(application: INestApplication, email: string = 'customer@test.com'): Promise<string> {
    const prismaService = application.get<PrismaService>(PrismaService);
    const bcrypt = require('bcrypt');

    // Ensure customer user exists
    await prismaService.user.upsert({
        where: { email },
        create: {
            email,
            password: await bcrypt.hash('password123', 10),
            name: 'Test Customer',
            mobile: '9876543210',
            role: 'CUSTOMER',
            status: 'ACTIVE'
        },
        update: {}
    });

    const response = await request(application.getHttpServer())
        .post('/auth/login')
        .send({
            email,
            password: 'password123'
        });

    return response.body.accessToken;
}

/**
 * Database cleanup utilities
 */
export async function cleanDatabase(prismaService: PrismaService) {
    // Delete in correct order to avoid foreign key constraints
    await prismaService.order.deleteMany();
    await prismaService.refund.deleteMany();
    await prismaService.payment.deleteMany();
    await prismaService.cartItem.deleteMany();
    await prismaService.cart.deleteMany();
    await prismaService.review.deleteMany();
    await prismaService.coupon.deleteMany({ where: { code: { startsWith: 'TEST' } } });
    await prismaService.giftSKU.deleteMany({ where: { title: { startsWith: 'Test' } } });
    await prismaService.product.deleteMany({ where: { title: { startsWith: 'Test' } } });
    await prismaService.user.deleteMany({ where: { email: { contains: 'test.com' } } });
}

/**
 * Test data factories
 */
export async function createTestProduct(prismaService: PrismaService, overrides: any = {}) {
    return prismaService.product.create({
        data: {
            title: overrides.title || overrides.name || 'Test Product',
            description: 'Test product description',
            price: overrides.price || 1000,
            stock: overrides.stock || 100,
            categoryId: overrides.categoryId || 'cat_test',
            images: ['https://example.com/test.jpg'],
            isActive: true,
            ...overrides
        }
    });
}

export async function createTestCoupon(prismaService: PrismaService, overrides: any = {}) {
    return prismaService.coupon.create({
        data: {
            code: overrides.code || 'TEST50',
            description: 'Test coupon',
            discountType: overrides.discountType || 'PERCENTAGE',
            discountValue: overrides.discountValue || 50,
            minOrderAmount: overrides.minOrderAmount || 500,
            maxDiscount: overrides.maxDiscount || 200,
            validFrom: new Date(),
            validUntil: overrides.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            usageLimit: overrides.usageLimit || 100,
            isActive: overrides.isActive !== undefined ? overrides.isActive : true,
            ...overrides
        }
    });
}

export async function createTestGift(prismaService: PrismaService, overrides: any = {}) {
    return prismaService.giftSKU.create({
        data: {
            title: overrides.title || 'Test Gift',
            stock: overrides.stock || 50,
            cost: overrides.cost || 500,
            eligibleCategories: overrides.eligibleCategories || ['cat_test'],
            ...overrides
        }
    });
}

/**
 * Create a test user with hashed password
 */
export async function createTestUser(prismaService: PrismaService, overrides: any = {}) {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(overrides.password || 'password123', 10);

    return prismaService.user.create({
        data: {
            name: overrides.name || 'Test User',
            email: overrides.email || `test${Date.now()}@test.com`,
            mobile: overrides.mobile || '9876543210',
            password: hashedPassword,
            role: overrides.role || 'CUSTOMER',
            status: overrides.status || 'ACTIVE',
            ...overrides
        }
    });
}

export async function createTestCart(prismaService: PrismaService, userId: string, productId: string, quantity: number = 2) {
    const cart = await prismaService.cart.upsert({
        where: { userId },
        create: { userId },
        update: {}
    });

    await prismaService.cartItem.create({
        data: {
            cartId: cart.id,
            productId,
            quantity
        }
    });

    return cart;
}

export async function createTestAddress(prismaService: PrismaService, userId: string) {
    return prismaService.address.create({
        data: {
            userId,
            name: 'Test User',
            phone: '9876543210',
            mobile: '9876543210',
            addressLine1: '123 Test Street',
            city: 'Test City',
            state: 'Test State',
            pincode: '123456',
            label: 'HOME',
            isDefault: true
        }
    });
}

/**
 * Helper to get cart total
 */
export async function getCartTotal(prismaService: PrismaService, userId: string): Promise<number> {
    const cart = await prismaService.cart.findUnique({
        where: { userId },
        include: {
            items: {
                include: {
                    product: true
                }
            }
        }
    });

    if (!cart) return 0;

    return cart.items.reduce((total, item) => {
        return total + (item.product.price * item.quantity);
    }, 0);
}

/**
 * Wait helper for async operations
 */
export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
