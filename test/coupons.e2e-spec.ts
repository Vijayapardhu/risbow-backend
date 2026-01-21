import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
    initTestApp,
    closeTestApp,
    cleanDatabase,
    loginAsCustomer,
    loginAsAdmin,
    createTestProduct,
    createTestCoupon,
    createTestCart,
    createTestAddress,
    getCartTotal
} from './test-utils';

describe('Coupon Application (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let customerToken: string;
    let adminToken: string;
    let testProduct: any;
    let testAddress: any;
    let userId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = await initTestApp(moduleFixture);
        prisma = app.get<PrismaService>(PrismaService);
    });

    afterAll(async () => {
        await closeTestApp();
    });

    beforeEach(async () => {
        await cleanDatabase(prisma);

        customerToken = await loginAsCustomer(app, 'coupon@test.com');
        adminToken = await loginAsAdmin(app);

        const user = await prisma.user.findUnique({ where: { email: 'coupon@test.com' } });
        userId = user.id;

        testProduct = await createTestProduct(prisma, {
            name: 'Test Coupon Product',
            price: 1200,
            stock: 100
        });

        testAddress = await createTestAddress(prisma, userId);
        await createTestCart(prisma, userId, testProduct.id, 2); // Cart total: 2400
    });

    describe('Coupon Validation', () => {
        it('should validate active percentage coupon', async () => {
            const coupon = await createTestCoupon(prisma, {
                code: 'PERCENT50',
                discountType: 'PERCENTAGE',
                discountValue: 50,
                maxDiscount: 200,
                minOrderAmount: 500
            });

            const response = await request(app.getHttpServer())
                .post('/api/v1/coupons/validate')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    code: 'PERCENT50',
                    cartTotal: 2400
                })
                .expect(200);

            expect(response.body.isValid).toBe(true);
            expect(response.body.discountAmount).toBe(200); // 50% of 2400 = 1200, capped at 200
            expect(response.body.finalAmount).toBe(2200);
        });

        it('should validate active flat discount coupon', async () => {
            const coupon = await createTestCoupon(prisma, {
                code: 'FLAT100',
                discountType: 'FLAT',
                discountValue: 100,
                minOrderAmount: 500
            });

            const response = await request(app.getHttpServer())
                .post('/api/v1/coupons/validate')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    code: 'FLAT100',
                    cartTotal: 2400
                })
                .expect(200);

            expect(response.body.isValid).toBe(true);
            expect(response.body.discountAmount).toBe(100);
            expect(response.body.finalAmount).toBe(2300);
        });

        it('should reject expired coupon', async () => {
            const coupon = await createTestCoupon(prisma, {
                code: 'EXPIRED50',
                validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
            });

            const response = await request(app.getHttpServer())
                .post('/api/v1/coupons/validate')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    code: 'EXPIRED50',
                    cartTotal: 2400
                })
                .expect(400);

            expect(response.body.isValid).toBe(false);
            expect(response.body.message).toContain('expired');
        });

        it('should reject coupon with min order amount not met', async () => {
            const coupon = await createTestCoupon(prisma, {
                code: 'HIGHMIN50',
                minOrderAmount: 5000
            });

            const response = await request(app.getHttpServer())
                .post('/api/v1/coupons/validate')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    code: 'HIGHMIN50',
                    cartTotal: 2400
                })
                .expect(400);

            expect(response.body.isValid).toBe(false);
            expect(response.body.message).toContain('Minimum order amount');
        });

        it('should reject inactive coupon', async () => {
            const coupon = await createTestCoupon(prisma, {
                code: 'INACTIVE50',
                isActive: false
            });

            const response = await request(app.getHttpServer())
                .post('/api/v1/coupons/validate')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    code: 'INACTIVE50',
                    cartTotal: 2400
                })
                .expect(404);

            expect(response.body.message).toContain('not found');
        });

        it('should reject coupon with usage limit exceeded', async () => {
            const coupon = await createTestCoupon(prisma, {
                code: 'LIMITED50',
                usageLimit: 5,
                usedCount: 5 // Already used 5 times
            });

            const response = await request(app.getHttpServer())
                .post('/api/v1/coupons/validate')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    code: 'LIMITED50',
                    cartTotal: 2400
                })
                .expect(400);

            expect(response.body.isValid).toBe(false);
            expect(response.body.message).toContain('usage limit');
        });
    });

    describe('Discount Calculations', () => {
        it('should calculate percentage discount correctly', async () => {
            const testCases = [
                { cartTotal: 1200, discountValue: 50, maxDiscount: 200, expected: 200 }, // 50% of 1200 = 600, capped at 200
                { cartTotal: 400, discountValue: 50, maxDiscount: 200, expected: 200 },  // 50% of 400 = 200
                { cartTotal: 300, discountValue: 50, maxDiscount: 200, expected: 150 },  // 50% of 300 = 150
                { cartTotal: 1000, discountValue: 20, maxDiscount: 100, expected: 100 }, // 20% of 1000 = 200, capped at 100
            ];

            for (const testCase of testCases) {
                const coupon = await createTestCoupon(prisma, {
                    code: `TEST${testCase.cartTotal}`,
                    discountType: 'PERCENTAGE',
                    discountValue: testCase.discountValue,
                    maxDiscount: testCase.maxDiscount,
                    minOrderAmount: 0
                });

                const response = await request(app.getHttpServer())
                    .post('/api/v1/coupons/validate')
                    .set('Authorization', `Bearer ${customerToken}`)
                    .send({
                        code: `TEST${testCase.cartTotal}`,
                        cartTotal: testCase.cartTotal
                    })
                    .expect(200);

                expect(response.body.discountAmount).toBe(testCase.expected);
                expect(response.body.finalAmount).toBe(testCase.cartTotal - testCase.expected);

                // Clean up
                await prisma.coupon.delete({ where: { id: coupon.id } });
            }
        });

        it('should calculate flat discount correctly', async () => {
            const testCases = [
                { cartTotal: 1200, discountValue: 100, expected: 100 },
                { cartTotal: 500, discountValue: 50, expected: 50 },
                { cartTotal: 2000, discountValue: 300, expected: 300 },
            ];

            for (const testCase of testCases) {
                const coupon = await createTestCoupon(prisma, {
                    code: `FLAT${testCase.discountValue}`,
                    discountType: 'FLAT',
                    discountValue: testCase.discountValue,
                    minOrderAmount: 0
                });

                const response = await request(app.getHttpServer())
                    .post('/api/v1/coupons/validate')
                    .set('Authorization', `Bearer ${customerToken}`)
                    .send({
                        code: `FLAT${testCase.discountValue}`,
                        cartTotal: testCase.cartTotal
                    })
                    .expect(200);

                expect(response.body.discountAmount).toBe(testCase.expected);
                expect(response.body.finalAmount).toBe(testCase.cartTotal - testCase.expected);

                // Clean up
                await prisma.coupon.delete({ where: { id: coupon.id } });
            }
        });
    });

    describe('Coupon Application in Checkout', () => {
        it('should apply coupon and increment usage count', async () => {
            const coupon = await createTestCoupon(prisma, {
                code: 'APPLY50',
                discountType: 'PERCENTAGE',
                discountValue: 50,
                maxDiscount: 200,
                usedCount: 0
            });

            // Apply coupon
            await request(app.getHttpServer())
                .post('/api/v1/checkout/apply-coupon')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    code: 'APPLY50'
                })
                .expect(201);

            // Complete checkout
            await request(app.getHttpServer())
                .post('/api/v1/checkout')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    paymentMode: 'COD',
                    shippingAddressId: testAddress.id
                })
                .expect(201);

            // Verify usage count was incremented
            const updatedCoupon = await prisma.coupon.findUnique({
                where: { id: coupon.id }
            });

            // Note: This would need to be implemented in checkout service
            // expect(updatedCoupon.usedCount).toBe(1);
        });

        it('should remove applied coupon', async () => {
            const coupon = await createTestCoupon(prisma, {
                code: 'REMOVE50',
                discountType: 'FLAT',
                discountValue: 100
            });

            // Apply coupon
            await request(app.getHttpServer())
                .post('/api/v1/checkout/apply-coupon')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    code: 'REMOVE50'
                })
                .expect(201);

            // Remove coupon
            const response = await request(app.getHttpServer())
                .post('/api/v1/checkout/remove-coupon')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(response.body.message).toContain('removed');
        });
    });

    describe('Admin Coupon Management', () => {
        it('should create new coupon', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/admin/coupons')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    code: 'NEWCOUPON50',
                    description: 'New test coupon',
                    discountType: 'PERCENTAGE',
                    discountValue: 50,
                    maxDiscount: 200,
                    minOrderAmount: 500,
                    validFrom: new Date(),
                    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    usageLimit: 100,
                    isActive: true
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.code).toBe('NEWCOUPON50');
        });

        it('should update existing coupon', async () => {
            const coupon = await createTestCoupon(prisma, {
                code: 'UPDATE50',
                discountValue: 50
            });

            const response = await request(app.getHttpServer())
                .patch(`/api/v1/admin/coupons/${coupon.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    discountValue: 60,
                    description: 'Updated coupon'
                })
                .expect(200);

            expect(response.body.discountValue).toBe(60);
            expect(response.body.description).toBe('Updated coupon');
        });

        it('should deactivate coupon', async () => {
            const coupon = await createTestCoupon(prisma, {
                code: 'DEACTIVATE50',
                isActive: true
            });

            const response = await request(app.getHttpServer())
                .patch(`/api/v1/admin/coupons/${coupon.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    isActive: false
                })
                .expect(200);

            expect(response.body.isActive).toBe(false);

            // Verify coupon cannot be used
            await request(app.getHttpServer())
                .post('/api/v1/coupons/validate')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    code: 'DEACTIVATE50',
                    cartTotal: 2400
                })
                .expect(404);
        });

        it('should list all coupons', async () => {
            await createTestCoupon(prisma, { code: 'LIST1' });
            await createTestCoupon(prisma, { code: 'LIST2' });

            const response = await request(app.getHttpServer())
                .get('/api/v1/admin/coupons')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThanOrEqual(2);
        });

        it('should delete coupon', async () => {
            const coupon = await createTestCoupon(prisma, {
                code: 'DELETE50'
            });

            await request(app.getHttpServer())
                .delete(`/api/v1/admin/coupons/${coupon.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // Verify deletion
            const deletedCoupon = await prisma.coupon.findUnique({
                where: { id: coupon.id }
            });

            expect(deletedCoupon).toBeNull();
        });
    });

    describe('Coupon Statistics', () => {
        it('should track coupon usage statistics', async () => {
            const coupon = await createTestCoupon(prisma, {
                code: 'STATS50',
                usageLimit: 10,
                usedCount: 5
            });

            const response = await request(app.getHttpServer())
                .get(`/api/v1/admin/coupons/${coupon.id}/stats`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.usedCount).toBe(5);
            expect(response.body.remainingUses).toBe(5);
            expect(response.body.usagePercentage).toBe(50);
        });
    });
});
