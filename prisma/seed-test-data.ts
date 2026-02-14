import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seeding...\n');

  // ==================== ADMIN USERS ====================
  console.log('👤 Creating admin users...');
  const hashedPassword = await bcrypt.hash('risbow123', 10);
  
  const admin = await prisma.user.upsert({
    where: { mobile: '9999999999' },
    update: {},
    create: {
      id: uuidv4(),
      mobile: '9999999999',
      name: 'Risbow Super Admin',
      email: 'admin@risbow.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      referralCode: 'ADMIN001',
    },
  });
  console.log('✅ Super Admin created: admin@risbow.com / risbow123');

  // Create AdminUser (for admin panel)
  const adminUser = await prisma.adminUser.upsert({
    where: { email: 'admin@risbow.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'admin@risbow.com',
      password: hashedPassword,
      name: 'Risbow Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log('✅ AdminUser created for admin panel\n');

  // ==================== VENDORS ====================
  console.log('🏪 Creating vendors...');
  
  const vendors = await Promise.all([
    prisma.vendor.upsert({
      where: { mobile: '9876543210' },
      update: {},
      create: {
        id: uuidv4(),
        name: 'Fashion Hub Store',
        mobile: '9876543210',
        email: 'fashionhub@risbow.com',
        storeName: 'Fashion Hub',
        isActive: true,
        kycStatus: 'VERIFIED',
        gstNumber: '27AABCU9603R1ZX',
        isGstVerified: true,
        tier: 'PREMIUM',
        commissionRate: 1000, // 10% in basis points
        pincode: '500001',
        latitude: 17.385,
        longitude: 78.4867,
      },
    }),
    prisma.vendor.upsert({
      where: { mobile: '9876543211' },
      update: {},
      create: {
        id: uuidv4(),
        name: 'Electronics World',
        mobile: '9876543211',
        email: 'electronics@risbow.com',
        storeName: 'Electronics World',
        isActive: true,
        kycStatus: 'VERIFIED',
        gstNumber: '29AABCU9603R2YX',
        isGstVerified: true,
        tier: 'PRO',
        commissionRate: 800, // 8% in basis points
        pincode: '560001',
        latitude: 12.9716,
        longitude: 77.5946,
      },
    }),
    prisma.vendor.upsert({
      where: { mobile: '9876543212' },
      update: {},
      create: {
        id: uuidv4(),
        name: 'Home Essentials Plus',
        mobile: '9876543212',
        email: 'home@risbow.com',
        storeName: 'Home Essentials',
        isActive: true,
        kycStatus: 'VERIFIED',
        gstNumber: '33AABCU9603R3ZX',
        isGstVerified: true,
        tier: 'BASIC',
        commissionRate: 1500, // 15% in basis points
        pincode: '600001',
        latitude: 13.0827,
        longitude: 80.2707,
      },
    }),
  ]);
  console.log(`✅ Created ${vendors.length} vendors\n`);

  // ==================== CUSTOMERS ====================
  console.log('👥 Creating customers...');
  
  const customers = await Promise.all([
    prisma.user.upsert({
      where: { mobile: '9123456780' },
      update: {},
      create: {
        id: uuidv4(),
        mobile: '9123456780',
        name: 'Rajesh Kumar',
        email: 'rajesh@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'CUSTOMER',
        status: 'ACTIVE',
        referralCode: 'RAJ001',
        gender: 'MALE',
      },
    }),
    prisma.user.upsert({
      where: { mobile: '9123456781' },
      update: {},
      create: {
        id: uuidv4(),
        mobile: '9123456781',
        name: 'Priya Sharma',
        email: 'priya@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'CUSTOMER',
        status: 'ACTIVE',
        referralCode: 'PRI002',
        gender: 'FEMALE',
      },
    }),
    prisma.user.upsert({
      where: { mobile: '9123456782' },
      update: {},
      create: {
        id: uuidv4(),
        mobile: '9123456782',
        name: 'Amit Patel',
        email: 'amit@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'CUSTOMER',
        status: 'ACTIVE',
        referralCode: 'AMI003',
        gender: 'MALE',
      },
    }),
  ]);
  console.log(`✅ Created ${customers.length} customers\n`);

  // ==================== CATEGORIES ====================
  console.log('📂 Creating categories...');
  
  // Electronics
  const electronics = await prisma.category.upsert({
    where: { id: 'cat-electronics' },
    update: {},
    create: {
      id: 'cat-electronics',
      name: 'Electronics',
      slug: 'electronics',
      isActive: true,
    },
  });

  const mobiles = await prisma.category.upsert({
    where: { id: 'cat-mobiles' },
    update: {},
    create: {
      id: 'cat-mobiles',
      name: 'Mobiles',
      slug: 'mobiles',
      parentId: electronics.id,
      isActive: true,
    },
  });

  // Fashion
  const fashion = await prisma.category.upsert({
    where: { id: 'cat-fashion' },
    update: {},
    create: {
      id: 'cat-fashion',
      name: 'Fashion',
      slug: 'fashion',
      isActive: true,
    },
  });

  const mensFashion = await prisma.category.upsert({
    where: { id: 'cat-mens-fashion' },
    update: {},
    create: {
      id: 'cat-mens-fashion',
      name: "Men's Fashion",
      slug: 'mens-fashion',
      parentId: fashion.id,
      isActive: true,
    },
  });

  // Home & Kitchen
  const homeKitchen = await prisma.category.upsert({
    where: { id: 'cat-home-kitchen' },
    update: {},
    create: {
      id: 'cat-home-kitchen',
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      isActive: true,
    },
  });

  console.log('✅ Created 5 categories\n');

  // ==================== PRODUCTS ====================
  console.log('📦 Creating products...');
  
  const products = await Promise.all([
    // Electronics products
    prisma.product.upsert({
      where: { id: 'prod-samsung-s23' },
      update: {},
      create: {
        id: 'prod-samsung-s23',
        title: 'Samsung Galaxy S23 Ultra',
        name: 'Samsung Galaxy S23 Ultra',
        description: '5G smartphone with 256GB storage, 12GB RAM, 200MP camera',
        vendorId: vendors[1].id,
        categoryId: mobiles.id,
        price: 124999,
        offerPrice: 109999,
        stock: 25,
        images: ['https://images.unsplash.com/photo-1610945265078-3858a0828671?w=800'],
        isActive: true,
        visibility: 'PUBLISHED',
        brandName: 'Samsung',
        sku: 'SAMS-S23-256GB',
        weight: 200,
        height: 16.3,
        width: 7.8,
        length: 0.9,
      },
    }),
    prisma.product.upsert({
      where: { id: 'prod-iphone-15' },
      update: {},
      create: {
        id: 'prod-iphone-15',
        title: 'iPhone 15 Pro Max',
        name: 'iPhone 15 Pro Max',
        description: 'Latest iPhone with titanium design, 256GB',
        vendorId: vendors[1].id,
        categoryId: mobiles.id,
        price: 159900,
        offerPrice: 149900,
        stock: 15,
        images: ['https://images.unsplash.com/photo-1696446701796-da61225697cc?w=800'],
        isActive: true,
        visibility: 'PUBLISHED',
        brandName: 'Apple',
        sku: 'APL-IP15-256GB',
        weight: 221,
      },
    }),
    // Fashion products
    prisma.product.upsert({
      where: { id: 'prod-mens-shirt' },
      update: {},
      create: {
        id: 'prod-mens-shirt',
        title: 'Premium Cotton Formal Shirt',
        name: 'Premium Cotton Formal Shirt',
        description: '100% cotton formal shirt for men, wrinkle-free',
        vendorId: vendors[0].id,
        categoryId: mensFashion.id,
        price: 1999,
        offerPrice: 1499,
        stock: 100,
        images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800'],
        isActive: true,
        visibility: 'PUBLISHED',
        brandName: 'Arrow',
        sku: 'ARW-SHIRT-001',
        hasVariants: true,
      },
    }),
    prisma.product.upsert({
      where: { id: 'prod-women-dress' },
      update: {},
      create: {
        id: 'prod-women-dress',
        title: 'Floral Summer Dress',
        name: 'Floral Summer Dress',
        description: 'Beautiful floral print summer dress, perfect for casual wear',
        vendorId: vendors[0].id,
        categoryId: fashion.id,
        price: 2999,
        offerPrice: 2499,
        stock: 50,
        images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800'],
        isActive: true,
        visibility: 'PUBLISHED',
        brandName: 'Zara',
        sku: 'ZRA-DRESS-001',
      },
    }),
    // Home products
    prisma.product.upsert({
      where: { id: 'prod-blender' },
      update: {},
      create: {
        id: 'prod-blender',
        title: 'Philips Mixer Grinder 750W',
        name: 'Philips Mixer Grinder 750W',
        description: '750W powerful motor with 3 stainless steel jars',
        vendorId: vendors[2].id,
        categoryId: homeKitchen.id,
        price: 4999,
        offerPrice: 3999,
        stock: 75,
        images: ['https://images.unsplash.com/photo-1570222094114-28a9d88a65e1?w=800'],
        isActive: true,
        visibility: 'PUBLISHED',
        brandName: 'Philips',
        sku: 'PHL-MIXER-750',
      },
    }),
  ]);
  console.log(`✅ Created ${products.length} products\n`);

  // ==================== PRODUCT VARIANTS ====================
  console.log('🎨 Creating product variants...');
  
  await Promise.all([
    prisma.productVariant.upsert({
      where: { id: 'var-shirt-m-blue' },
      update: {},
      create: {
        id: 'var-shirt-m-blue',
        productId: 'prod-mens-shirt',
        sku: 'ARW-SHIRT-M-BLU',
        name: 'Medium Blue',
        attributes: { size: 'M', color: 'Blue' },
        price: 1999,
        offerPrice: 1499,
        stock: 30,
        images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800'],
      },
    }),
    prisma.productVariant.upsert({
      where: { id: 'var-shirt-l-blue' },
      update: {},
      create: {
        id: 'var-shirt-l-blue',
        productId: 'prod-mens-shirt',
        sku: 'ARW-SHIRT-L-BLU',
        name: 'Large Blue',
        attributes: { size: 'L', color: 'Blue' },
        price: 1999,
        offerPrice: 1499,
        stock: 25,
        images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800'],
      },
    }),
    prisma.productVariant.upsert({
      where: { id: 'var-shirt-m-white' },
      update: {},
      create: {
        id: 'var-shirt-m-white',
        productId: 'prod-mens-shirt',
        sku: 'ARW-SHIRT-M-WHT',
        name: 'Medium White',
        attributes: { size: 'M', color: 'White' },
        price: 1999,
        offerPrice: 1499,
        stock: 20,
        images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800'],
      },
    }),
  ]);
  console.log('✅ Created 3 product variants\n');

  // ==================== ADDRESSES ====================
  console.log('📍 Creating addresses...');
  
  await Promise.all([
    prisma.address.upsert({
      where: { id: 'addr-1' },
      update: {},
      create: {
        id: 'addr-1',
        userId: customers[0].id,
        name: 'Rajesh Kumar',
        title: 'Home',
        phone: '9123456780',
        mobile: '9123456780',
        addressLine1: '123 Main Street, Koramangala',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560034',
        isDefault: true,
        label: 'Home',
        latitude: 12.9352,
        longitude: 77.6245,
      },
    }),
    prisma.address.upsert({
      where: { id: 'addr-2' },
      update: {},
      create: {
        id: 'addr-2',
        userId: customers[1].id,
        name: 'Priya Sharma',
        title: 'Home',
        phone: '9123456781',
        mobile: '9123456781',
        addressLine1: '456 Park Avenue, Andheri West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400053',
        isDefault: true,
        label: 'Home',
        latitude: 19.1363,
        longitude: 72.8276,
      },
    }),
  ]);
  console.log('✅ Created 2 addresses\n');

  // ==================== COUPONS ====================
  console.log('🏷️ Creating coupons...');
  
  await Promise.all([
    prisma.coupon.upsert({
      where: { id: 'coupon-welcome10' },
      update: {},
      create: {
        id: 'coupon-welcome10',
        code: 'WELCOME10',
        description: '10% off on first order',
        discountType: 'PERCENTAGE',
        discountValue: 1000, // 10% in basis points
        minOrderAmount: 50000, // ₹500
        maxDiscount: 10000, // ₹100
        usageLimit: 100,
        validFrom: new Date(),
        validUntil: new Date('2025-12-31'),
        isActive: true,
      },
    }),
    prisma.coupon.upsert({
      where: { id: 'coupon-flat50' },
      update: {},
      create: {
        id: 'coupon-flat50',
        code: 'FLAT50',
        description: 'Flat ₹50 off',
        discountType: 'FLAT',
        discountValue: 5000, // ₹50 in paise
        minOrderAmount: 30000, // ₹300
        usageLimit: 50,
        validFrom: new Date(),
        validUntil: new Date('2025-12-31'),
        isActive: true,
      },
    }),
  ]);
  console.log('✅ Created 2 coupons\n');

  // ==================== ORDERS ====================
  console.log('📋 Creating orders...');
  
  const order1 = await prisma.order.upsert({
    where: { id: 'order-001' },
    update: {},
    create: {
      id: 'order-001',
      userId: customers[0].id,
      addressId: 'addr-1',
      itemsSnapshot: JSON.stringify([
        { productId: 'prod-samsung-s23', quantity: 1, price: 109999 },
      ]),
      totalAmount: 109999,
      status: 'DELIVERED',
      orderNumber: 'RISBOW-001',
      razorpayOrderId: 'order_test_001',
      shippingCharges: 0,
      createdAt: new Date('2024-02-01'),
      confirmedAt: new Date('2024-02-01'),
      deliveredAt: new Date('2024-02-05'),
    },
  });

  const order2 = await prisma.order.upsert({
    where: { id: 'order-002' },
    update: {},
    create: {
      id: 'order-002',
      userId: customers[1].id,
      addressId: 'addr-2',
      itemsSnapshot: JSON.stringify([
        { productId: 'prod-mens-shirt', quantity: 2, price: 2998 },
      ]),
      totalAmount: 2998,
      status: 'SHIPPED',
      orderNumber: 'RISBOW-002',
      razorpayOrderId: 'order_test_002',
      shippingCharges: 5000, // ₹50
      createdAt: new Date('2024-02-10'),
      confirmedAt: new Date('2024-02-10'),
    },
  });

  console.log('✅ Created 2 orders\n');

  // ==================== REVIEWS ====================
  console.log('⭐ Creating reviews...');
  
  await prisma.review.create({
    data: {
      id: uuidv4(),
      userId: customers[0].id,
      productId: 'prod-samsung-s23',
      rating: 5,
      comment: 'Amazing phone! Camera quality is outstanding.',
      isVerified: true,
    },
  });
  
  await prisma.review.create({
    data: {
      id: uuidv4(),
      userId: customers[1].id,
      productId: 'prod-mens-shirt',
      rating: 4,
      comment: 'Good quality fabric, fits well.',
      isVerified: true,
    },
  });
  console.log('✅ Created 2 reviews\n');

  // ==================== CARTS ====================
  console.log('🛒 Creating carts...');
  
  const cart = await prisma.cart.upsert({
    where: { userId: customers[0].id },
    update: {},
    create: {
      id: uuidv4(),
      userId: customers[0].id,
      updatedAt: new Date(),
    },
  });

  await prisma.cartItem.create({
    data: {
      id: uuidv4(),
      cartId: cart.id,
      productId: 'prod-iphone-15',
      quantity: 1,
    },
  });
  console.log('✅ Created 1 cart with item\n');

  // ==================== WISHLISTS ====================
  console.log('💝 Creating wishlists...');
  
  await prisma.wishlist.create({
    data: {
      id: uuidv4(),
      userId: customers[1].id,
      productId: 'prod-women-dress',
    },
  });
  console.log('✅ Created 1 wishlist item\n');

  // ==================== BANNERS ====================
  console.log('🎯 Creating banners...');
  
  await prisma.banner.create({
    data: {
      id: uuidv4(),
      title: 'Big Sale - Up to 50% Off',
      imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200',
      slot: 'HOME_TOP',
      slotType: 'HERO',
      device: 'ALL',
      priority: 1,
      startDate: new Date(),
      endDate: new Date('2025-03-31'),
      isActive: true,
      redirectUrl: '/sale',
    },
  });
  console.log('✅ Created 1 banner\n');

  // ==================== NOTIFICATIONS ====================
  console.log('🔔 Creating notifications...');
  
  await prisma.notification.create({
    data: {
      id: uuidv4(),
      userId: customers[0].id,
      title: 'Order Delivered',
      body: 'Your order #RISBOW-001 has been delivered successfully!',
      type: 'ORDER',
      isRead: false,
    },
  });
  console.log('✅ Created 1 notification\n');

  // ==================== INVENTORY ====================
  console.log('📊 Creating inventory records...');
  
  for (const product of products) {
    await prisma.inventory.upsert({
      where: { id: `inv-${product.id}` },
      update: {},
      create: {
        id: `inv-${product.id}`,
        productId: product.id,
        stock: product.stock,
        reservedStock: 0,
        reorderPoint: 10,
        reorderQuantity: 50,
      },
    });
  }
  console.log(`✅ Created ${products.length} inventory records\n`);

  // ==================== SUPPORT TICKETS ====================
  console.log('🎫 Creating support tickets...');
  
  await prisma.supportTicket.create({
    data: {
      id: uuidv4(),
      ticketNumber: 'TKT-001',
      userId: customers[0].id,
      category: 'ORDER_ISSUE',
      subject: 'Order not delivered yet',
      description: 'My order was supposed to be delivered 2 days ago but I have not received it.',
      priority: 'HIGH',
      status: 'OPEN',
      orderId: 'order-002',
    },
  });
  console.log('✅ Created 1 support ticket\n');

  // ==================== SUMMARY ====================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(60) + '\n');
  
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.vendor.count(),
    prisma.product.count(),
    prisma.category.count(),
    prisma.order.count(),
    prisma.review.count(),
    prisma.coupon.count(),
    prisma.address.count(),
    prisma.cart.count(),
    prisma.wishlist.count(),
    prisma.banner.count(),
    prisma.notification.count(),
    prisma.supportTicket.count(),
  ]);

  console.log('📊 FINAL COUNTS:');
  console.log(`   👤 Users: ${counts[0]} (1 Admin + ${counts[0] - 1} Customers)`);
  console.log(`   🏪 Vendors: ${counts[1]}`);
  console.log(`   📦 Products: ${counts[2]}`);
  console.log(`   📂 Categories: ${counts[3]}`);
  console.log(`   📋 Orders: ${counts[4]}`);
  console.log(`   ⭐ Reviews: ${counts[5]}`);
  console.log(`   🏷️ Coupons: ${counts[6]}`);
  console.log(`   📍 Addresses: ${counts[7]}`);
  console.log(`   🛒 Carts: ${counts[8]}`);
  console.log(`   💝 Wishlists: ${counts[9]}`);
  console.log(`   🎯 Banners: ${counts[10]}`);
  console.log(`   🔔 Notifications: ${counts[11]}`);
  console.log(`   🎫 Support Tickets: ${counts[12]}`);
  
  console.log('\n🔑 LOGIN CREDENTIALS:');
  console.log('   Admin: admin@risbow.com / risbow123');
  console.log('   Customer: rajesh@example.com / password123');
  console.log('   Customer: priya@example.com / password123');
  console.log('\n✅ Ready for testing!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
