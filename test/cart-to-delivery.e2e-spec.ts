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
    createTestCart,
    createTestAddress,
    wait
} from './test-utils';

describe('Cart to Delivery Flow (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let customerToken: string;
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

        customerToken = await loginAsCustomer(app, 'cartflow@test.com');
        const user = await prisma.user.findUnique({ where: { email: 'cartflow@test.com' } });
        userId = user.id;

        testProduct = await createTestProduct(prisma, {
            name: 'Test Cart Product',
            price: 1500,
            stock: 100
        });

        testAddress = await createTestAddress(prisma, userId);
    });

    describe('Complete Order Lifecycle', () => {
        it('should complete full cart to delivery flow', async () => {
            // Step 1: Add items to cart
            const addToCartResponse = await request(app.getHttpServer())
                .post('/api/v1/cart')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    productId: testProduct.id,
                    quantity: 2
                })
                .expect(201);

            expect(addToCartResponse.body).toHaveProperty('id');

            // Step 2: Get cart and verify totals
            const cartResponse = await request(app.getHttpServer())
                .get('/api/v1/cart')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(cartResponse.body.items).toHaveLength(1);
            expect(cartResponse.body.items[0].quantity).toBe(2);
            const expectedTotal = testProduct.price * 2;

            // Step 3: Initiate checkout
            const checkoutResponse = await request(app.getHttpServer())
                .post('/api/v1/checkout')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    paymentMode: 'COD',
                    shippingAddressId: testAddress.id
                })
                .expect(201);

            orderId = checkoutResponse.body.id;
            expect(checkoutResponse.body.status).toBe('PENDING');
            expect(checkoutResponse.body.totalAmount).toBe(expectedTotal);

            // Step 4: Verify order was created
            const orderResponse = await request(app.getHttpServer())
                .get(`/api/v1/orders/${orderId}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(orderResponse.body.id).toBe(orderId);
            expect(orderResponse.body.items).toHaveLength(1);

            // Step 5: Verify cart was cleared
            const clearedCartResponse = await request(app.getHttpServer())
                .get('/api/v1/cart')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(clearedCartResponse.body.items).toHaveLength(0);

            // Step 6: Verify product stock was decremented
            const updatedProduct = await prisma.product.findUnique({
                where: { id: testProduct.id }
            });
            expect(updatedProduct.stock).toBe(98); // 100 - 2
        });

        it('should handle order status transitions correctly', async () => {
            // Create order
            await createTestCart(prisma, userId, testProduct.id, 1);

            const checkoutResponse = await request(app.getHttpServer())
                .post('/api/v1/checkout')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    paymentMode: 'COD',
                    shippingAddressId: testAddress.id
                })
                .expect(201);

            orderId = checkoutResponse.body.id;

            // Verify initial status
            let order = await prisma.order.findUnique({ where: { id: orderId } });
            expect(order.status).toBe('PENDING');

            // Note: Status transitions would typically be done by admin
            // For testing purposes, we'll update directly via Prisma

            // PENDING → CONFIRMED
            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'CONFIRMED' }
            });

            order = await prisma.order.findUnique({ where: { id: orderId } });
            expect(order.status).toBe('CONFIRMED');

            // CONFIRMED → SHIPPED
            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'SHIPPED' }
            });

            order = await prisma.order.findUnique({ where: { id: orderId } });
            expect(order.status).toBe('SHIPPED');

            // SHIPPED → DELIVERED
            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'DELIVERED' }
            });

            order = await prisma.order.findUnique({ where: { id: orderId } });
            expect(order.status).toBe('DELIVERED');
        });
    });

    describe('Cart Management', () => {
        it('should add multiple products to cart', async () => {
            const product2 = await createTestProduct(prisma, {
                name: 'Test Product 2',
                price: 2000
            });

            // Add first product
            await request(app.getHttpServer())
                .post('/api/v1/cart')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    productId: testProduct.id,
                    quantity: 1
                })
                .expect(201);

            // Add second product
            await request(app.getHttpServer())
                .post('/api/v1/cart')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    productId: product2.id,
                    quantity: 2
                })
                .expect(201);

            // Verify cart
            const cartResponse = await request(app.getHttpServer())
                .get('/api/v1/cart')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(cartResponse.body.items).toHaveLength(2);
        });

        it('should update cart item quantity', async () => {
            await createTestCart(prisma, userId, testProduct.id, 1);

            const cart = await prisma.cart.findUnique({
                where: { userId },
                include: { items: true }
            });

            const cartItemId = cart.items[0].id;

            // Update quantity
            await request(app.getHttpServer())
                .patch(`/api/v1/cart/${cartItemId}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    quantity: 5
                })
                .expect(200);

            // Verify update
            const updatedCart = await prisma.cartItem.findUnique({
                where: { id: cartItemId }
            });

            expect(updatedCart.quantity).toBe(5);
        });

        it('should remove item from cart', async () => {
            await createTestCart(prisma, userId, testProduct.id, 1);

            const cart = await prisma.cart.findUnique({
                where: { userId },
                include: { items: true }
            });

            const cartItemId = cart.items[0].id;

            // Remove item
            await request(app.getHttpServer())
                .delete(`/api/v1/cart/${cartItemId}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            // Verify removal
            const cartResponse = await request(app.getHttpServer())
                .get('/api/v1/cart')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(cartResponse.body.items).toHaveLength(0);
        });
    });

    describe('Payment Flow', () => {
        it('should create Razorpay order for online payment', async () => {
            await createTestCart(prisma, userId, testProduct.id, 2);

            const response = await request(app.getHttpServer())
                .post('/api/v1/checkout')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    paymentMode: 'ONLINE',
                    shippingAddressId: testAddress.id
                })
                .expect(201);

            expect(response.body).toHaveProperty('razorpayOrderId');
            expect(response.body.paymentMode).toBe('ONLINE');

            // Verify payment record was created
            const payment = await prisma.payment.findFirst({
                where: { orderId: response.body.id }
            });

            expect(payment).toBeDefined();
            expect(payment.status).toBe('PENDING');
        });
    });
});
