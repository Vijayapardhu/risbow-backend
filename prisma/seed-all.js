"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding comprehensive test data...\n');
    console.log('👥 Creating vendors...');
    const vendors = await Promise.all([
        prisma.vendor.upsert({
            where: { mobile: '9876543210' },
            update: {},
            create: {
                name: 'Fashion Hub',
                email: 'fashionhub@vendor.com',
                mobile: '9876543210',
                vendorCode: 'VEN001',
                kycStatus: 'VERIFIED',
                commissionRate: 10.0,
            },
        }),
        prisma.vendor.upsert({
            where: { mobile: '9876543211' },
            update: {},
            create: {
                name: 'Tech Store',
                email: 'techstore@vendor.com',
                mobile: '9876543211',
                vendorCode: 'VEN002',
                kycStatus: 'VERIFIED',
                commissionRate: 12.0,
            },
        }),
        prisma.vendor.upsert({
            where: { mobile: '9876543212' },
            update: {},
            create: {
                name: 'Home Essentials',
                email: 'homeessentials@vendor.com',
                mobile: '9876543212',
                vendorCode: 'VEN003',
                kycStatus: 'PENDING',
                commissionRate: 8.0,
            },
        }),
        prisma.vendor.upsert({
            where: { mobile: '9876543213' },
            update: {},
            create: {
                name: 'Grocery Mart',
                email: 'grocerymart@vendor.com',
                mobile: '9876543213',
                vendorCode: 'VEN004',
                kycStatus: 'VERIFIED',
                commissionRate: 5.0,
            },
        }),
        prisma.vendor.upsert({
            where: { mobile: '9876543214' },
            update: {},
            create: {
                name: 'Beauty World',
                email: 'beautyworld@vendor.com',
                mobile: '9876543214',
                vendorCode: 'VEN005',
                kycStatus: 'VERIFIED',
                commissionRate: 15.0,
            },
        }),
    ]);
    console.log(`✅ Created ${vendors.length} vendors\n`);
    console.log('👤 Creating customers...');
    const customers = await Promise.all([
        prisma.user.upsert({
            where: { mobile: '9123456780' },
            update: {},
            create: {
                name: 'John Doe',
                email: 'john.doe@customer.com',
                mobile: '9123456780',
                role: 'CUSTOMER',
            },
        }),
        prisma.user.upsert({
            where: { mobile: '9123456781' },
            update: {},
            create: {
                name: 'Jane Smith',
                email: 'jane.smith@customer.com',
                mobile: '9123456781',
                role: 'CUSTOMER',
            },
        }),
        prisma.user.upsert({
            where: { mobile: '9123456782' },
            update: {},
            create: {
                name: 'Mike Wilson',
                email: 'mike.wilson@customer.com',
                mobile: '9123456782',
                role: 'CUSTOMER',
            },
        }),
    ]);
    console.log(`✅ Created ${customers.length} customers\n`);
    console.log('📍 Creating addresses...');
    const addresses = [];
    for (const customer of customers) {
        const address = await prisma.address.create({
            data: {
                userId: customer.id,
                name: customer.name,
                phone: customer.mobile || '9999999999',
                addressLine1: `${Math.floor(Math.random() * 100)} Main Street`,
                addressLine2: 'Apartment ' + Math.floor(Math.random() * 50),
                city: ['Hyderabad', 'Bangalore', 'Mumbai'][Math.floor(Math.random() * 3)],
                state: ['Telangana', 'Karnataka', 'Maharashtra'][Math.floor(Math.random() * 3)],
                pincode: `50000${Math.floor(Math.random() * 10)}`,
                isDefault: true,
            },
        });
        addresses.push(address);
    }
    console.log(`✅ Created ${addresses.length} addresses\n`);
    console.log('🛒 Creating orders...');
    const products = await prisma.product.findMany({ take: 10 });
    if (products.length === 0) {
        console.log('⚠️  No products found. Please run seed-products.ts first.\n');
    }
    else {
        const orderStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
        for (let i = 0; i < 15; i++) {
            const customer = customers[i % customers.length];
            const address = addresses[i % addresses.length];
            const product = products[i % products.length];
            const quantity = Math.floor(Math.random() * 3) + 1;
            const itemTotal = product.offerPrice ? product.offerPrice * quantity : product.price * quantity;
            const shippingCharges = itemTotal > 500 ? 0 : 50;
            const totalAmount = itemTotal + shippingCharges;
            await prisma.order.create({
                data: {
                    userId: customer.id,
                    addressId: address.id,
                    status: orderStatuses[i % orderStatuses.length],
                    totalAmount: totalAmount,
                    shippingCharges: shippingCharges,
                    items: [
                        {
                            productId: product.id,
                            title: product.title,
                            price: product.offerPrice || product.price,
                            quantity: quantity,
                            subtotal: itemTotal,
                        },
                    ],
                },
            });
        }
        console.log(`✅ Created 15 orders\n`);
    }
    console.log('🛍️ Creating cart items...');
    for (let i = 0; i < Math.min(5, products.length); i++) {
        const customer = customers[i % customers.length];
        const product = products[i];
        let cart = await prisma.cart.findUnique({
            where: { userId: customer.id }
        });
        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId: customer.id }
            });
        }
        await prisma.cartItem.create({
            data: {
                cartId: cart.id,
                productId: product.id,
                quantity: Math.floor(Math.random() * 3) + 1,
            },
        });
    }
    console.log(`✅ Created cart items\n`);
    console.log('❤️ Creating wishlist items...');
    for (let i = 0; i < Math.min(8, products.length); i++) {
        const customer = customers[i % customers.length];
        const product = products[i];
        await prisma.wishlist.create({
            data: {
                userId: customer.id,
                productId: product.id,
            },
        });
    }
    console.log(`✅ Created wishlist items\n`);
    console.log('⭐ Creating product reviews...');
    const reviewTexts = [
        'Excellent product! Highly recommended.',
        'Good quality, worth the price.',
        'Average product, could be better.',
        'Not satisfied with the quality.',
        'Amazing! Exceeded my expectations.',
    ];
    for (let i = 0; i < Math.min(10, products.length); i++) {
        const customer = customers[i % customers.length];
        const product = products[i];
        const rating = Math.floor(Math.random() * 3) + 3;
        await prisma.review.create({
            data: {
                userId: customer.id,
                productId: product.id,
                rating: rating,
                comment: reviewTexts[rating - 1],
            },
        });
    }
    console.log(`✅ Created product reviews\n`);
    const counts = {
        vendors: await prisma.vendor.count(),
        users: await prisma.user.count(),
        addresses: await prisma.address.count(),
        products: await prisma.product.count(),
        orders: await prisma.order.count(),
        cartItems: await prisma.cartItem.count(),
        wishlists: await prisma.wishlist.count(),
        reviews: await prisma.review.count(),
    };
    console.log('\n📊 Database Summary:');
    console.log(`   Vendors: ${counts.vendors}`);
    console.log(`   Customers: ${counts.users}`);
    console.log(`   Addresses: ${counts.addresses}`);
    console.log(`   Products: ${counts.products}`);
    console.log(`   Orders: ${counts.orders}`);
    console.log(`   Cart Items: ${counts.cartItems}`);
    console.log(`   Wishlist Items: ${counts.wishlists}`);
    console.log(`   Reviews: ${counts.reviews}`);
    console.log('\n🎉 All test data seeded successfully!\n');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-all.js.map