"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require('bcrypt');
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting comprehensive database seeding with mock data...\n');
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('risbow123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin.risbow@gmail.com' },
        update: {},
        create: {
            email: 'admin.risbow@gmail.com',
            password: hashedPassword,
            name: 'Risbow Admin',
            mobile: '9999999999',
            role: 'SUPER_ADMIN',
            isActive: true,
        },
    });
    console.log('✅ Admin user created: admin.risbow@gmail.com / risbow123\n');
    console.log('🏢 Creating vendors...');
    const vendors = await Promise.all([
        prisma.vendor.upsert({
            where: { id: 'vendor-fashion-hub' },
            update: {},
            create: {
                id: 'vendor-fashion-hub',
                name: 'Fashion Hub',
                email: 'fashionhub@vendor.com',
                mobile: '9876543210',
                businessName: 'Fashion Hub Pvt Ltd',
                gstNumber: 'GST123456789',
                kycStatus: 'APPROVED',
                isActive: true,
            },
        }),
        prisma.vendor.upsert({
            where: { id: 'vendor-tech-store' },
            update: {},
            create: {
                id: 'vendor-tech-store',
                name: 'Tech Store',
                email: 'techstore@vendor.com',
                mobile: '9876543211',
                businessName: 'Tech Store India',
                gstNumber: 'GST987654321',
                kycStatus: 'APPROVED',
                isActive: true,
            },
        }),
        prisma.vendor.upsert({
            where: { id: 'vendor-home-essentials' },
            update: {},
            create: {
                id: 'vendor-home-essentials',
                name: 'Home Essentials',
                email: 'homeessentials@vendor.com',
                mobile: '9876543212',
                businessName: 'Home Essentials Co',
                gstNumber: 'GST456789123',
                kycStatus: 'APPROVED',
                isActive: true,
            },
        }),
    ]);
    console.log('✅ Created 3 vendors\n');
    console.log('👥 Creating sample customers...');
    const customers = await Promise.all([
        prisma.user.upsert({
            where: { email: 'customer1@example.com' },
            update: {},
            create: {
                email: 'customer1@example.com',
                password: await bcrypt.hash('password123', 10),
                name: 'Rajesh Kumar',
                mobile: '9123456780',
                role: 'CUSTOMER',
                isActive: true,
            },
        }),
        prisma.user.upsert({
            where: { email: 'customer2@example.com' },
            update: {},
            create: {
                email: 'customer2@example.com',
                password: await bcrypt.hash('password123', 10),
                name: 'Priya Sharma',
                mobile: '9123456781',
                role: 'CUSTOMER',
                isActive: true,
            },
        }),
    ]);
    console.log('✅ Created 2 sample customers\n');
    console.log('📦 Creating sample products across all categories...\n');
    const categories = await prisma.category.findMany();
    const getCategoryByName = (name) => categories.find(c => c.name === name);
    console.log('👕 Creating Fashion products...');
    await prisma.product.createMany({
        data: [
            {
                id: 'prod-mens-shirt-1',
                name: 'Cotton Formal Shirt',
                description: 'Premium cotton formal shirt for men',
                vendorId: vendors[0].id,
                categoryId: getCategoryByName('Shirts')?.id || 'cat-mens-shirts',
                brand: 'Arrow',
                mrp: 1999,
                sellingPrice: 1499,
                costPrice: 1000,
                stock: 50,
                images: ['https://picsum.photos/seed/shirt1/400', 'https://picsum.photos/seed/shirt1a/400'],
                isActive: true,
            },
            {
                id: 'prod-womens-dress-1',
                name: 'Floral Summer Dress',
                description: 'Beautiful floral print summer dress',
                vendorId: vendors[0].id,
                categoryId: getCategoryByName('Dresses')?.id || 'cat-womens-dresses',
                brand: 'Zara',
                mrp: 2999,
                sellingPrice: 2499,
                costPrice: 1500,
                stock: 30,
                images: ['https://picsum.photos/seed/dress1/400', 'https://picsum.photos/seed/dress1a/400'],
                isActive: true,
            },
            {
                id: 'prod-kids-tshirt-1',
                name: 'Kids Cartoon T-Shirt',
                description: 'Colorful cartoon printed t-shirt for kids',
                vendorId: vendors[0].id,
                categoryId: getCategoryByName('Boys Clothing')?.id || 'cat-boys-clothing',
                brand: 'Mothercare',
                mrp: 799,
                sellingPrice: 599,
                costPrice: 300,
                stock: 100,
                images: ['https://picsum.photos/seed/kidstshirt/400'],
                isActive: true,
            },
        ],
    });
    console.log('📱 Creating Electronics products...');
    await prisma.product.createMany({
        data: [
            {
                id: 'prod-smartphone-1',
                name: 'Samsung Galaxy S23',
                description: '5G smartphone with 128GB storage, 8GB RAM',
                vendorId: vendors[1].id,
                categoryId: getCategoryByName('Smartphones')?.id || 'cat-smartphones',
                brand: 'Samsung',
                mrp: 74999,
                sellingPrice: 69999,
                costPrice: 60000,
                stock: 25,
                images: ['https://picsum.photos/seed/phone1/400', 'https://picsum.photos/seed/phone1a/400', 'https://picsum.photos/seed/phone1b/400'],
                isActive: true,
            },
            {
                id: 'prod-laptop-1',
                name: 'Dell Inspiron 15',
                description: 'Intel i5, 8GB RAM, 512GB SSD laptop',
                vendorId: vendors[1].id,
                categoryId: getCategoryByName('Laptops')?.id || 'cat-laptops',
                brand: 'Dell',
                mrp: 55999,
                sellingPrice: 52999,
                costPrice: 45000,
                stock: 15,
                images: ['https://picsum.photos/seed/laptop1/400', 'https://picsum.photos/seed/laptop1a/400'],
                isActive: true,
            },
            {
                id: 'prod-headphones-1',
                name: 'Sony WH-1000XM5',
                description: 'Noise cancelling wireless headphones',
                vendorId: vendors[1].id,
                categoryId: getCategoryByName('Headphones')?.id || 'cat-headphones',
                brand: 'Sony',
                mrp: 29999,
                sellingPrice: 27999,
                costPrice: 22000,
                stock: 40,
                images: ['https://picsum.photos/seed/headphones/400'],
                isActive: true,
            },
        ],
    });
    console.log('🏠 Creating Home & Kitchen products...');
    await prisma.product.createMany({
        data: [
            {
                id: 'prod-sofa-1',
                name: '3-Seater Fabric Sofa',
                description: 'Comfortable 3-seater sofa with premium fabric',
                vendorId: vendors[2].id,
                categoryId: getCategoryByName('Living Room Furniture')?.id || 'cat-living-room',
                brand: 'Urban Ladder',
                mrp: 35999,
                sellingPrice: 32999,
                costPrice: 25000,
                stock: 10,
                images: ['https://picsum.photos/seed/sofa/400', 'https://picsum.photos/seed/sofa1/400'],
                isActive: true,
            },
            {
                id: 'prod-mixer-1',
                name: 'Philips Mixer Grinder',
                description: '750W mixer grinder with 3 jars',
                vendorId: vendors[2].id,
                categoryId: getCategoryByName('Small Appliances')?.id || 'cat-small-appliances',
                brand: 'Philips',
                mrp: 4999,
                sellingPrice: 3999,
                costPrice: 2500,
                stock: 50,
                images: ['https://picsum.photos/seed/mixer/400'],
                isActive: true,
            },
        ],
    });
    console.log('🛒 Creating Groceries products...');
    await prisma.product.createMany({
        data: [
            {
                id: 'prod-apple-1',
                name: 'Fresh Red Apples',
                description: 'Premium quality fresh red apples from Kashmir',
                vendorId: vendors[2].id,
                categoryId: getCategoryByName('Fruits')?.id || 'cat-fruits',
                brand: 'Fresh Farms',
                mrp: 180,
                sellingPrice: 150,
                costPrice: 100,
                stock: 200,
                unit: 'kg',
                images: ['https://picsum.photos/seed/apple/400'],
                isActive: true,
            },
            {
                id: 'prod-milk-1',
                name: 'Amul Taaza Milk',
                description: 'Fresh toned milk 1L pack',
                vendorId: vendors[2].id,
                categoryId: getCategoryByName('Milk & Cream')?.id || 'cat-milk-products',
                brand: 'Amul',
                mrp: 56,
                sellingPrice: 56,
                costPrice: 45,
                stock: 500,
                unit: 'L',
                images: ['https://picsum.photos/seed/milk/400'],
                isActive: true,
            },
            {
                id: 'prod-snacks-1',
                name: 'Lays Classic Salted Chips',
                description: 'Crispy potato chips - family pack',
                vendorId: vendors[2].id,
                categoryId: getCategoryByName('Snacks')?.id || 'cat-snacks',
                brand: 'Lays',
                mrp: 100,
                sellingPrice: 95,
                costPrice: 70,
                stock: 300,
                images: ['https://picsum.photos/seed/chips/400'],
                isActive: true,
            },
        ],
    });
    console.log('💄 Creating Beauty products...');
    await prisma.product.createMany({
        data: [
            {
                id: 'prod-facewash-1',
                name: 'Himalaya Purifying Neem Face Wash',
                description: 'Gentle face wash with neem extracts',
                vendorId: vendors[0].id,
                categoryId: getCategoryByName('Face Care')?.id || 'cat-face-care',
                brand: 'Himalaya',
                mrp: 175,
                sellingPrice: 140,
                costPrice: 90,
                stock: 150,
                images: ['https://picsum.photos/seed/facewash/400'],
                isActive: true,
            },
            {
                id: 'prod-shampoo-1',
                name: 'Pantene Pro-V Shampoo',
                description: 'Hair fall control shampoo 650ml',
                vendorId: vendors[0].id,
                categoryId: getCategoryByName('Shampoo & Conditioner')?.id || 'cat-shampoo',
                brand: 'Pantene',
                mrp: 450,
                sellingPrice: 380,
                costPrice: 250,
                stock: 100,
                images: ['https://picsum.photos/seed/shampoo/400'],
                isActive: true,
            },
        ],
    });
    console.log('⚽ Creating Sports products...');
    await prisma.product.createMany({
        data: [
            {
                id: 'prod-cricket-bat-1',
                name: 'MRF Cricket Bat',
                description: 'Professional grade cricket bat - English willow',
                vendorId: vendors[1].id,
                categoryId: getCategoryByName('Cricket')?.id || 'cat-cricket',
                brand: 'MRF',
                mrp: 8999,
                sellingPrice: 7999,
                costPrice: 6000,
                stock: 20,
                images: ['https://picsum.photos/seed/bat/400'],
                isActive: true,
            },
            {
                id: 'prod-yoga-mat-1',
                name: 'Premium Yoga Mat',
                description: 'Anti-slip yoga mat with carry bag',
                vendorId: vendors[1].id,
                categoryId: getCategoryByName('Yoga Equipment')?.id || 'cat-yoga',
                brand: 'Decathlon',
                mrp: 1299,
                sellingPrice: 999,
                costPrice: 600,
                stock: 80,
                images: ['https://picsum.photos/seed/yogamat/400'],
                isActive: true,
            },
        ],
    });
    console.log('📚 Creating Books products...');
    await prisma.product.createMany({
        data: [
            {
                id: 'prod-book-1',
                name: 'The Alchemist',
                description: 'Paulo Coelho bestselling novel',
                vendorId: vendors[0].id,
                categoryId: getCategoryByName('Fiction')?.id || 'cat-fiction',
                brand: 'Harper Collins',
                mrp: 350,
                sellingPrice: 280,
                costPrice: 180,
                stock: 100,
                images: ['https://picsum.photos/seed/book1/400'],
                isActive: true,
            },
            {
                id: 'prod-notebook-1',
                name: 'Classmate Notebook Pack',
                description: 'Pack of 6 single line notebooks',
                vendorId: vendors[0].id,
                categoryId: getCategoryByName('Notebooks & Diaries')?.id || 'cat-notebooks',
                brand: 'Classmate',
                mrp: 240,
                sellingPrice: 210,
                costPrice: 150,
                stock: 200,
                images: ['https://picsum.photos/seed/notebook/400'],
                isActive: true,
            },
        ],
    });
    console.log('🧸 Creating Toys products...');
    await prisma.product.createMany({
        data: [
            {
                id: 'prod-lego-1',
                name: 'LEGO City Building Set',
                description: 'Educational building blocks set for kids',
                vendorId: vendors[0].id,
                categoryId: getCategoryByName('Educational Toys')?.id || 'cat-educational-toys',
                brand: 'LEGO',
                mrp: 2999,
                sellingPrice: 2499,
                costPrice: 1800,
                stock: 50,
                images: ['https://picsum.photos/seed/lego/400', 'https://picsum.photos/seed/lego1/400'],
                isActive: true,
            },
            {
                id: 'prod-doll-1',
                name: 'Barbie Fashion Doll',
                description: 'Barbie doll with accessories',
                vendorId: vendors[0].id,
                categoryId: getCategoryByName('Dolls')?.id || 'cat-dolls',
                brand: 'Barbie',
                mrp: 1499,
                sellingPrice: 1299,
                costPrice: 900,
                stock: 75,
                images: ['https://picsum.photos/seed/barbie/400'],
                isActive: true,
            },
        ],
    });
    console.log('✅ Created 20+ products across all categories\n');
    console.log('🎨 Creating product variations...');
    await prisma.productVariation.createMany({
        data: [
            {
                productId: 'prod-mens-shirt-1',
                sku: 'FSH-SHIRT-M-BLU',
                attributes: { size: 'M', color: 'Blue' },
                mrp: 1999,
                sellingPrice: 1499,
                costPrice: 1000,
                stock: 15,
            },
            {
                productId: 'prod-mens-shirt-1',
                sku: 'FSH-SHIRT-L-BLU',
                attributes: { size: 'L', color: 'Blue' },
                mrp: 1999,
                sellingPrice: 1499,
                costPrice: 1000,
                stock: 20,
            },
            {
                productId: 'prod-mens-shirt-1',
                sku: 'FSH-SHIRT-M-WHT',
                attributes: { size: 'M', color: 'White' },
                mrp: 1999,
                sellingPrice: 1499,
                costPrice: 1000,
                stock: 15,
            },
        ],
    });
    await prisma.productVariation.createMany({
        data: [
            {
                productId: 'prod-smartphone-1',
                sku: 'TCH-S23-8GB-128GB-BLK',
                attributes: { ram: '8GB', storage: '128GB', color: 'Black' },
                mrp: 74999,
                sellingPrice: 69999,
                costPrice: 60000,
                stock: 10,
            },
            {
                productId: 'prod-smartphone-1',
                sku: 'TCH-S23-8GB-256GB-BLK',
                attributes: { ram: '8GB', storage: '256GB', color: 'Black' },
                mrp: 84999,
                sellingPrice: 79999,
                costPrice: 68000,
                stock: 8,
            },
            {
                productId: 'prod-smartphone-1',
                sku: 'TCH-S23-8GB-128GB-WHT',
                attributes: { ram: '8GB', storage: '128GB', color: 'White' },
                mrp: 74999,
                sellingPrice: 69999,
                costPrice: 60000,
                stock: 7,
            },
        ],
    });
    console.log('✅ Created product variations\n');
    const totalProducts = await prisma.product.count();
    const totalVariations = await prisma.productVariation.count();
    const totalVendors = await prisma.vendor.count();
    const totalUsers = await prisma.user.count();
    console.log('\n🎉 Mock database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Admin User: admin.risbow@gmail.com / risbow123`);
    console.log(`   Total Users: ${totalUsers} (1 admin + ${totalUsers - 1} customers)`);
    console.log(`   Total Vendors: ${totalVendors}`);
    console.log(`   Total Products: ${totalProducts}`);
    console.log(`   Total Variations: ${totalVariations}`);
    console.log(`   Categories: 70+ (across 8 main groups)`);
    console.log('\n✅ All products include images/media');
    console.log('✅ Products created for all category types');
    console.log('✅ Sample variations added for fashion and electronics\n');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-mock-data.js.map