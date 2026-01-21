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
    createTestCart,
    createTestAddress
} from './test-utils';

describe('Refund Flow (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let customerToken: string;
    let adminToken: string;
    let testProduct: any;
    let testAddress: any;
    let userId: string;
    let orderId: string;

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

        customerToken = await loginAsCustomer(app, 'refund@test.com');
        adminToken = await loginAsAdmin(app);

        const user = await prisma.user.findUnique({ where: { email: 'refund@test.com' } });
        userId = user.id;

        testProduct = await createTestProduct(prisma, {
            name: 'Test Refund Product',
            price: 2000,
            stock: 100
        });

        testAddress = await createTestAddress(prisma, userId);

        // Create an order
        await createTestCart(prisma, userId, testProduct.id, 1);

        const checkoutResponse = await request(app.getHttpServer())
            .post('/api/v1/checkout')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                paymentMode: 'ONLINE',
                shippingAddressId: testAddress.id
            });

        orderId = checkoutResponse.body.id;
    });

    describe('Refund Request Creation', () => {
        it('should create refund request for valid order', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/refunds')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    orderId,
                    reason: 'Product defective',
                    amount: 2000
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.orderId).toBe(orderId);
            expect(response.body.status).toBe('PENDING');
            expect(response.body.amount).toBe(2000);
        });

        it('should reject refund for non-existent order', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/refunds')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    orderId: 'invalid_order_id',
                    reason: 'Test',
                    amount: 1000
                })
                .expect(404);
        });

        it('should reject duplicate refund request', async () => {
            // Create first refund
            await request(app.getHttpServer())
                .post('/api/v1/refunds')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    orderId,
                    reason: 'Product defective',
                    amount: 2000
                })
                .expect(201);

            // Try to create duplicate
            await request(app.getHttpServer())
                .post('/api/v1/refunds')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    orderId,
                    reason: 'Changed mind',
                    amount: 2000
                })
                .expect(400);
        });
    });

    describe('Refund Processing', () => {
        let refundId: string;

        beforeEach(async () => {
            const refundResponse = await request(app.getHttpServer())
                .post('/api/v1/refunds')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    orderId,
                    reason: 'Product defective',
                    amount: 2000
                });

            refundId = refundResponse.body.id;
        });

        it('should approve refund request', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/refunds/${refundId}/approve`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.status).toBe('APPROVED');

            // Verify refund status in database
            const refund = await prisma.refund.findUnique({
                where: { id: refundId }
            });

            expect(refund.status).toBe('APPROVED');
        });

        it('should reject refund request', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/refunds/${refundId}/reject`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    reason: 'Does not meet refund policy'
                })
                .expect(200);

            expect(response.body.status).toBe('REJECTED');

            const refund = await prisma.refund.findUnique({
                where: { id: refundId }
            });

            expect(refund.status).toBe('REJECTED');
        });

        it('should process approved refund', async () => {
            // Approve refund
            await request(app.getHttpServer())
                .patch(`/api/v1/refunds/${refundId}/approve`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // Process refund
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/refunds/${refundId}/process`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    transactionId: 'TXN123456'
                })
                .expect(200);

            expect(response.body.status).toBe('PROCESSED');

            const refund = await prisma.refund.findUnique({
                where: { id: refundId }
            });

            expect(refund.status).toBe('PROCESSED');
        });
    });

    describe('Refund Validation', () => {
        it('should calculate partial refund correctly', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/refunds')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    orderId,
                    reason: 'Partial return',
                    amount: 1000 // Half of order amount
                })
                .expect(201);

            expect(response.body.amount).toBe(1000);
            expect(response.body.refundType).toBe('PARTIAL');
        });

        it('should reject refund amount greater than order total', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/refunds')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    orderId,
                    reason: 'Test',
                    amount: 5000 // More than order amount
                })
                .expect(400);
        });
    });

    describe('Refund Listing', () => {
        it('should list user refunds', async () => {
            // Create multiple refunds
            await request(app.getHttpServer())
                .post('/api/v1/refunds')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    orderId,
                    reason: 'Refund 1',
                    amount: 2000
                });

            const response = await request(app.getHttpServer())
                .get('/api/v1/refunds')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThan(0);
        });

        it('should list all refunds for admin', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/admin/refunds')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toBeInstanceOf(Array);
        });
    });
});
