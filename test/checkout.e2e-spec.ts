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
    createTestProduct,
    createTestCoupon,
    createTestGift,
    createTestCart,
    createTestAddress,
    getCartTotal
} from './test-utils';

describe('Checkout Flow (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let customerToken: string;
    let testProduct: any;
    let testCoupon: any;
    let testGift: any;
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

        // Create test data
        customerToken = await loginAsCustomer(app, 'checkout@test.com');

        // Get user ID
        const user = await prisma.user.findUnique({ where: { email: 'checkout@test.com' } });
        userId = user.id;

        // Create test product
        testProduct = await createTestProduct(prisma, {
            name: 'Test Checkout Product',
            price: 1200,
            stock: 100,
            categoryId: 'cat_electronics'
        });

        // Create test coupon
        testCoupon = await createTestCoupon(prisma, {
            code: 'TESTCHECKOUT50',
            discountType: 'PERCENTAGE',
            discountValue: 50,
            maxDiscount: 200,
            minOrderAmount: 500
        });

        // Create test gift
        testGift = await createTestGift(prisma, {
            title: 'Test Checkout Gift',
            stock: 50,
            cost: 500,
            eligibleCategories: ['cat_electronics']
        });

        // Create test address
        testAddress = await createTestAddress(prisma, userId);

        // Add product to cart
        await createTestCart(prisma, userId, testProduct.id, 2);
    });

    describe('COD Checkout', () => {
        it('should successfully complete COD checkout', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/checkout')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    paymentMode: 'COD',
                    shippingAddressId: testAddress.id
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.paymentMode).toBe('COD');
            expect(response.body.status).toBe('PENDING');
            expect(response.body.totalAmount).toBe(2400); // 1200 * 2

            // Verify order was created
            const order = await prisma.order.findUnique({
                where: { id: response.body.id }
            });
            expect(order).toBeDefined();
            expect(order.userId).toBe(userId);
        });

        it('should fail checkout with empty cart', async () => {
            // Clear cart
            await prisma.cartItem.deleteMany({ where: { cart: { userId } } });

            await request(app.getHttpServer())
                .post('/api/v1/checkout')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    paymentMode: 'COD',
                    shippingAddressId: testAddress.id
                })
                .expect(400);
        });

        it('should fail checkout with insufficient stock', async () => {
            // Update product stock to 0
            await prisma.product.update({
                where: { id: testProduct.id },
                data: { stock: 0 }
            });

            await request(app.getHttpServer())
                .post('/api/v1/checkout')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    paymentMode: 'COD',
                    shippingAddressId: testAddress.id
                })
                .expect(400);
        });
    });

    describe('Online Payment Checkout', () => {
        it('should create order with online payment mode', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/checkout')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    paymentMode: 'ONLINE',
                    shippingAddressId: testAddress.id
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('razorpayOrderId');
            expect(response.body.paymentMode).toBe('ONLINE');
            expect(response.body.status).toBe('PENDING');
        });
    });

    describe('Gift Selection', () => {
        it('should successfully select gift during checkout', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/checkout/select-gift')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    giftId: testGift.id
                })
                .expect(201);

            expect(response.body.message).toContain('Gift selected successfully');
            expect(response.body.giftId).toBe(testGift.id);
        });

        it('should reject invalid gift ID', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/checkout/select-gift')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    giftId: 'invalid_gift_id'
                })
                .expect(404);
        });

        it('should reject gift with insufficient stock', async () => {
            // Update gift stock to 0
            await prisma.giftSKU.update({
                where: { id: testGift.id },
                data: { stock: 0 }
            });

            await request(app.getHttpServer())
                .post('/api/v1/checkout/select-gift')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    giftId: testGift.id
                })
                .expect(400);
        });
    });

    describe('Coupon Application', () => {
        it('should successfully apply valid coupon', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/checkout/apply-coupon')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    code: 'TESTCHECKOUT50'
                })
                .expect(201);

            expect(response.body.isValid).toBe(true);
            expect(response.body.discountAmount).toBe(200); // 50% of 2400 = 1200, capped at 200
            expect(response.body.finalAmount).toBe(2200); // 2400 - 200
        });

        it('should reject expired coupon', async () => {
            // Create expired coupon
            const expiredCoupon = await createTestCoupon(prisma, {
                code: 'EXPIRED50',
                validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
            });

            const response = await request(app.getHttpServer())
                .post('/api/v1/checkout/apply-coupon')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    code: 'EXPIRED50'
                })
                .expect(400);

            expect(response.body.message).toContain('expired');
        });

        it('should reject coupon with min order amount not met', async () => {
            // Create coupon with high min order amount
            const highMinCoupon = await createTestCoupon(prisma, {
                code: 'HIGHMIN50',
                minOrderAmount: 5000
            });

            const response = await request(app.getHttpServer())
                .post('/api/v1/checkout/apply-coupon')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    code: 'HIGHMIN50'
                })
                .expect(400);

            expect(response.body.message).toContain('Minimum order amount');
        });

        it('should reject inactive coupon', async () => {
            // Create inactive coupon
            const inactiveCoupon = await createTestCoupon(prisma, {
                code: 'INACTIVE50',
                isActive: false
            });

            await request(app.getHttpServer())
                .post('/api/v1/checkout/apply-coupon')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    code: 'INACTIVE50'
                })
                .expect(404);
        });
    });

    describe('Complete Checkout with Gift and Coupon', () => {
        it('should complete checkout with both gift and coupon applied', async () => {
            // Select gift
            await request(app.getHttpServer())
                .post('/api/v1/checkout/select-gift')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ giftId: testGift.id })
                .expect(201);

            // Apply coupon
            await request(app.getHttpServer())
                .post('/api/v1/checkout/apply-coupon')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ code: 'TESTCHECKOUT50' })
                .expect(201);

            // Complete checkout
            const response = await request(app.getHttpServer())
                .post('/api/v1/checkout')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    paymentMode: 'COD',
                    shippingAddressId: testAddress.id
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');

            // Note: Actual discount application and gift attachment would need
            // to be implemented in the checkout service
        });
    });

    describe('Stock Decrement', () => {
        it('should decrement product stock after successful checkout', async () => {
            const initialStock = testProduct.stock;

            await request(app.getHttpServer())
                .post('/api/v1/checkout')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    paymentMode: 'COD',
                    shippingAddressId: testAddress.id
                })
                .expect(201);

            // Verify stock was decremented
            const updatedProduct = await prisma.product.findUnique({
                where: { id: testProduct.id }
            });

            expect(updatedProduct.stock).toBe(initialStock - 2); // Ordered quantity was 2
        });
    });
});
