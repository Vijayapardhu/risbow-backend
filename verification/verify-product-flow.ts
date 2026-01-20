
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const API_URL = 'https://risbow-backend.onrender.com/api/v1/admin/products';
const AUTH_URL = 'https://risbow-backend.onrender.com/api/v1/auth/login';
const prisma = new PrismaClient();

async function getAdminToken() {
    const password = 'password123';
    // Hash password for DB update
    const hashedPassword = await bcrypt.hash(password, 10);

    let admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });

    if (!admin) {
        console.log('⚠️ No Admin user found. Creating one...');
        const timestamp = Date.now();
        admin = await prisma.user.create({
            data: {
                mobile: `999${Math.floor(Math.random() * 10000000)}`,
                email: `admin_${timestamp}@risbow.com`,
                password: hashedPassword,
                role: 'ADMIN',
                name: 'Verification Admin',
                kycStatus: 'VERIFIED'
            }
        });
    } else {
        // Reset password to ensure we can login
        console.log(`🔄 Resetting password for admin: ${admin.email}`);
        await prisma.user.update({
            where: { id: admin.id },
            data: { password: hashedPassword }
        });
    }

    console.log(`🔑 Logging in via API as: ${admin.email}`);
    try {
        const loginRes = await axios.post(AUTH_URL, {
            email: admin.email,
            password: password
        });
        console.log('✅ Authentication Successful');
        return loginRes.data.access_token;
    } catch (error: any) {
        console.error('❌ Login Failed:', error.response?.data || error.message);
        throw error;
    }
}

async function verifyProductCreation() {
    console.log('🚀 Starting Enterprise Product Creation Verification (Authenticated)...');

    try {
        const token = await getAdminToken();
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch valid Category
        let categoryId = 'cat_default';
        try {
            const catRes = await axios.get('https://risbow-backend.onrender.com/api/v1/categories');
            if (catRes.data && catRes.data.length > 0) {
                categoryId = catRes.data[0].id; // Use first category
                console.log(`✅ Found Category: ${catRes.data[0].name} (${categoryId})`);
            } else {
                console.warn('⚠️ No categories found. Using default ID.');
            }
        } catch (e: any) {
            console.error('⚠️ Category fetch failed, utilizing fallback ID.', e.message);
        }

        // Fetch valid Vendor or Create one
        let vendorId = 'vendor_default';
        const vendorRes = await prisma.vendor.findFirst();
        if (vendorRes) {
            vendorId = vendorRes.id;
            console.log(`✅ Found Vendor: ${vendorRes.name} (${vendorId})`);
        } else {
            console.log('⚠️ No Vendor found. Creating test vendor...');
            const newVendor = await prisma.vendor.create({
                data: {
                    name: 'Test Vendor',
                    email: `vendor_${Date.now()}@risbow.com`,
                    mobile: `888${Math.floor(Math.random() * 10000000)}`,
                    status: 'ACTIVE',
                    shopName: 'Test Shop'
                }
            });
            vendorId = newVendor.id;
        }

        const productPayload = {
            title: "Enterprise Test Product T-Shirt",
            description: "A test product with variations.",
            brandName: "TestBrand",
            categoryId: categoryId,
            vendorId: vendorId,
            price: 1000,
            offerPrice: 800,
            stock: 100,
            sku: `TEST-PROD-${Date.now()}`,
            visibility: "PUBLISHED",
            hasVariations: true,
            attributes: {
                "Material": "Cotton",
                "Pattern": "Solid"
            },
            variations: [
                {
                    attributes: { "Size": "M", "Color": "Red" },
                    sku: `TEST-PROD-${Date.now()}-M-RED`,
                    price: 1000,
                    stock: 50,
                    status: "ACTIVE"
                },
                {
                    attributes: { "Size": "L", "Color": "Blue" },
                    sku: `TEST-PROD-${Date.now()}-L-BLUE`,
                    price: 1200,
                    stock: 30,
                    status: "ACTIVE"
                }
            ],
            mediaGallery: [
                { type: "IMAGE", url: "https://picsum.photos/400/400", priority: 0 },
                { type: "IMAGE", url: "https://picsum.photos/400/401", priority: 1 }
            ]
        };

        console.log('📤 Sending Product Payload:', JSON.stringify(productPayload, null, 2));

        const res = await axios.post(API_URL, productPayload, { headers });

        console.log('✅ Product Created Successfully!');
        console.log('🆔 Product ID:', res.data.id);
        if (res.data.variations) {
            console.log(`✅ Created ${res.data.variations.length} variations.`);
        } else {
            console.warn('⚠️ No variations returned in response.');
        }

    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            console.error('❌ Verification Failed:', error.response?.status, error.response?.data);
        } else {
            console.error('❌ Verification Failed:', error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

verifyProductCreation();
