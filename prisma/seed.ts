import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create Admin Users (User model with admin roles)
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    const superAdminUser = await prisma.user.upsert({
        where: { mobile: '9999999999' },
        update: {},
        create: {
            mobile: '9999999999',
            email: 'superadmin@risbow.com',
            name: 'Super Admin',
            password: adminPassword,
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
            coinsBalance: 10000,
        }
    });
    console.log('✅ Super Admin User created:', superAdminUser.email);

    const adminUser = await prisma.user.upsert({
        where: { mobile: '8888888888' },
        update: {},
        create: {
            mobile: '8888888888',
            email: 'admin@risbow.com',
            name: 'Admin User',
            password: adminPassword,
            role: 'ADMIN',
            status: 'ACTIVE',
            coinsBalance: 5000,
        }
    });
    console.log('✅ Admin User created:', adminUser.email);

    // Create Admin records (separate Admin model for audit logs)
    const superAdmin = await prisma.admin.upsert({
        where: { email: 'superadmin@risbow.com' },
        update: {},
        create: {
            email: 'superadmin@risbow.com',
            password: adminPassword,
            role: 'SUPER_ADMIN',
        }
    });

    const admin = await prisma.admin.upsert({
        where: { email: 'admin@risbow.com' },
        update: {},
        create: {
            email: 'admin@risbow.com',
            password: adminPassword,
            role: 'SUPPORT',
        }
    });
    console.log('✅ Admin records created for audit logs');

    // Create Test Customers
    const customerPassword = await bcrypt.hash('customer123', 10);
    
    const customer1 = await prisma.user.upsert({
        where: { mobile: '9876543210' },
        update: {},
        create: {
            mobile: '9876543210',
            email: 'john@example.com',
            name: 'John Doe',
            password: customerPassword,
            role: 'CUSTOMER',
            status: 'ACTIVE',
            coinsBalance: 500,
            gender: 'Male',
            size: 'L',
        }
    });

    const customer2 = await prisma.user.upsert({
        where: { mobile: '9876543211' },
        update: {},
        create: {
            mobile: '9876543211',
            email: 'jane@example.com',
            name: 'Jane Smith',
            password: customerPassword,
            role: 'CUSTOMER',
            status: 'ACTIVE',
            coinsBalance: 1200,
            gender: 'Female',
            size: 'M',
        }
    });

    const customer3 = await prisma.user.upsert({
        where: { mobile: '9876543212' },
        update: {},
        create: {
            mobile: '9876543212',
            email: 'bob@example.com',
            name: 'Bob Wilson',
            password: customerPassword,
            role: 'CUSTOMER',
            status: 'SUSPENDED',
            coinsBalance: 0,
            riskTag: 'HIGH',
        }
    });

    const customer4 = await prisma.user.upsert({
        where: { mobile: '9876543213' },
        update: {},
        create: {
            mobile: '9876543213',
            email: 'alice@example.com',
            name: 'Alice Johnson',
            password: customerPassword,
            role: 'CUSTOMER',
            status: 'ACTIVE',
            coinsBalance: 5000,
            valueTag: 'VIP',
        }
    });

    const customer5 = await prisma.user.upsert({
        where: { mobile: '9876543214' },
        update: {},
        create: {
            mobile: '9876543214',
            email: 'charlie@example.com',
            name: 'Charlie Brown',
            password: customerPassword,
            role: 'CUSTOMER',
            status: 'PENDING',
            coinsBalance: 100,
        }
    });
    
    const customers = [customer1, customer2, customer3, customer4, customer5];
    console.log(`✅ ${customers.length} customers created`);

    // Create Categories (sequential to avoid connection limits)
    await prisma.category.upsert({
        where: { id: 'cat-mens-wear' },
        update: {},
        create: { id: 'cat-mens-wear', name: "Men's Wear", image: 'https://picsum.photos/seed/mens/200' }
    });
    await prisma.category.upsert({
        where: { id: 'cat-womens-wear' },
        update: {},
        create: { id: 'cat-womens-wear', name: "Women's Wear", image: 'https://picsum.photos/seed/womens/200' }
    });
    await prisma.category.upsert({
        where: { id: 'cat-electronics' },
        update: {},
        create: { id: 'cat-electronics', name: 'Electronics', image: 'https://picsum.photos/seed/electronics/200' }
    });
    await prisma.category.upsert({
        where: { id: 'cat-accessories' },
        update: {},
        create: { id: 'cat-accessories', name: 'Accessories', image: 'https://picsum.photos/seed/accessories/200' }
    });
    await prisma.category.upsert({
        where: { id: 'cat-footwear' },
        update: {},
        create: { id: 'cat-footwear', name: 'Footwear', image: 'https://picsum.photos/seed/footwear/200' }
    });
    console.log('✅ 5 categories created');

    // Create Vendors
    const vendor1 = await prisma.vendor.upsert({
        where: { mobile: '7777777777' },
        update: {},
        create: {
            mobile: '7777777777',
            name: 'Fashion Hub',
            email: 'fashionhub@vendor.com',
            kycStatus: 'APPROVED',
            tier: 'PRO',
            gstNumber: 'GST123456789',
            isGstVerified: true,
            vendorCode: 'BOW-01',
            commissionRate: 10.0,
        }
    });

    const vendor2 = await prisma.vendor.upsert({
        where: { mobile: '7777777778' },
        update: {},
        create: {
            mobile: '7777777778',
            name: 'Tech Store',
            email: 'techstore@vendor.com',
            kycStatus: 'APPROVED',
            tier: 'PREMIUM',
            gstNumber: 'GST987654321',
            isGstVerified: true,
            vendorCode: 'BOW-02',
            commissionRate: 8.0,
        }
    });

    await prisma.vendor.upsert({
        where: { mobile: '7777777779' },
        update: {},
        create: {
            mobile: '7777777779',
            name: 'New Vendor',
            email: 'newvendor@vendor.com',
            kycStatus: 'PENDING',
            tier: 'BASIC',
        }
    });
    console.log('✅ 3 vendors created');

    // Create Products (sequential)
    await prisma.product.upsert({
        where: { id: 'prod-tshirt-1' },
        update: {},
        create: {
            id: 'prod-tshirt-1',
            title: 'Classic Cotton T-Shirt',
            description: 'Premium quality cotton t-shirt, perfect for everyday wear.',
            price: 599,
            stock: 100,
            categoryId: 'cat-mens-wear',
            vendorId: vendor1.id,
            images: ['https://picsum.photos/seed/tshirt1/400', 'https://picsum.photos/seed/tshirt2/400'],
            isActive: true,
        }
    });

    await prisma.product.upsert({
        where: { id: 'prod-jeans-1' },
        update: {},
        create: {
            id: 'prod-jeans-1',
            title: 'Slim Fit Denim Jeans',
            description: 'Stylish slim fit jeans with stretch fabric.',
            price: 1299,
            stock: 50,
            categoryId: 'cat-mens-wear',
            vendorId: vendor1.id,
            images: ['https://picsum.photos/seed/jeans1/400'],
            isActive: true,
        }
    });

    await prisma.product.upsert({
        where: { id: 'prod-dress-1' },
        update: {},
        create: {
            id: 'prod-dress-1',
            title: 'Floral Summer Dress',
            description: 'Beautiful floral print dress for summer.',
            price: 1499,
            stock: 30,
            categoryId: 'cat-womens-wear',
            vendorId: vendor1.id,
            images: ['https://picsum.photos/seed/dress1/400'],
            isActive: true,
        }
    });

    await prisma.product.upsert({
        where: { id: 'prod-headphones-1' },
        update: {},
        create: {
            id: 'prod-headphones-1',
            title: 'Wireless Bluetooth Headphones',
            description: 'High-quality sound with noise cancellation.',
            price: 2999,
            stock: 25,
            categoryId: 'cat-electronics',
            vendorId: vendor2.id,
            images: ['https://picsum.photos/seed/headphones/400'],
            isActive: true,
        }
    });

    await prisma.product.upsert({
        where: { id: 'prod-watch-1' },
        update: {},
        create: {
            id: 'prod-watch-1',
            title: 'Smart Watch Pro',
            description: 'Feature-packed smartwatch with health tracking.',
            price: 4999,
            stock: 15,
            categoryId: 'cat-electronics',
            vendorId: vendor2.id,
            images: ['https://picsum.photos/seed/watch/400'],
            isActive: true,
        }
    });

    await prisma.product.upsert({
        where: { id: 'prod-sneakers-1' },
        update: {},
        create: {
            id: 'prod-sneakers-1',
            title: 'Running Sneakers',
            description: 'Comfortable running shoes with cushioned sole.',
            price: 1999,
            stock: 40,
            categoryId: 'cat-footwear',
            vendorId: vendor1.id,
            images: ['https://picsum.photos/seed/sneakers/400'],
            isActive: true,
        }
    });

    await prisma.product.upsert({
        where: { id: 'prod-bag-1' },
        update: {},
        create: {
            id: 'prod-bag-1',
            title: 'Leather Backpack',
            description: 'Genuine leather backpack with laptop compartment.',
            price: 2499,
            stock: 20,
            categoryId: 'cat-accessories',
            vendorId: vendor1.id,
            images: ['https://picsum.photos/seed/backpack/400'],
            isActive: true,
        }
    });

    await prisma.product.upsert({
        where: { id: 'prod-lowstock-1' },
        update: {},
        create: {
            id: 'prod-lowstock-1',
            title: 'Limited Edition Jacket',
            description: 'Exclusive limited edition jacket.',
            price: 3999,
            stock: 3,
            categoryId: 'cat-mens-wear',
            vendorId: vendor1.id,
            images: ['https://picsum.photos/seed/jacket/400'],
            isActive: true,
        }
    });
    console.log('✅ 8 products created');

    // Create Addresses for customers
    const address1 = await prisma.address.create({
        data: {
            user: { connect: { id: customer1.id } },
            name: 'John Doe',
            phone: '9876543210',
            addressLine1: '123 Main Street, Apartment 4B',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            label: 'Home',
            isDefault: true,
        }
    });

    await prisma.address.create({
        data: {
            user: { connect: { id: customer1.id } },
            name: 'John Doe',
            phone: '9876543210',
            addressLine1: 'Tech Park, Building A',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400051',
            label: 'Office',
            isDefault: false,
        }
    });

    const address2 = await prisma.address.create({
        data: {
            user: { connect: { id: customer2.id } },
            name: 'Jane Smith',
            phone: '9876543211',
            addressLine1: '456 Park Avenue',
            city: 'Delhi',
            state: 'Delhi',
            pincode: '110001',
            label: 'Home',
            isDefault: true,
        }
    });
    console.log('✅ 3 addresses created');

    // Create Carts with items
    await prisma.cart.upsert({
        where: { userId: customer1.id },
        update: {},
        create: {
            userId: customer1.id,
            items: {
                create: [
                    { productId: 'prod-tshirt-1', quantity: 2 },
                    { productId: 'prod-jeans-1', quantity: 1 },
                ]
            }
        }
    });

    await prisma.cart.upsert({
        where: { userId: customer2.id },
        update: {},
        create: {
            userId: customer2.id,
            items: {
                create: [
                    { productId: 'prod-dress-1', quantity: 1 },
                    { productId: 'prod-bag-1', quantity: 1 },
                ]
            }
        }
    });
    console.log('✅ Carts created with items');

    // Create Orders
    await prisma.order.create({
        data: {
            userId: customer1.id,
            addressId: address1.id,
            status: 'DELIVERED',
            totalAmount: 2497,
            items: [
                { productId: 'prod-tshirt-1', quantity: 2, price: 599 },
                { productId: 'prod-jeans-1', quantity: 1, price: 1299 },
            ],
            payment: {
                create: {
                    amount: 2497,
                    provider: 'RAZORPAY',
                    status: 'SUCCESS',
                    paymentId: 'pay_test_001',
                }
            }
        }
    });

    await prisma.order.create({
        data: {
            userId: customer1.id,
            addressId: address1.id,
            status: 'SHIPPED',
            totalAmount: 2999,
            awbNumber: 'AWB123456789',
            courierPartner: 'BlueDart',
            items: [
                { productId: 'prod-headphones-1', quantity: 1, price: 2999 },
            ],
            payment: {
                create: {
                    amount: 2999,
                    provider: 'RAZORPAY',
                    status: 'SUCCESS',
                    paymentId: 'pay_test_002',
                }
            }
        }
    });

    await prisma.order.create({
        data: {
            userId: customer2.id,
            addressId: address2.id,
            status: 'CONFIRMED',
            totalAmount: 3998,
            items: [
                { productId: 'prod-dress-1', quantity: 1, price: 1499 },
                { productId: 'prod-bag-1', quantity: 1, price: 2499 },
            ],
            payment: {
                create: {
                    amount: 3998,
                    provider: 'COD',
                    status: 'PENDING',
                }
            }
        }
    });

    await prisma.order.create({
        data: {
            userId: customer4.id,
            addressId: address1.id,
            status: 'CANCELLED',
            totalAmount: 4999,
            items: [
                { productId: 'prod-watch-1', quantity: 1, price: 4999 },
            ],
            payment: {
                create: {
                    amount: 4999,
                    provider: 'RAZORPAY',
                    status: 'REFUNDED',
                }
            }
        }
    });
    console.log('✅ 4 orders created');

    // Create Banners
    await prisma.banner.create({
        data: {
            imageUrl: 'https://picsum.photos/seed/banner1/800/300',
            redirectUrl: '/category/cat-mens-wear',
            slotType: 'HOME',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            isActive: true,
        }
    });

    await prisma.banner.create({
        data: {
            imageUrl: 'https://picsum.photos/seed/banner2/800/300',
            redirectUrl: '/category/cat-electronics',
            slotType: 'HOME',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            isActive: true,
        }
    });
    console.log('✅ 2 banners created');

    // Create Coupons (using upsert to avoid duplicates)
    await prisma.coupon.upsert({
        where: { code: 'WELCOME10' },
        update: {},
        create: {
            code: 'WELCOME10',
            discountType: 'PERCENTAGE',
            discountValue: 10,
            minOrderAmount: 500,
            maxDiscount: 200,
            usageLimit: 1000,
            usedCount: 50,
            isActive: true,
            validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        }
    });

    await prisma.coupon.upsert({
        where: { code: 'FLAT100' },
        update: {},
        create: {
            code: 'FLAT100',
            discountType: 'FLAT',
            discountValue: 100,
            minOrderAmount: 1000,
            usageLimit: 500,
            usedCount: 20,
            isActive: true,
            validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        }
    });
    console.log('✅ 2 coupons created');

    // Create Coin Ledger entries (skip if already exist)
    try {
        await prisma.coinLedger.createMany({
            data: [
                { userId: customer1.id, amount: 100, source: 'SIGNUP_BONUS' },
                { userId: customer1.id, amount: 200, source: 'ORDER_REWARD' },
                { userId: customer1.id, amount: -50, source: 'REDEMPTION' },
                { userId: customer2.id, amount: 500, source: 'REFERRAL_BONUS' },
                { userId: customer4.id, amount: 1000, source: 'VIP_BONUS' },
            ]
        });
        console.log('✅ Coin ledger entries created');
    } catch (e) {
        console.log('⚠️ Coin ledger entries may already exist');
    }

    // Create Reviews (skip duplicates)
    try {
        await prisma.review.createMany({
            data: [
                { userId: customer1.id, productId: 'prod-tshirt-1', rating: 5, comment: 'Excellent quality! Fits perfectly.' },
                { userId: customer1.id, productId: 'prod-jeans-1', rating: 4, comment: 'Good jeans, slightly tight.' },
                { userId: customer2.id, productId: 'prod-dress-1', rating: 5, comment: 'Beautiful dress, love the print!' },
            ]
        });
        console.log('✅ Reviews created');
    } catch (e) {
        console.log('⚠️ Reviews may already exist');
    }

    // Create Notifications
    try {
        await prisma.notification.createMany({
            data: [
                { userId: customer1.id, title: 'Order Delivered', body: 'Your order has been delivered successfully!', type: 'ORDER' },
                { userId: customer1.id, title: 'New Offer', body: 'Get 20% off on all electronics!', type: 'OFFER' },
                { userId: customer2.id, title: 'Order Confirmed', body: 'Your order has been confirmed.', type: 'ORDER' },
            ]
        });
        console.log('✅ Notifications created');
    } catch (e) {
        console.log('⚠️ Notifications may already exist');
    }

    // Create Abandoned Checkouts for Recovery
    try {
        await prisma.abandonedCheckout.create({
            data: {
                userId: customer1.id,
                cartSnapshot: [
                    { productId: 'prod-watch-1', title: 'Smart Watch Pro', price: 4999, quantity: 1 },
                    { productId: 'prod-sneakers-1', title: 'Running Sneakers', price: 1999, quantity: 1 },
                ],
                financeSnapshot: {
                    subtotal: 6998,
                    discount: 500,
                    finalAmount: 6498,
                    paymentMethod: 'RAZORPAY'
                },
                metadata: {
                    stockStatus: 'available',
                    urgencyReason: 'Low stock on watch',
                    activeOffers: ['WELCOME10']
                },
                status: 'NEW',
                abandonedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            }
        });

        await prisma.abandonedCheckout.create({
            data: {
                userId: customer2.id,
                cartSnapshot: [
                    { productId: 'prod-dress-1', title: 'Floral Summer Dress', price: 1499, quantity: 2 },
                ],
                financeSnapshot: {
                    subtotal: 2998,
                    discount: 0,
                    finalAmount: 2998,
                    paymentMethod: 'COD'
                },
                metadata: {
                    stockStatus: 'available',
                    urgencyReason: null,
                    activeOffers: []
                },
                status: 'NEW',
                abandonedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            }
        });

        await prisma.abandonedCheckout.create({
            data: {
                userId: customer4.id,
                cartSnapshot: [
                    { productId: 'prod-headphones-1', title: 'Wireless Bluetooth Headphones', price: 2999, quantity: 1 },
                    { productId: 'prod-bag-1', title: 'Leather Backpack', price: 2499, quantity: 1 },
                ],
                financeSnapshot: {
                    subtotal: 5498,
                    discount: 549,
                    finalAmount: 4949,
                    paymentMethod: 'RAZORPAY'
                },
                metadata: {
                    stockStatus: 'low_stock',
                    urgencyReason: 'VIP customer - high value cart',
                    activeOffers: ['FLAT100']
                },
                status: 'NEW',
                agentId: adminUser.id,
                abandonedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
            }
        });

        await prisma.abandonedCheckout.create({
            data: {
                guestInfo: {
                    name: 'Guest User',
                    phone: '9988776655',
                    email: 'guest@example.com'
                },
                cartSnapshot: [
                    { productId: 'prod-tshirt-1', title: 'Classic Cotton T-Shirt', price: 599, quantity: 3 },
                ],
                financeSnapshot: {
                    subtotal: 1797,
                    discount: 0,
                    finalAmount: 1797,
                    paymentMethod: 'COD'
                },
                metadata: {
                    stockStatus: 'available',
                    urgencyReason: null,
                    activeOffers: []
                },
                status: 'FOLLOW_UP',
                agentId: adminUser.id,
                abandonedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            }
        });

        await prisma.abandonedCheckout.create({
            data: {
                userId: customer5.id,
                cartSnapshot: [
                    { productId: 'prod-lowstock-1', title: 'Limited Edition Jacket', price: 3999, quantity: 1 },
                ],
                financeSnapshot: {
                    subtotal: 3999,
                    discount: 399,
                    finalAmount: 3600,
                    paymentMethod: 'RAZORPAY'
                },
                metadata: {
                    stockStatus: 'critical',
                    urgencyReason: 'Only 3 items left in stock!',
                    activeOffers: ['WELCOME10']
                },
                status: 'NEW',
                abandonedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
            }
        });

        console.log('✅ 5 abandoned checkouts created');
    } catch (e) {
        console.log('⚠️ Abandoned checkouts may already exist', e);
    }

    // Create Audit Logs
    try {
        await prisma.auditLog.createMany({
            data: [
                { adminId: superAdmin.id, entity: 'VENDOR', targetId: vendor1.id, action: 'APPROVE', details: { status: 'APPROVED' } },
                { adminId: admin.id, entity: 'USER', targetId: customer3.id, action: 'SUSPEND_USER', details: { reason: 'Multiple order cancellations' } },
                { adminId: superAdmin.id, entity: 'PRODUCT', targetId: 'prod-tshirt-1', action: 'CREATE', details: { title: 'Classic Cotton T-Shirt' } },
            ]
        });
        console.log('✅ Audit logs created');
    } catch (e) {
        console.log('⚠️ Audit logs may already exist');
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('   Super Admin: 9999999999 / admin123');
    console.log('   Admin: 8888888888 / admin123');
    console.log('   Customer: 9876543210 / customer123');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
