// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3001/api/v1';
const EMAIL = `test.review.${Date.now()}@example.com`;
const PASSWORD = 'Password123';

async function run() {
    try {
        console.log('🚀 Starting Reviews Module Smoke Test...');

        // 0. Setup: Create Vendor, Product
        console.log('0. Setting up Vendor and Product via Prisma...');
        const vendor = await prisma.vendor.create({
            data: {
                name: `Review Vendor ${Date.now()}`,
                mobile: `9${Math.floor(Math.random() * 1000000000)}`,
                email: `vendor.${Date.now()}@test.com`,
                role: 'RETAILER',
                kycStatus: 'VERIFIED'
            }
        });

        const category = await prisma.category.create({
            data: { name: `Review Cat ${Date.now()}` }
        });

        const product = await prisma.product.create({
            data: {
                title: 'Reviewable Product',
                vendorId: vendor.id,
                categoryId: category.id,
                price: 1000,
                stock: 100,
                sku: `REV-${Date.now()}`,
                visibility: 'PUBLISHED'
            }
        });
        console.log(`   ✅ Product Created: ${product.id}`);

        // 1. Register User
        console.log('1. Registering User...');
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: EMAIL,
                password: PASSWORD,
                name: 'Reviewer User',
                phone: `91${Math.floor(Math.random() * 100000000)}`,
                gender: 'FEMALE',
                dateOfBirth: new Date('1995-05-05').toISOString(),
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

        // 2. Login
        console.log('2. Logging In...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });
        const loginData = await loginRes.json();
        const token = loginData.access_token;
        const userId = loginData.user.id;
        console.log('   ✅ Logged in.');
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // 3. Try to Review (Should Fail - No Purchase)
        console.log('3. Attempting Review WITHOUT Purchase...');
        const failRes = await fetch(`${API_URL}/products/${product.id}/reviews`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ rating: 5, comment: 'Fake review' })
        });
        if (failRes.status === 403) {
            console.log('   ✅ Blocked correctly (403 Forbidden).');
        } else {
            console.error(`   ❌ Unexpected status: ${failRes.status}`);
        }

        // 4. Create Order and Deliver it
        console.log('4. Creating and Delivering Order...');
        // Create order via Prisma directly to shortcut cart/checkout flow for speed?
        // Actually, checkout flow is complex (transaction), so direct prisma create is safer for *this* test isolation.
        // We need Order with items=[{productId}] and status=DELIVERED.

        const order = await prisma.order.create({
            data: {
                userId,
                status: 'DELIVERED', // Simulate delivery
                totalAmount: 1000,
                items: [{ productId: product.id, quantity: 1, price: 1000 }],
                // Add required relation fields or defaults?
                // Order model requires only basics? addressId optional?
                // Check schema: addressId nullable. items Json.
                payment: {
                    create: {
                        amount: 1000,
                        provider: 'COD',
                        status: 'SUCCESS'
                    }
                }
            }
        });
        console.log(`   ✅ Order Created and Delivered: ${order.id}`);

        // 5. Review (Should Success)
        console.log('5. Attempting Review WITH Purchase...');
        const successRes = await fetch(`${API_URL}/products/${product.id}/reviews`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ rating: 5, comment: 'Real review!', images: [] })
        });

        if (!successRes.ok) {
            const err = await successRes.text();
            throw new Error(`Review Failed: ${successRes.status} ${err}`);
        }
        const review = await successRes.json();
        console.log('   ✅ Review Created:', review.id);

        // 6. Review Again (Should Fail - Duplicate)
        console.log('6. Attempting Duplicate Review...');
        const dupRes = await fetch(`${API_URL}/products/${product.id}/reviews`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ rating: 1, comment: 'Spam' })
        });
        if (dupRes.status === 400) {
            console.log('   ✅ Duplicate blocked correctly (400 Bad Request).');
        } else {
            console.error(`   ❌ Unexpected status: ${dupRes.status}`);
        }

        // 7. Vote Helpful
        console.log('7. Voting Helpful...');
        // Need another user to vote? Self vote blocked?
        // Service code: `if (review.userId === userId) throw BadRequest`
        // Let's try self vote -> expect fail.
        const selfVoteRes = await fetch(`${API_URL}/reviews/${review.id}/helpful`, {
            method: 'POST',
            headers
        });
        if (selfVoteRes.status === 400) {
            console.log('   ✅ Self-vote blocked correctly.');
        }

        // 8. Get Product Reviews
        console.log('8. Fetching Product Reviews...');
        const listRes = await fetch(`${API_URL}/products/${product.id}/reviews`, { headers });
        const listData = await listRes.json();
        console.log(`   ✅ Retrieved ${listData.data.length} reviews. Total: ${listData.meta.total}`);
        if (listData.data[0].id === review.id) {
            console.log('   ✅ Created review found in list.');
        }

        console.log('✅ Reviews Module Smoke Test Completed!');

    } catch (e) {
        console.error('❌ Test Failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

run();
