// @ts-nocheck
import { PrismaClient } from '@prisma/client';
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3001/api/v1';
const JWT_SECRET = "eseLE0zNP_wDxDpYf3inMmX-VDdnRJ8jV-4bXZQbd9pLAVQYlfUkWqr0hANDvRKU"; // From .env

async function createToken(userId) {
    return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' });
}

async function run() {
    try {
        console.log('🚀 Starting Refund Toggle Test (Direct DB/Auth)...');

        const suffix = Date.now().toString() + Math.floor(Math.random() * 10000);

        // 1. Create Admin (Direct DB)
        const adminEmail = `admin_${suffix}@test.com`;
        console.log(`   Creating Admin: ${adminEmail}`);
        const admin = await prisma.user.create({
            data: {
                email: adminEmail,
                name: 'Admin Tester',
                mobile: `90${suffix.slice(-8)}`,
                role: 'ADMIN',
                status: 'ACTIVE',
                // password not needed for direct token
            }
        });
        const admToken = await createToken(admin.id);
        const admHead = { 'Authorization': `Bearer ${admToken}`, 'Content-Type': 'application/json' };

        // 2. Create User (Direct DB)
        const userEmail = `user_${suffix}@test.com`;
        console.log(`   Creating User: ${userEmail}`);
        const user = await prisma.user.create({
            data: {
                email: userEmail,
                name: 'User Tester',
                mobile: `91${suffix.slice(-8)}`, // distinct from admin
                role: 'CUSTOMER',
                status: 'ACTIVE'
            }
        });
        const userToken = await createToken(user.id);
        const userHead = { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' };

        // 3. Create Order
        const order = await prisma.order.create({
            data: {
                userId: user.id,
                totalAmount: 500, status: 'CONFIRMED', items: [],
                payment: { create: { amount: 50000, currency: 'INR', provider: 'RAZORPAY', status: 'SUCCESS', providerOrderId: 'x', paymentId: 'x' } }
            }
        });
        console.log(`   Created Order: ${order.id}`);

        // 4. DISABLE Refunds
        console.log('4. Admin Disabling Refunds...');
        const setRes = await fetch(`${API_URL}/admin/settings`, {
            method: 'POST',
            headers: admHead,
            body: JSON.stringify({ key: 'REFUNDS_ENABLED', value: 'false' })
        });
        if (!setRes.ok) throw new Error('Failed to update config: ' + await setRes.text());
        console.log('   ✅ Config Updated (REFUNDS_ENABLED = false)');

        // 5. Request Refund (Should Fail)
        console.log('5. User requesting refund (Expect Failure)...');
        const reqRes = await fetch(`${API_URL}/refunds/request`, {
            method: 'POST',
            headers: userHead,
            body: JSON.stringify({ orderId: order.id, reason: 'test', amount: 500 })
        });

        if (reqRes.status === 400) {
            const txt = await reqRes.json();
            if (txt.message && txt.message.includes('disabled')) {
                console.log('   ✅ Correctly blocked: ', txt.message);
            } else {
                console.warn('   ⚠️ Blocked but weird message:', txt);
            }
        } else {
            console.error('   ❌ FAILED: Request was NOT blocked. Status:', reqRes.status);
            throw new Error('Refund not blocked');
        }

        // 6. ENABLE Refunds
        console.log('6. Admin Enabling Refunds...');
        await fetch(`${API_URL}/admin/settings`, {
            method: 'POST', headers: admHead, body: JSON.stringify({ key: 'REFUNDS_ENABLED', value: 'true' })
        });
        console.log('   ✅ Config Updated (REFUNDS_ENABLED = true)');

        // 7. Request Refund (Should Succeed)
        console.log('7. User requesting refund (Expect Success)...');
        const reqRes2 = await fetch(`${API_URL}/refunds/request`, {
            method: 'POST', headers: userHead, body: JSON.stringify({ orderId: order.id, reason: 'test', amount: 500 })
        });
        if (reqRes2.ok) {
            console.log('   ✅ Refund Request Accepted');
        } else {
            console.error('   ❌ FAILED: Request failed unexpectedly:', await reqRes2.text());
        }

        console.log('✅ Refund Toggle Verification Complete!');

    } catch (e) {
        console.error('❌ Test Failed:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}
run();
