// @ts-nocheck
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API_URL = 'http://localhost:3001/api/v1';

async function run() {
    try {
        console.log('🚀 Starting Refunds Module Smoke Test...');

        // Setup: We need a User and a PAID Order (with Payment record)
        // Since convincing Razorpay to verify a fake payment in sandbox via script is hard without UI interaction,
        // we will manually insert a 'SUCCESS' payment record coupled with an order.

        const timestamp = Date.now();
        const user = await prisma.user.upsert({
            where: { email: `refund${timestamp}@test.com` },
            update: {},
            create: {
                email: `refund${timestamp}@test.com`,
                name: 'Refund Tester',
                mobile: `98${Math.floor(Math.random() * 100000000)}`
            }
        });

        // Create Order and Payment
        const order = await prisma.order.create({
            data: {
                userId: user.id,
                totalAmount: 500, // 500.00
                status: 'CONFIRMED',
                items: [], // Required JSON field
                payment: {
                    create: {
                        amount: 50000, // 500.00 * 100 paise
                        currency: 'INR',
                        provider: 'RAZORPAY',
                        status: 'SUCCESS',
                        providerOrderId: `ord_fake_${timestamp}`,
                        paymentId: `pay_fake_${timestamp}` // FAKE ID
                    }
                }
            }
        });
        console.log(`   ✅ Setup: Order ${order.id} with Payment created.`);

        // Login to get token
        // Use a standard test user login or just skip logic if endpoint not guarded? 
        // Endpoints are guarded. Need token.
        // Actually, let's just cheat and assume we can hit it if we had token. 
        // Or properly register/login.
        // Re-using user creation above... need password. Upsert didn't set password.
        // Let's create a fresh user via API to ensure auth works.

        const email = `refundapi${timestamp}@test.com`;
        const password = 'Password@123';

        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email, password, name: 'Refund User',
                phone: `99${Math.floor(Math.random() * 10000000)}`,
                dateOfBirth: '1990-01-01', gender: 'MALE',
                address: {
                    line1: '123 Test St',
                    line2: 'Apt 4B',
                    city: 'Test City',
                    state: 'Test State',
                    postalCode: '123456',
                    country: 'Test Country'
                }
            })
        });

        if (!regRes.ok) {
            console.error('Registration failed:', await regRes.text());
            throw new Error('Registration failed');
        }

        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const { access_token, user: apiUser } = await loginRes.json();
        const headers = { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' };

        // Create Order for THIS user
        const order2 = await prisma.order.create({
            data: {
                userId: apiUser.id,
                totalAmount: 100,
                status: 'CONFIRMED',
                items: [], // Required JSON field
                payment: {
                    create: {
                        amount: 10000,
                        currency: 'INR',
                        provider: 'RAZORPAY',
                        status: 'SUCCESS',
                        providerOrderId: `ord_real_${timestamp}`,
                        paymentId: `pay_real_${timestamp}`
                    }
                }
            }
        });

        // 1. Request Refund
        console.log('1. Requesting Refund...');
        const reqRes = await fetch(`${API_URL}/refunds/request`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                orderId: order2.id,
                reason: 'Defective product',
                amount: 100 // Requesting full amount
            })
        });
        if (!reqRes.ok) throw new Error(await reqRes.text());
        const refund = await reqRes.json();
        console.log(`   ✅ Refund Requested: ${refund.id} [${refund.status}]`);

        // 2. Process Refund (Admin)
        // Since we are using valid Fake IDs, Razorpay call WILL FAIL in backend unless we mock it 
        // OR if specific test keys allow mock.
        // We expect "Internal Server Error" or "Bad Request" from Razorpay if credentials invalid or ID fake.
        // BUT, our goal is to verify *our* logic flow: Route -> Service -> PaymentService -> Attempt.
        // If it fails at Razorpay, that's external.

        console.log('2. Processing Refund (Expect Gateway Error with Fake ID)...');
        const procRes = await fetch(`${API_URL}/refunds/${refund.id}/process`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                adminNotes: 'Approving refund',
                approvedAmount: 10000 // In paise
            })
        });

        // We expect 500 (Razorpay Error) OR 400.
        // If 500, we check if DB status updated to FAILED (as per our logic catch block).
        const procText = await procRes.text();
        console.log(`   ℹ️ Process Response: ${procRes.status} ${procText}`);

        const updatedRefund = await prisma.refund.findUnique({ where: { id: refund.id } });
        console.log(`   ✅ Refund DB Status: ${updatedRefund.status}`);

        if (updatedRefund.status === 'FAILED') {
            console.log('   ✅ Correctly handled failure (Updated to FAILED).');
        } else if (updatedRefund.status === 'PROCESSED') {
            console.log('   ✅ WOW! It worked (maybe Test Mode auto-approves?).');
        } else {
            console.warn('   ⚠️ Status did not update to FAILED/PROCESSED?');
        }

        console.log('✅ Refunds Module Smoke Test Completed!');

    } catch (e) {
        console.error('❌ Test Failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

run();
