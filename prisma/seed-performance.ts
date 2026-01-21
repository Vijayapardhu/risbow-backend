import { PrismaClient, UserRole, UserStatus, RoomStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Performance Database Seeding...\n');

    // Helper to get random item from array
    const random = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    // Helper to get random subset
    const randomSubset = <T>(arr: T[], count: number): T[] => {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    };

    // ==================== 1. USERS (ADMINS & SUPPORT) ====================
    console.log('👤 Creating Admin Users...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const superAdminEmail = 'superadmin@risbow.com';
    const superAdminMobile = '9999999999';

    let superAdmin = await prisma.user.findFirst({
        where: { OR: [{ email: superAdminEmail }, { mobile: superAdminMobile }] }
    });

    if (!superAdmin) {
        superAdmin = await prisma.user.create({
            data: {
                mobile: superAdminMobile,
                email: superAdminEmail,
                name: 'Super Admin',
                password: passwordHash,
                role: 'SUPER_ADMIN',
                status: 'ACTIVE',
                coinsBalance: 100000,
            }
        });
    } else {
        // Ensure role is correct if user exists
        await prisma.user.update({
            where: { id: superAdmin.id },
            data: { role: 'SUPER_ADMIN' }
        });
    }

    const adminEmail = 'admin@risbow.com';
    const adminMobile = '8888888888';

    let adminUser = await prisma.user.findFirst({
        where: { OR: [{ email: adminEmail }, { mobile: adminMobile }] }
    });

    if (!adminUser) {
        await prisma.user.create({
            data: {
                mobile: adminMobile,
                email: adminEmail,
                name: 'Admin User',
                password: passwordHash,
                role: 'ADMIN',
                status: 'ACTIVE',
                coinsBalance: 50000,
            }
        });
    }
    console.log('✅ Admin users created/verified.');

    // ==================== 2. VENDORS ====================
    console.log('🏢 Creating Vendors...');
    const vendorData = [
        { name: 'Fashion Hub', email: 'fashion@vendor.com', code: 'VEN-FASH', mobile: '9800000001' },
        { name: 'Tech Store', email: 'tech@vendor.com', code: 'VEN-TECH', mobile: '9800000002' },
        { name: 'Home Essentials', email: 'home@vendor.com', code: 'VEN-HOME', mobile: '9800000003' },
        { name: 'Beauty World', email: 'beauty@vendor.com', code: 'VEN-BEAU', mobile: '9800000004' },
        { name: 'Sports Gear', email: 'sports@vendor.com', code: 'VEN-SPRT', mobile: '9800000005' }
    ];

    const vendors = [];
    for (const v of vendorData) {
        const vendor = await prisma.vendor.upsert({
            where: { mobile: v.mobile },
            update: {},
            create: {
                name: v.name,
                email: v.email,
                mobile: v.mobile,
                vendorCode: v.code,
                kycStatus: 'APPROVED',
                commissionRate: 10 + Math.floor(Math.random() * 10),
                status: 'ACTIVE'
            }
        });
        vendors.push(vendor);
    }
    console.log(`✅ ${vendors.length} Vendors created.`);

    // ==================== 3. CATEGORIES ====================
    console.log('📂 Creating Categories...');

    // Main Categories
    const catMap = new Map();

    const mainCats = [
        { id: 'cat-fashion', name: 'Fashion', image: 'https://picsum.photos/seed/fashion/200' },
        { id: 'cat-electronics', name: 'Electronics', image: 'https://picsum.photos/seed/electronics/200' },
        { id: 'cat-home', name: 'Home & Living', image: 'https://picsum.photos/seed/home/200' },
        { id: 'cat-beauty', name: 'Beauty', image: 'https://picsum.photos/seed/beauty/200' },
    ];

    for (const c of mainCats) {
        const cat = await prisma.category.upsert({
            where: { id: c.id },
            update: {},
            create: { id: c.id, name: c.name, image: c.image, isActive: true }
        });
        catMap.set(c.id, cat);
    }

    // Sub Categories
    const subCats = [
        // Fashion
        { id: 'cat-mens', name: 'Mens Wear', parentId: 'cat-fashion' },
        { id: 'cat-womens', name: 'Womens Wear', parentId: 'cat-fashion' },
        { id: 'cat-kids', name: 'Kids Wear', parentId: 'cat-fashion' },
        // Electronics
        { id: 'cat-mobiles', name: 'Mobiles', parentId: 'cat-electronics' },
        { id: 'cat-laptops', name: 'Laptops', parentId: 'cat-electronics' },
        { id: 'cat-audio', name: 'Audio', parentId: 'cat-electronics' },
        // Home
        { id: 'cat-furniture', name: 'Furniture', parentId: 'cat-home' },
        { id: 'cat-decor', name: 'Decor', parentId: 'cat-home' },
        // Beauty
        { id: 'cat-skincare', name: 'Skincare', parentId: 'cat-beauty' },
        { id: 'cat-makeup', name: 'Makeup', parentId: 'cat-beauty' },
    ];

    for (const c of subCats) {
        const cat = await prisma.category.upsert({
            where: { id: c.id },
            update: {},
            create: { id: c.id, name: c.name, parentId: c.parentId, isActive: true, image: `https://picsum.photos/seed/${c.id}/200` }
        });
        catMap.set(c.id, cat);
    }
    console.log('✅ Categories created.');

    // ==================== 4. CUSTOMERS ====================
    console.log('👥 Creating Customers...');
    const customers = [];
    for (let i = 1; i <= 20; i++) {
        const email = `customer${i}@test.com`;
        const customer = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                name: `Customer ${i}`,
                email: email,
                mobile: '91' + (10000000 + i).toString(),
                password: passwordHash,
                role: 'CUSTOMER',
                status: 'ACTIVE',
                coinsBalance: Math.floor(Math.random() * 2000),
                gender: i % 2 === 0 ? 'Male' : 'Female'
            }
        });

        // Create Address
        await prisma.address.create({
            data: {
                userId: customer.id,
                name: customer.name!,
                phone: customer.mobile,
                addressLine1: `${100 + i} Test Street`,
                city: random(['Mumbai', 'Delhi', 'Bangalore', 'Chennai']),
                state: 'Maharashtra',
                pincode: '400001',
                label: 'Home',
                isDefault: true
            }
        });

        customers.push(customer);
    }
    console.log(`✅ ${customers.length} Customers created with addresses.`);

    // ==================== 5. PRODUCTS ====================
    console.log('📦 Creating Products...');
    const products = [];
    const productTemplates = [
        { title: 'Premium T-Shirt', cat: 'cat-mens', price: 999 },
        { title: 'Slim Fit Jeans', cat: 'cat-mens', price: 1999 },
        { title: 'Summer Dress', cat: 'cat-womens', price: 2499 },
        { title: 'Designer Saree', cat: 'cat-womens', price: 4999 },
        { title: 'Kids Jumpsuit', cat: 'cat-kids', price: 799 },
        { title: 'Smartphone X', cat: 'cat-mobiles', price: 29999 },
        { title: 'Pro Laptop 15"', cat: 'cat-laptops', price: 64999 },
        { title: 'Wireless Buds', cat: 'cat-audio', price: 2999 },
        { title: 'Wooden Sofa', cat: 'cat-furniture', price: 15999 },
        { title: 'Wall Art', cat: 'cat-decor', price: 1499 },
        { title: 'Face Serum', cat: 'cat-skincare', price: 599 },
        { title: 'Matte Lipstick', cat: 'cat-makeup', price: 399 },
    ];

    for (let i = 0; i < 60; i++) { // Create 60 products
        const template = random(productTemplates);
        const vendor = random(vendors);
        const id = `prod-${i}-${Math.random().toString(36).substring(7)}`;

        const product = await prisma.product.create({
            data: {
                id,
                title: `${template.title} ${i}`,
                description: `This is a high quality ${template.title}. Features premium materials and excellent craftsmanship.`,
                price: template.price,
                stock: 50 + Math.floor(Math.random() * 100),
                categoryId: template.cat,
                vendorId: vendor.id,
                images: [`https://picsum.photos/seed/${id}/600`, `https://picsum.photos/seed/${id}-2/600`],
                isActive: true
            }
        });
        products.push(product);
    }
    console.log(`✅ ${products.length} Products created.`);

    // ==================== 6. ORDERS ====================
    console.log('🛒 Creating Orders...');
    const orderStatuses = ['PENDING_PAYMENT', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

    for (let i = 0; i < 50; i++) {
        const customer = random(customers);
        const address = await prisma.address.findFirst({ where: { userId: customer.id } });
        if (!address) continue;

        const orderItems = randomSubset(products, 1 + Math.floor(Math.random() * 3)); // 1-3 items
        let total = 0;
        const itemsData = orderItems.map(p => {
            const qty = 1 + Math.floor(Math.random() * 2);
            total += p.price * qty;
            return {
                productId: p.id,
                quantity: qty,
                price: p.price,
                title: p.title
            };
        });

        await prisma.order.create({
            data: {
                userId: customer.id,
                addressId: address.id,
                status: random(orderStatuses) as any,
                totalAmount: total,
                items: itemsData,
                payment: {
                    create: {
                        amount: total,
                        provider: 'RAZORPAY',
                        status: 'SUCCESS',
                        paymentId: `pay_${Math.random().toString(36).substring(7)}`
                    }
                }
            }
        });
    }
    console.log('✅ 50 Orders created.');

    // ==================== 7. REVIEWS ====================
    console.log('⭐ Creating Reviews...');
    for (let i = 0; i < 100; i++) {
        try {
            const customer = random(customers);
            const product = random(products);

            // Prevent duplicate reviews
            const existing = await prisma.review.findFirst({ where: { userId: customer.id, productId: product.id } });
            if (existing) continue;

            await prisma.review.create({
                data: {
                    userId: customer.id,
                    productId: product.id,
                    rating: 3 + Math.floor(Math.random() * 2),
                    comment: random(['Great product', 'Good value', 'Loved it!', 'Fast delivery', 'Okay quality'])
                }
            });
        } catch (error) {
            console.warn(`⚠️ Failed to create review (iteration ${i}): ${(error as Error).message}`);
        }
    }
    console.log('✅ Reviews created.');

    // ==================== 8. BANNERS ====================
    console.log('🖼️ Creating Banners...');
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await prisma.banner.createMany({
        data: [
            { imageUrl: 'https://picsum.photos/seed/ban1/800/300', slotType: 'HOME', redirectUrl: '/category/cat-fashion', isActive: true, startDate: now, endDate: nextMonth },
            { imageUrl: 'https://picsum.photos/seed/ban2/800/300', slotType: 'HOME', redirectUrl: '/category/cat-electronics', isActive: true, startDate: now, endDate: nextMonth },
            { imageUrl: 'https://picsum.photos/seed/ban3/800/300', slotType: 'PRODUCT_DETAIL', redirectUrl: '/category/cat-beauty', isActive: true, startDate: now, endDate: nextMonth },
        ]
    });
    console.log('✅ Banners created.');

    console.log('\n🎉 Performance Seeding Completed Successfully! 🚀');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
