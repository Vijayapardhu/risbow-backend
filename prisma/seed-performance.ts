import { PrismaClient } from '@prisma/client';
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
        { name: 'Fashion Hub', email: 'fashion@vendor.com', code: 'VEN-FASH', mobile: '9800000001', storeName: 'Fashion Hub Store', pincode: '400001' },
        { name: 'Tech Store', email: 'tech@vendor.com', code: 'VEN-TECH', mobile: '9800000002', storeName: 'Tech Store Outlet', pincode: '560001' },
        { name: 'Home Essentials', email: 'home@vendor.com', code: 'VEN-HOME', mobile: '9800000003', storeName: 'Home Essentials', pincode: '110001' },
        { name: 'Beauty World', email: 'beauty@vendor.com', code: 'VEN-BEAU', mobile: '9800000004', storeName: 'Beauty World', pincode: '600001' },
        { name: 'Sports Gear', email: 'sports@vendor.com', code: 'VEN-SPRT', mobile: '9800000005', storeName: 'Sports Gear Hub', pincode: '411001' }
    ];

    const vendors = [];
    for (const v of vendorData) {
        const vendor = await prisma.vendor.upsert({
            where: { mobile: v.mobile },
            update: {
                storeName: v.storeName,
                storeLogo: `https://picsum.photos/seed/vendor-logo-${v.code}/120`,
                storeBanner: `https://picsum.photos/seed/vendor-banner-${v.code}/800/200`,
                pincode: v.pincode,
            },
            create: {
                name: v.name,
                email: v.email,
                mobile: v.mobile,
                vendorCode: v.code,
                kycStatus: 'APPROVED',
                commissionRate: 10 + Math.floor(Math.random() * 10),
                storeName: v.storeName,
                storeLogo: `https://picsum.photos/seed/vendor-logo-${v.code}/120`,
                storeBanner: `https://picsum.photos/seed/vendor-banner-${v.code}/800/200`,
                pincode: v.pincode,
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

        // Create Address only if none exists (avoid duplicates on re-seed)
        const existingAddr = await prisma.address.findFirst({ where: { userId: customer.id } });
        if (!existingAddr) {
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
        }

        customers.push(customer);
    }
    console.log(`✅ ${customers.length} Customers created with addresses.`);

    // ==================== 5. PRODUCTS ====================
    console.log('📦 Creating Products...');
    const products = [];
    const productTemplates = [
        { title: 'Premium T-Shirt', cat: 'cat-mens', price: 999, brand: 'Urban Basics', tags: ['casual', 'cotton', 'mens'] },
        { title: 'Slim Fit Jeans', cat: 'cat-mens', price: 1999, brand: 'Denim Co', tags: ['jeans', 'slim', 'mens'] },
        { title: 'Summer Dress', cat: 'cat-womens', price: 2499, brand: 'StyleHub', tags: ['dress', 'summer', 'womens'] },
        { title: 'Designer Saree', cat: 'cat-womens', price: 4999, brand: 'Ethnic Wear', tags: ['saree', 'ethnic', 'womens'] },
        { title: 'Kids Jumpsuit', cat: 'cat-kids', price: 799, brand: 'Tiny Trends', tags: ['kids', 'jumpsuit', 'casual'] },
        { title: 'Smartphone X', cat: 'cat-mobiles', price: 29999, brand: 'TechPlus', tags: ['smartphone', 'android', 'gadgets'] },
        { title: 'Pro Laptop 15"', cat: 'cat-laptops', price: 64999, brand: 'TechPlus', tags: ['laptop', 'work', 'computing'] },
        { title: 'Wireless Buds', cat: 'cat-audio', price: 2999, brand: 'SoundMax', tags: ['audio', 'wireless', 'earphones'] },
        { title: 'Wooden Sofa', cat: 'cat-furniture', price: 15999, brand: 'HomeCraft', tags: ['furniture', 'sofa', 'living'] },
        { title: 'Wall Art', cat: 'cat-decor', price: 1499, brand: 'ArtSpace', tags: ['decor', 'wall-art', 'home'] },
        { title: 'Face Serum', cat: 'cat-skincare', price: 599, brand: 'GlowSkin', tags: ['skincare', 'serum', 'beauty'] },
        { title: 'Matte Lipstick', cat: 'cat-makeup', price: 399, brand: 'GlowSkin', tags: ['makeup', 'lipstick', 'beauty'] },
    ];

    for (let i = 0; i < 40; i++) {
        const template = random(productTemplates);
        const vendor = random(vendors);
        const id = `prod-${i}-${Math.random().toString(36).substring(7)}`;
        const sku = `SKU-${template.cat}-${i}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const hasOffer = Math.random() > 0.5;
        const offerPrice = hasOffer ? Math.round(template.price * (0.85 + Math.random() * 0.1)) : null;
        const metaTitle = `${template.title} ${i} | ${template.brand}`;
        const keywords = [...template.tags, template.brand, template.cat];

        const product = await prisma.product.create({
            data: {
                id,
                title: `${template.title} ${i}`,
                description: `This is a high quality ${template.title}. Features premium materials and excellent craftsmanship.`,
                price: template.price,
                offerPrice: offerPrice ?? undefined,
                stock: 50 + Math.floor(Math.random() * 100),
                categoryId: template.cat,
                vendorId: vendor.id,
                images: [`https://picsum.photos/seed/${id}/600`, `https://picsum.photos/seed/${id}-2/600`],
                isActive: true,
                sku,
                brandName: template.brand,
                tags: template.tags,
                metaTitle,
                metaKeywords: keywords,
                visibility: 'PUBLISHED',
            }
        });
        products.push(product);
    }
    console.log(`✅ ${products.length} products created.`);

    // ==================== 6. ORDERS ====================
    console.log('🛒 Creating Orders...');
    const orderStatuses = ['PENDING_PAYMENT', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

    const addressCache = new Map<string, { id: string }>();
    for (let i = 0; i < 30; i++) {
        const customer = random(customers);
        let addr = addressCache.get(customer.id);
        if (!addr) {
            const a = await prisma.address.findFirst({ where: { userId: customer.id }, select: { id: true } });
            if (!a) continue;
            addr = a;
            addressCache.set(customer.id, addr);
        }

        const orderItems = randomSubset(products, 1 + Math.floor(Math.random() * 3)); // 1-3 items
        let total = 0;
        const itemsData = orderItems.map(p => {
            const qty = 1 + Math.floor(Math.random() * 2);
            const unitPrice = p.offerPrice ?? p.price;
            total += unitPrice * qty;
            return {
                productId: p.id,
                quantity: qty,
                price: unitPrice,
                title: p.title
            };
        });

        await prisma.order.create({
            data: {
                userId: customer.id,
                addressId: addr.id,
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
    console.log('✅ 30 orders created.');

    // ==================== 7. REVIEWS ====================
    console.log('⭐ Creating Reviews...');
    for (let i = 0; i < 30; i++) {
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
    const bannerCount = await prisma.banner.count();
    if (bannerCount === 0) {
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
    } else {
        console.log('✅ Banners already exist, skipping.');
    }

    // ==================== 9. PLATFORM CONFIG ====================
    console.log('⚙️ Seeding PlatformConfig...');
    const configEntries: { key: string; value: string; description: string }[] = [
        { key: 'general.siteName', value: JSON.stringify('Risbow'), description: 'Site name' },
        { key: 'general.currency', value: JSON.stringify('INR'), description: 'Default currency' },
        { key: 'general.timezone', value: JSON.stringify('Asia/Kolkata'), description: 'Default timezone' },
        { key: 'general.supportEmail', value: JSON.stringify('support@risbow.com'), description: 'Support email' },
        { key: 'verification.requireKyc', value: 'false', description: 'Require KYC for vendors' },
        { key: 'ai.model', value: JSON.stringify('gpt-4'), description: 'Default AI model' },
    ];
    for (const e of configEntries) {
        await prisma.platformConfig.upsert({
            where: { key: e.key },
            update: { value: e.value, description: e.description },
            create: { key: e.key, value: e.value, description: e.description },
        });
    }
    console.log(`✅ ${configEntries.length} PlatformConfig entries upserted.`);

    // ==================== 10. COUPONS ====================
    console.log('🎫 Seeding Coupons...');
    const couponData = [
        { code: 'WELCOME10', discountType: 'PERCENTAGE' as const, discountValue: 10, minOrderAmount: 500, maxDiscount: 200, usageLimit: 1000 },
        { code: 'FLAT100', discountType: 'FLAT' as const, discountValue: 100, minOrderAmount: 999, maxDiscount: null, usageLimit: 500 },
        { code: 'FASH20', discountType: 'PERCENTAGE' as const, discountValue: 20, minOrderAmount: 1500, maxDiscount: 500, usageLimit: 200 },
        { code: 'SAVE50', discountType: 'FLAT' as const, discountValue: 50, minOrderAmount: 499, maxDiscount: null, usageLimit: 2000 },
        { code: 'TECH15', discountType: 'PERCENTAGE' as const, discountValue: 15, minOrderAmount: 2000, maxDiscount: 750, usageLimit: 100 },
    ];
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setMonth(validUntil.getMonth() + 3);
    for (const c of couponData) {
        await prisma.coupon.upsert({
            where: { code: c.code },
            update: {
                discountType: c.discountType,
                discountValue: c.discountValue,
                minOrderAmount: c.minOrderAmount,
                maxDiscount: c.maxDiscount ?? undefined,
                usageLimit: c.usageLimit,
                validFrom,
                validUntil,
                isActive: true,
            },
            create: {
                code: c.code,
                description: `Seed coupon: ${c.code}`,
                discountType: c.discountType,
                discountValue: c.discountValue,
                minOrderAmount: c.minOrderAmount,
                maxDiscount: c.maxDiscount ?? undefined,
                usageLimit: c.usageLimit,
                validFrom,
                validUntil,
                isActive: true,
                productIds: [],
                categoryIds: [],
            },
        });
    }
    console.log(`✅ ${couponData.length} Coupons upserted.`);

    // ==================== 11. SEARCH TRENDING ====================
    console.log('🔍 Seeding SearchTrending...');
    const trendingQueries = [
        'smartphone', 'laptop', 'tshirt', 'jeans', 'dress', 'earphones', 'sofa', 'lipstick', 'serum',
        'wireless buds', 'kids wear', 'ethnic wear', 'wall art', 'home decor', 'skincare',
    ];
    for (const q of trendingQueries) {
        const norm = q.toLowerCase().trim();
        await prisma.searchTrending.upsert({
            where: { query_region: { query: norm, region: 'global' } },
            update: { count: { increment: 1 }, lastSeen: new Date() },
            create: { query: norm, region: 'global', count: 10 + Math.floor(Math.random() * 90) },
        });
    }
    console.log(`✅ ${trendingQueries.length} SearchTrending entries upserted.`);

    // ==================== 12. PRODUCT SEARCH MISS ====================
    console.log('📋 Seeding ProductSearchMiss (sample)...');
    const missQueries = [
        { query: 'phoone', keywords: ['phone', 'mobile'] },
        { query: 'tshirt men', keywords: ['tshirt', 'mens'] },
        { query: 'lapop', keywords: ['laptop'] },
        { query: 'wireles earbuds', keywords: ['wireless', 'earbuds', 'earphones'] },
        { query: 'saree designer', keywords: ['saree', 'designer'] },
    ];
    for (const m of missQueries) {
        const norm = m.query.toLowerCase().trim();
        await prisma.productSearchMiss.upsert({
            where: { id: `miss-${norm.replace(/\s+/g, '-')}` },
            update: { count: { increment: 1 }, lastSearchedAt: new Date() },
            create: {
                id: `miss-${norm.replace(/\s+/g, '-')}`,
                query: m.query,
                normalizedQuery: norm,
                keywords: m.keywords,
                count: 5 + Math.floor(Math.random() * 20),
                resolved: false,
            },
        });
    }
    console.log(`✅ ${missQueries.length} ProductSearchMiss entries upserted.`);

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
