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

describe('Review Flow (e2e)', () => {
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

        customerToken = await loginAsCustomer(app, 'review@test.com');
        adminToken = await loginAsAdmin(app);

        const user = await prisma.user.findUnique({ where: { email: 'review@test.com' } });
        userId = user.id;

        testProduct = await createTestProduct(prisma, {
            name: 'Test Review Product',
            price: 1500,
            stock: 100
        });

        testAddress = await createTestAddress(prisma, userId);

        // Create and complete an order
        await createTestCart(prisma, userId, testProduct.id, 1);

        const checkoutResponse = await request(app.getHttpServer())
            .post('/api/v1/checkout')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                paymentMode: 'COD',
                shippingAddressId: testAddress.id
            });

        orderId = checkoutResponse.body.id;

        // Mark order as delivered
        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'DELIVERED' }
        });
    });

    describe('Review Creation', () => {
        it('should create product review for purchased product', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/reviews')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    productId: testProduct.id,
                    rating: 5,
                    comment: 'Excellent product!',
                    orderId
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.productId).toBe(testProduct.id);
            expect(response.body.rating).toBe(5);
            expect(response.body.status).toBe('PENDING');
        });

        it('should reject review with invalid rating', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/reviews')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    productId: testProduct.id,
                    rating: 6, // Invalid: should be 1-5
                    comment: 'Test',
                    orderId
                })
                .expect(400);
        });

        it('should reject duplicate review for same product', async () => {
            // Create first review
            await request(app.getHttpServer())
                .post('/api/v1/reviews')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    productId: testProduct.id,
                    rating: 5,
                    comment: 'First review',
                    orderId
                })
                .expect(201);

            // Try to create duplicate
            await request(app.getHttpServer())
                .post('/api/v1/reviews')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    productId: testProduct.id,
                    rating: 4,
                    comment: 'Second review',
                    orderId
                })
                .expect(400);
        });

        it('should reject review without purchase', async () => {
            const anotherProduct = await createTestProduct(prisma, {
                name: 'Another Product',
                price: 1000
            });

            await request(app.getHttpServer())
                .post('/api/v1/reviews')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    productId: anotherProduct.id,
                    rating: 5,
                    comment: 'Never bought this',
                    orderId
                })
                .expect(400);
        });
    });

    describe('Review Approval/Rejection', () => {
        let reviewId: string;

        beforeEach(async () => {
            const reviewResponse = await request(app.getHttpServer())
                .post('/api/v1/reviews')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    productId: testProduct.id,
                    rating: 5,
                    comment: 'Great product!',
                    orderId
                });

            reviewId = reviewResponse.body.id;
        });

        it('should approve review', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/admin/reviews/${reviewId}/approve`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.status).toBe('APPROVED');

            const review = await prisma.review.findUnique({
                where: { id: reviewId }
            });

            expect(review.status).toBe('APPROVED');
        });

        it('should reject review', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/api/v1/admin/reviews/${reviewId}/reject`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    reason: 'Inappropriate content'
                })
                .expect(200);

            expect(response.body.status).toBe('REJECTED');

            const review = await prisma.review.findUnique({
                where: { id: reviewId }
            });

            expect(review.status).toBe('REJECTED');
        });
    });

    describe('Review Listing', () => {
        beforeEach(async () => {
            // Create multiple reviews
            await request(app.getHttpServer())
                .post('/api/v1/reviews')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    productId: testProduct.id,
                    rating: 5,
                    comment: 'Review 1',
                    orderId
                });
        });

        it('should list product reviews', async () => {
            // Approve the review first
            const reviews = await prisma.review.findMany({
                where: { productId: testProduct.id }
            });

            await prisma.review.update({
                where: { id: reviews[0].id },
                data: { status: 'APPROVED' }
            });

            const response = await request(app.getHttpServer())
                .get(`/api/v1/reviews/product/${testProduct.id}`)
                .expect(200);

            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0].status).toBe('APPROVED');
        });

        it('should list user reviews', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/reviews/my')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThan(0);
        });

        it('should list pending reviews for admin', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/admin/reviews?status=PENDING')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toBeInstanceOf(Array);
        });

        it('should filter reviews by rating', async () => {
            // Approve review
            const reviews = await prisma.review.findMany({
                where: { productId: testProduct.id }
            });

            await prisma.review.update({
                where: { id: reviews[0].id },
                data: { status: 'APPROVED' }
            });

            const response = await request(app.getHttpServer())
                .get(`/api/v1/reviews/product/${testProduct.id}?rating=5`)
                .expect(200);

            expect(response.body).toBeInstanceOf(Array);
            response.body.forEach(review => {
                expect(review.rating).toBe(5);
            });
        });
    });

    describe('Review Statistics', () => {
        it('should calculate average rating correctly', async () => {
            // Create multiple reviews with different ratings
            const ratings = [5, 4, 5, 3, 4];

            for (const rating of ratings) {
                const customer = await loginAsCustomer(app, `customer${rating}@test.com`);
                const user = await prisma.user.findUnique({
                    where: { email: `customer${rating}@test.com` }
                });

                // Create order for each user
                await createTestCart(prisma, user.id, testProduct.id, 1);
                const addr = await createTestAddress(prisma, user.id);

                const orderResp = await request(app.getHttpServer())
                    .post('/api/v1/checkout')
                    .set('Authorization', `Bearer ${customer}`)
                    .send({
                        paymentMode: 'COD',
                        shippingAddressId: addr.id
                    });

                await prisma.order.update({
                    where: { id: orderResp.body.id },
                    data: { status: 'DELIVERED' }
                });

                // Create review
                const reviewResp = await request(app.getHttpServer())
                    .post('/api/v1/reviews')
                    .set('Authorization', `Bearer ${customer}`)
                    .send({
                        productId: testProduct.id,
                        rating,
                        comment: `Rating ${rating}`,
                        orderId: orderResp.body.id
                    });

                // Approve review
                await prisma.review.update({
                    where: { id: reviewResp.body.id },
                    data: { status: 'APPROVED' }
                });
            }

            // Get product with average rating
            const response = await request(app.getHttpServer())
                .get(`/api/v1/products/${testProduct.id}`)
                .expect(200);

            // Average of [5, 4, 5, 3, 4] = 4.2
            expect(response.body.averageRating).toBeCloseTo(4.2, 1);
            expect(response.body.reviewCount).toBe(5);
        });
    });
});
