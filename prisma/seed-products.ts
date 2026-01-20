import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Adding sample products to database...\n');

    // Get categories and vendors
    const categories = await prisma.category.findMany();
    const vendors = await prisma.vendor.findMany();

    if (vendors.length === 0) {
        console.log('⚠️  No vendors found. Creating default vendors first...\n');
        await prisma.vendor.createMany({
            data: [
                {
                    id: 'vendor-fashion-hub',
                    name: 'Fashion Hub',
                    email: 'fashionhub@vendor.com',
                    mobile: '9876543210',
                    kycStatus: 'APPROVED',
                },
                {
                    id: 'vendor-tech-store',
                    name: 'Tech Store',
                    email: 'techstore@vendor.com',
                    mobile: '9876543211',
                    kycStatus: 'APPROVED',
                },
                {
                    id: 'vendor-home-essentials',
                    name: 'Home Essentials',
                    email: 'homeessentials@vendor.com',
                    mobile: '9876543212',
                    kycStatus: 'APPROVED',
                },
            ],
        });
        console.log('✅ Created 3 vendors\n');
    }

    const vendorsList = await prisma.vendor.findMany();
    const getCategoryByName = (name: string) => categories.find(c => c.name === name);

    console.log('📦 Creating products...\n');

    // Fashion Products
    console.log('👕 Fashion products...');
    await prisma.product.createMany({
        data: [
            {
                vendorId: vendorsList[0]?.id || 'vendor-fashion-hub',
                title: 'Cotton Formal Shirt - Blue',
                description: 'Premium cotton formal shirt for men, perfect for office wear',
                price: 1999,
                offerPrice: 1499,
                stock: 50,
                categoryId: getCategoryByName('Shirts')?.id || 'cat-mens-shirts',
                sku: 'FSH-SHIRT-BLU-001',
                brandName: 'Arrow',
                images: ['https://picsum.photos/seed/shirt1/600', 'https://picsum.photos/seed/shirt1a/600'],
                tags: ['fashion', 'men', 'formal', 'shirt'],
                isActive: true,
            },
            {
                vendorId: vendorsList[0]?.id || 'vendor-fashion-hub',
                title: 'Floral Summer Dress',
                description: 'Beautiful floral print summer dress for women',
                price: 2999,
                offerPrice: 2499,
                stock: 30,
                categoryId: getCategoryByName('Dresses')?.id || 'cat-womens-dresses',
                sku: 'FSH-DRESS-FLR-001',
                brandName: 'Zara',
                images: ['https://picsum.photos/seed/dress1/600', 'https://picsum.photos/seed/dress1a/600'],
                tags: ['fashion', 'women', 'dress', 'summer'],
                isActive: true,
            },
            {
                vendorId: vendorsList[0]?.id || 'vendor-fashion-hub',
                title: 'Kids Cartoon T-Shirt',
                description: 'Colorful cartoon printed t-shirt for kids',
                price: 799,
                offerPrice: 599,
                stock: 100,
                categoryId: getCategoryByName('Boys Clothing')?.id || 'cat-boys-clothing',
                sku: 'FSH-KTSH-CAR-001',
                brandName: 'Mothercare',
                images: ['https://picsum.photos/seed/kidstshirt/600'],
                tags: ['fashion', 'kids', 'tshirt'],
                isActive: true,
            },
        ],
    });

    // Electronics Products
    console.log('📱 Electronics products...');
    await prisma.product.createMany({
        data: [
            {
                vendorId: vendorsList[1]?.id || 'vendor-tech-store',
                title: 'Samsung Galaxy S23 5G',
                description: '5G smartphone with 128GB storage, 8GB RAM, 50MP camera',
                price: 74999,
                offerPrice: 69999,
                stock: 25,
                categoryId: getCategoryByName('Smartphones')?.id || 'cat-smartphones',
                sku: 'ELC-S23-8GB-128',
                brandName: 'Samsung',
                images: ['https://picsum.photos/seed/phone1/600', 'https://picsum.photos/seed/phone1a/600', 'https://picsum.photos/seed/phone1b/600'],
                tags: ['electronics', 'smartphone', '5g', 'samsung'],
                isActive: true,
            },
            {
                vendorId: vendorsList[1]?.id || 'vendor-tech-store',
                title: 'Dell Inspiron 15 Laptop',
                description: 'Intel i5 11th Gen, 8GB RAM, 512GB SSD, 15.6" FHD Display',
                price: 55999,
                offerPrice: 52999,
                stock: 15,
                categoryId: getCategoryByName('Laptops')?.id || 'cat-laptops',
                sku: 'ELC-DELL-I5-512',
                brandName: 'Dell',
                images: ['https://picsum.photos/seed/laptop1/600', 'https://picsum.photos/seed/laptop1a/600'],
                tags: ['electronics', 'laptop', 'dell', 'computer'],
                isActive: true,
            },
            {
                vendorId: vendorsList[1]?.id || 'vendor-tech-store',
                title: 'Sony WH-1000XM5 Headphones',
                description: 'Premium noise cancelling wireless headphones',
                price: 29999,
                offerPrice: 27999,
                stock: 40,
                categoryId: getCategoryByName('Headphones')?.id || 'cat-headphones',
                sku: 'ELC-SONY-WH1000',
                brandName: 'Sony',
                images: ['https://picsum.photos/seed/headphones/600'],
                tags: ['electronics', 'audio', 'headphones', 'sony'],
                isActive: true,
            },
        ],
    });

    // Home & Kitchen Products
    console.log('🏠 Home & Kitchen products...');
    await prisma.product.createMany({
        data: [
            {
                vendorId: vendorsList[2]?.id || 'vendor-home-essentials',
                title: '3-Seater Fabric Sofa',
                description: 'Comfortable 3-seater sofa with premium fabric upholstery',
                price: 35999,
                offerPrice: 32999,
                stock: 10,
                categoryId: getCategoryByName('Living Room Furniture')?.id || 'cat-living-room',
                sku: 'HOM-SOFA-3ST-001',
                brandName: 'Urban Ladder',
                images: ['https://picsum.photos/seed/sofa/600', 'https://picsum.photos/seed/sofa1/600'],
                tags: ['home', 'furniture', 'sofa'],
                isActive: true,
            },
            {
                vendorId: vendorsList[2]?.id || 'vendor-home-essentials',
                title: 'Philips Mixer Grinder 750W',
                description: '750W mixer grinder with 3 jars - perfect for Indian cooking',
                price: 4999,
                offerPrice: 3999,
                stock: 50,
                categoryId: getCategoryByName('Small Appliances')?.id || 'cat-small-appliances',
                sku: 'HOM-MIX-PHL-750',
                brandName: 'Philips',
                images: ['https://picsum.photos/seed/mixer/600'],
                tags: ['home', 'appliances', 'mixer'],
                isActive: true,
            },
        ],
    });

    // Groceries Products
    console.log('🛒 Groceries products...');
    await prisma.product.createMany({
        data: [
            {
                vendorId: vendorsList[2]?.id || 'vendor-home-essentials',
                title: 'Fresh Red Apples (Kashmir)',
                description: 'Premium quality fresh red apples from Kashmir - 1kg',
                price: 180,
                offerPrice: 150,
                stock: 200,
                categoryId: getCategoryByName('Fruits')?.id || 'cat-fruits',
                sku: 'GRO-APL-KSH-1KG',
                brandName: 'Fresh Farms',
                images: ['https://picsum.photos/seed/apple/600'],
                tags: ['groceries', 'fruits', 'fresh'],
                isActive: true,
            },
            {
                vendorId: vendorsList[2]?.id || 'vendor-home-essentials',
                title: 'Amul Taaza Toned Milk',
                description: 'Fresh toned milk 1L pack - daily fresh delivery',
                price: 56,
                offerPrice: 56,
                stock: 500,
                categoryId: getCategoryByName('Milk & Cream')?.id || 'cat-milk-products',
                sku: 'GRO-MLK-AML-1L',
                brandName: 'Amul',
                images: ['https://picsum.photos/seed/milk/600'],
                tags: ['groceries', 'dairy', 'milk'],
                isActive: true,
            },
            {
                vendorId: vendorsList[2]?.id || 'vendor-home-essentials',
                title: 'Lays Classic Salted Chips',
                description: 'Crispy potato chips - family pack 150g',
                price: 100,
                offerPrice: 95,
                stock: 300,
                categoryId: getCategoryByName('Snacks')?.id || 'cat-snacks',
                sku: 'GRO-SNK-LAY-150',
                brandName: 'Lays',
                images: ['https://picsum.photos/seed/chips/600'],
                tags: ['groceries', 'snacks', 'chips'],
                isActive: true,
            },
        ],
    });

    // Beauty Products
    console.log('💄 Beauty products...');
    await prisma.product.createMany({
        data: [
            {
                vendorId: vendorsList[0]?.id || 'vendor-fashion-hub',
                title: 'Himalaya Purifying Neem Face Wash',
                description: 'Gentle face wash with neem extracts - 150ml',
                price: 175,
                offerPrice: 140,
                stock: 150,
                categoryId: getCategoryByName('Face Care')?.id || 'cat-face-care',
                sku: 'BTY-FCW-HIM-150',
                brandName: 'Himalaya',
                images: ['https://picsum.photos/seed/facewash/600'],
                tags: ['beauty', 'skincare', 'facewash'],
                isActive: true,
            },
            {
                vendorId: vendorsList[0]?.id || 'vendor-fashion-hub',
                title: 'Pantene Pro-V Hair Fall Control Shampoo',
                description: 'Hair fall control shampoo 650ml - strengthens hair',
                price: 450,
                offerPrice: 380,
                stock: 100,
                categoryId: getCategoryByName('Shampoo & Conditioner')?.id || 'cat-shampoo',
                sku: 'BTY-SHP-PAN-650',
                brandName: 'Pantene',
                images: ['https://picsum.photos/seed/shampoo/600'],
                tags: ['beauty', 'haircare', 'shampoo'],
                isActive: true,
            },
        ],
    });

    // Sports Products
    console.log('⚽ Sports products...');
    await prisma.product.createMany({
        data: [
            {
                vendorId: vendorsList[1]?.id || 'vendor-tech-store',
                title: 'MRF Cricket Bat - English Willow',
                description: 'Professional grade cricket bat - English willow wood',
                price: 8999,
                offerPrice: 7999,
                stock: 20,
                categoryId: getCategoryByName('Cricket')?.id || 'cat-cricket',
                sku: 'SPT-BAT-MRF-ENG',
                brandName: 'MRF',
                images: ['https://picsum.photos/seed/bat/600'],
                tags: ['sports', 'cricket', 'bat'],
                isActive: true,
            },
            {
                vendorId: vendorsList[1]?.id || 'vendor-tech-store',
                title: 'Premium Yoga Mat with Carry Bag',
                description: 'Anti-slip yoga mat 6mm thickness with carry bag',
                price: 1299,
                offerPrice: 999,
                stock: 80,
                categoryId: getCategoryByName('Yoga Equipment')?.id || 'cat-yoga',
                sku: 'SPT-YOG-MAT-6MM',
                brandName: 'Decathlon',
                images: ['https://picsum.photos/seed/yogamat/600'],
                tags: ['sports', 'yoga', 'fitness'],
                isActive: true,
            },
        ],
    });

    // Books Products
    console.log('📚 Books products...');
    await prisma.product.createMany({
        data: [
            {
                vendorId: vendorsList[0]?.id || 'vendor-fashion-hub',
                title: 'The Alchemist by Paulo Coelho',
                description: 'International bestselling novel - paperback edition',
                price: 350,
                offerPrice: 280,
                stock: 100,
                categoryId: getCategoryByName('Fiction')?.id || 'cat-fiction',
                sku: 'BOK-FIC-ALC-001',
                brandName: 'Harper Collins',
                images: ['https://picsum.photos/seed/book1/600'],
                tags: ['books', 'fiction', 'bestseller'],
                isActive: true,
            },
            {
                vendorId: vendorsList[0]?.id || 'vendor-fashion-hub',
                title: 'Classmate Notebook Pack of 6',
                description: 'Single line notebooks - 172 pages each',
                price: 240,
                offerPrice: 210,
                stock: 200,
                categoryId: getCategoryByName('Notebooks & Diaries')?.id || 'cat-notebooks',
                sku: 'BOK-NTB-CLS-6PK',
                brandName: 'Classmate',
                images: ['https://picsum.photos/seed/notebook/600'],
                tags: ['books', 'stationery', 'notebooks'],
                isActive: true,
            },
        ],
    });

    // Toys Products
    console.log('🧸 Toys products...');
    await prisma.product.createMany({
        data: [
            {
                vendorId: vendorsList[0]?.id || 'vendor-fashion-hub',
                title: 'LEGO City Building Set',
                description: 'Educational building blocks set for kids 6+ years',
                price: 2999,
                offerPrice: 2499,
                stock: 50,
                categoryId: getCategoryByName('Educational Toys')?.id || 'cat-educational-toys',
                sku: 'TOY-LEG-CTY-001',
                brandName: 'LEGO',
                images: ['https://picsum.photos/seed/lego/600', 'https://picsum.photos/seed/lego1/600'],
                tags: ['toys', 'educational', 'lego'],
                isActive: true,
            },
            {
                vendorId: vendorsList[0]?.id || 'vendor-fashion-hub',
                title: 'Barbie Fashion Doll with Accessories',
                description: 'Barbie doll with fashion accessories and outfits',
                price: 1499,
                offerPrice: 1299,
                stock: 75,
                categoryId: getCategoryByName('Dolls')?.id || 'cat-dolls',
                sku: 'TOY-BAR-FSH-001',
                brandName: 'Barbie',
                images: ['https://picsum.photos/seed/barbie/600'],
                tags: ['toys', 'dolls', 'barbie'],
                isActive: true,
            },
        ],
    });

    // Summary
    const totalProducts = await prisma.product.count();
    console.log(`\n✅ Successfully created 20 products across all categories`);
    console.log(`📊 Total products in database: ${totalProducts}\n`);
    console.log('🎉 All products have images and are ready to display!\n');
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
