import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting EXTENDED comprehensive database seeding...\n');

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

  // Create multiple admin users
  const opsAdmin = await prisma.adminUser.upsert({
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

  const financeAdmin = await prisma.adminUser.upsert({
    where: { email: 'finance@risbow.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'finance@risbow.com',
      password: hashedPassword,
      name: 'Finance Manager',
      role: 'FINANCE_ADMIN',
      isActive: true,
    },
  });

  const contentAdmin = await prisma.adminUser.upsert({
    where: { email: 'content@risbow.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'content@risbow.com',
      password: hashedPassword,
      name: 'Content Moderator',
      role: 'CONTENT_MODERATOR',
      isActive: true,
    },
  });
  console.log('✅ Created 4 admin users\n');

  // ==================== EMPLOYEES ====================
  console.log('👔 Creating employees...');
  const employees: any[] = [];
  const empRoles = ['TELECALLER', 'SUPPORT_AGENT', 'WAREHOUSE_STAFF'] as const;
  const empDepts = ['Sales', 'Customer Support', 'Operations'];
  const empNames = ['Rahul Verma', 'Sneha Gupta', 'Vikram Shah'];
  
  for (let i = 0; i < 3; i++) {
    try {
      const timestamp = Date.now();
      const employee = await prisma.employee.create({
        data: {
          id: uuidv4(),
          employeeId: `EMP${timestamp}${i}`,
          name: empNames[i],
          email: `emp${timestamp}${i}@risbow.com`,
          mobile: `99999${timestamp.toString().slice(-5)}${i}`,
          password: hashedPassword,
          role: empRoles[i],
          department: empDepts[i],
          permissions: ['VIEW_ORDERS'],
          isActive: true,
        },
      });
      employees.push(employee);
    } catch (e) {
      console.log(`   ⚠️ Skipping employee ${empNames[i]}`);
    }
  }
  console.log(`✅ Created ${employees.length} new employees\n`);

  // ==================== VENDORS (5) ====================
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
        commissionRate: 1000,
        pincode: '500001',
        latitude: 17.385,
        longitude: 78.4867,
        followCount: 1250,
        coinsBalance: 5000,
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
        commissionRate: 800,
        pincode: '560001',
        latitude: 12.9716,
        longitude: 77.5946,
        followCount: 3400,
        coinsBalance: 12000,
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
        commissionRate: 1500,
        pincode: '600001',
        latitude: 13.0827,
        longitude: 80.2707,
        followCount: 560,
        coinsBalance: 2000,
      },
    }),
    prisma.vendor.upsert({
      where: { mobile: '9876543213' },
      update: {},
      create: {
        id: uuidv4(),
        name: 'Fresh Grocery Mart',
        mobile: '9876543213',
        email: 'grocery@risbow.com',
        storeName: 'Fresh Grocery Mart',
        isActive: true,
        kycStatus: 'VERIFIED',
        gstNumber: '07AABCU9603R4ZX',
        isGstVerified: true,
        tier: 'PRO',
        commissionRate: 500,
        pincode: '110001',
        latitude: 28.6139,
        longitude: 77.2090,
        followCount: 2100,
        coinsBalance: 8000,
      },
    }),
    prisma.vendor.upsert({
      where: { mobile: '9876543214' },
      update: {},
      create: {
        id: uuidv4(),
        name: 'Sports Paradise',
        mobile: '9876543214',
        email: 'sports@risbow.com',
        storeName: 'Sports Paradise',
        isActive: true,
        kycStatus: 'VERIFIED',
        gstNumber: '23AABCU9603R5ZX',
        isGstVerified: true,
        tier: 'BASIC',
        commissionRate: 1200,
        pincode: '452001',
        latitude: 22.7196,
        longitude: 75.8577,
        followCount: 890,
        coinsBalance: 3500,
      },
    }),
  ]);
  console.log(`✅ Created ${vendors.length} vendors\n`);

  // ==================== CUSTOMERS (5) ====================
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
        coinsBalance: 500,
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
        coinsBalance: 1200,
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
        coinsBalance: 0,
      },
    }),
    prisma.user.upsert({
      where: { mobile: '9123456783' },
      update: {},
      create: {
        id: uuidv4(),
        mobile: '9123456783',
        name: 'Sneha Reddy',
        email: 'sneha@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'CUSTOMER',
        status: 'ACTIVE',
        referralCode: 'SNE004',
        coinsBalance: 2500,
      },
    }),
    prisma.user.upsert({
      where: { mobile: '9123456784' },
      update: {},
      create: {
        id: uuidv4(),
        mobile: '9123456784',
        name: 'Karthik Nair',
        email: 'karthik@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'CUSTOMER',
        status: 'ACTIVE',
        referralCode: 'KAR005',
        coinsBalance: 100,
      },
    }),
  ]);
  console.log(`✅ Created ${customers.length} customers\n`);

  // ==================== WALLETS ====================
  console.log('💰 Creating wallets...');
  await Promise.all(
    customers.map(customer =>
      prisma.wallet.upsert({
        where: { userId: customer.id },
        update: {},
        create: {
          id: uuidv4(),
          userId: customer.id,
          balance: Math.floor(Math.random() * 50000),
        },
      })
    )
  );
  console.log('✅ Created wallets for all customers\n');

  // ==================== CATEGORIES ====================
  console.log('📂 Creating categories...');
  
  const electronics = await prisma.category.upsert({
    where: { id: 'cat-electronics' },
    update: {},
    create: { id: 'cat-electronics', name: 'Electronics', slug: 'electronics', isActive: true },
  });

  const mobiles = await prisma.category.upsert({
    where: { id: 'cat-mobiles' },
    update: {},
    create: { id: 'cat-mobiles', name: 'Mobiles', slug: 'mobiles', parentId: electronics.id, isActive: true },
  });

  const laptops = await prisma.category.upsert({
    where: { id: 'cat-laptops' },
    update: {},
    create: { id: 'cat-laptops', name: 'Laptops', slug: 'laptops', parentId: electronics.id, isActive: true },
  });

  const fashion = await prisma.category.upsert({
    where: { id: 'cat-fashion' },
    update: {},
    create: { id: 'cat-fashion', name: 'Fashion', slug: 'fashion', isActive: true },
  });

  const mensFashion = await prisma.category.upsert({
    where: { id: 'cat-mens-fashion' },
    update: {},
    create: { id: 'cat-mens-fashion', name: "Men's Fashion", slug: 'mens-fashion', parentId: fashion.id, isActive: true },
  });

  console.log('✅ Created categories\n');

  // ==================== PRODUCTS (25+) ====================
  console.log('📦 Creating 25+ products...');
  
  const productsData = [
    { id: 'prod-samsung-s23', title: 'Samsung Galaxy S23 Ultra', vendorIdx: 1, catId: mobiles.id, price: 124999, offerPrice: 109999, stock: 25, brand: 'Samsung', sku: 'SAMS-S23-256GB' },
    { id: 'prod-iphone-15', title: 'iPhone 15 Pro Max', vendorIdx: 1, catId: mobiles.id, price: 159900, offerPrice: 149900, stock: 15, brand: 'Apple', sku: 'APL-IP15-256GB' },
    { id: 'prod-oneplus-12', title: 'OnePlus 12', vendorIdx: 1, catId: mobiles.id, price: 69999, offerPrice: 64999, stock: 30, brand: 'OnePlus', sku: 'ONE-12-256GB' },
    { id: 'prod-pixel-8', title: 'Google Pixel 8 Pro', vendorIdx: 1, catId: mobiles.id, price: 106999, offerPrice: 99999, stock: 12, brand: 'Google', sku: 'PIX-8-128GB' },
    { id: 'prod-macbook-pro', title: 'MacBook Pro 14-inch M3', vendorIdx: 1, catId: laptops.id, price: 194900, offerPrice: 179900, stock: 8, brand: 'Apple', sku: 'APL-MBP14-M3' },
    { id: 'prod-dell-xps', title: 'Dell XPS 15', vendorIdx: 1, catId: laptops.id, price: 189999, offerPrice: 174999, stock: 10, brand: 'Dell', sku: 'DELL-XPS15' },
    { id: 'prod-mens-shirt', title: 'Premium Cotton Formal Shirt', vendorIdx: 0, catId: mensFashion.id, price: 1999, offerPrice: 1499, stock: 100, brand: 'Arrow', sku: 'ARW-SHIRT-001', hasVariants: true },
    { id: 'prod-mens-jeans', title: 'Slim Fit Denim Jeans', vendorIdx: 0, catId: mensFashion.id, price: 2499, offerPrice: 1999, stock: 80, brand: 'Levis', sku: 'LEV-JEANS-001', hasVariants: true },
    { id: 'prod-women-dress', title: 'Floral Summer Dress', vendorIdx: 0, catId: fashion.id, price: 2999, offerPrice: 2499, stock: 50, brand: 'Zara', sku: 'ZRA-DRESS-001' },
    { id: 'prod-blender', title: 'Philips Mixer Grinder 750W', vendorIdx: 2, catId: electronics.id, price: 4999, offerPrice: 3999, stock: 75, brand: 'Philips', sku: 'PHL-MIXER-750' },
    { id: 'prod-airfryer', title: 'Philips Air Fryer HD9200', vendorIdx: 2, catId: electronics.id, price: 8999, offerPrice: 7499, stock: 40, brand: 'Philips', sku: 'PHL-AIRFRY-9200' },
    { id: 'prod-apple', title: 'Fresh Kashmiri Apples', vendorIdx: 3, catId: electronics.id, price: 199, offerPrice: 149, stock: 200, brand: 'Fresh Farms', sku: 'FF-APPLE-1KG' },
    { id: 'prod-yoga-mat', title: 'Premium Yoga Mat', vendorIdx: 4, catId: electronics.id, price: 1299, offerPrice: 899, stock: 100, brand: 'Strauss', sku: 'STR-YOGA-6MM' },
    { id: 'prod-facewash', title: 'Himalaya Neem Face Wash', vendorIdx: 2, catId: electronics.id, price: 175, offerPrice: 145, stock: 200, brand: 'Himalaya', sku: 'HIM-FW-NEEM' },
    { id: 'prod-cricket-bat', title: 'MRF Genius Cricket Bat', vendorIdx: 4, catId: electronics.id, price: 8999, offerPrice: 7499, stock: 15, brand: 'MRF', sku: 'MRF-BAT-G1' },
    { id: 'prod-sony-headphones', title: 'Sony WH-1000XM5', vendorIdx: 1, catId: electronics.id, price: 34990, offerPrice: 29990, stock: 25, brand: 'Sony', sku: 'SONY-XM5-BLK' },
    { id: 'prod-airpods', title: 'AirPods Pro 2nd Gen', vendorIdx: 1, catId: electronics.id, price: 26900, offerPrice: 24900, stock: 50, brand: 'Apple', sku: 'APL-AIRPODS-PRO2' },
    { id: 'prod-mens-tshirt', title: 'Polo T-Shirt Pack of 3', vendorIdx: 0, catId: mensFashion.id, price: 1799, offerPrice: 1299, stock: 150, brand: 'US Polo', sku: 'USP-POLO-3PK' },
    { id: 'prod-women-kurta', title: 'Cotton Kurti with Palazzo', vendorIdx: 0, catId: fashion.id, price: 1599, offerPrice: 1199, stock: 75, brand: 'Biba', sku: 'BIB-KURTA-001' },
    { id: 'prod-cookware', title: 'Non-Stick Cookware Set', vendorIdx: 2, catId: electronics.id, price: 3499, offerPrice: 2799, stock: 60, brand: 'Prestige', sku: 'PRS-COOK-5PC' },
    { id: 'prod-banana', title: 'Organic Bananas', vendorIdx: 3, catId: electronics.id, price: 60, offerPrice: 49, stock: 300, brand: 'Organic Farm', sku: 'OF-BANANA-12' },
    { id: 'prod-shampoo', title: 'Loreal Total Repair Shampoo', vendorIdx: 2, catId: electronics.id, price: 699, offerPrice: 549, stock: 150, brand: 'Loreal', sku: 'LOR-SHAMPOO-1L' },
    { id: 'prod-kids-tshirt', title: 'Kids Cartoon T-Shirt Pack', vendorIdx: 0, catId: fashion.id, price: 899, offerPrice: 699, stock: 120, brand: 'Mothercare', sku: 'MOM-KIDS-3PK' },
    { id: 'prod-women-saree', title: 'Banarasi Silk Saree', vendorIdx: 0, catId: fashion.id, price: 8999, offerPrice: 6999, stock: 20, brand: 'CraftsVilla', sku: 'CV-SAREE-001' },
    { id: 'prod-tablet', title: 'iPad Air 5th Gen', vendorIdx: 1, catId: electronics.id, price: 59900, offerPrice: 54900, stock: 18, brand: 'Apple', sku: 'APL-IPAD-AIR5' },
  ];

  const products: any[] = [];
  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        title: p.title,
        name: p.title,
        description: `High quality ${p.title}`,
        vendorId: vendors[p.vendorIdx].id,
        categoryId: p.catId,
        price: p.price,
        offerPrice: p.offerPrice,
        stock: p.stock,
        images: ['https://via.placeholder.com/400'],
        isActive: true,
        visibility: 'PUBLISHED',
        brandName: p.brand,
        sku: p.sku,
        hasVariants: p.hasVariants || false,
      },
    });
    products.push(product);
  }
  console.log(`✅ Created ${products.length} products\n`);

  // ==================== VARIANTS ====================
  console.log('🎨 Creating product variants...');
  const variants = [
    { id: 'var-shirt-m-blue', productId: 'prod-mens-shirt', sku: 'ARW-SHIRT-M-BLU', name: 'Medium Blue', attrs: { size: 'M', color: 'Blue' }, price: 1999, offerPrice: 1499, stock: 30 },
    { id: 'var-shirt-l-blue', productId: 'prod-mens-shirt', sku: 'ARW-SHIRT-L-BLU', name: 'Large Blue', attrs: { size: 'L', color: 'Blue' }, price: 1999, offerPrice: 1499, stock: 25 },
    { id: 'var-shirt-m-white', productId: 'prod-mens-shirt', sku: 'ARW-SHIRT-M-WHT', name: 'Medium White', attrs: { size: 'M', color: 'White' }, price: 1999, offerPrice: 1499, stock: 25 },
    { id: 'var-jeans-30-blue', productId: 'prod-mens-jeans', sku: 'LEV-JEANS-30-BLU', name: '30 Blue', attrs: { size: '30', color: 'Blue' }, price: 2499, offerPrice: 1999, stock: 20 },
    { id: 'var-jeans-32-blue', productId: 'prod-mens-jeans', sku: 'LEV-JEANS-32-BLU', name: '32 Blue', attrs: { size: '32', color: 'Blue' }, price: 2499, offerPrice: 1999, stock: 25 },
  ];

  for (const v of variants) {
    await prisma.productVariant.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        productId: v.productId,
        sku: v.sku,
        name: v.name,
        attributes: v.attrs,
        price: v.price,
        offerPrice: v.offerPrice,
        stock: v.stock,
      },
    });
  }
  console.log(`✅ Created ${variants.length} variants\n`);

  // ==================== ADDRESSES ====================
  console.log('📍 Creating addresses...');
  const addresses = [
    { id: 'addr-1', userIdx: 0, name: 'Rajesh Kumar', phone: '9123456780', line1: '123 Main Street, Koramangala', city: 'Bangalore', state: 'Karnataka', pincode: '560034', isDefault: true },
    { id: 'addr-2', userIdx: 0, name: 'Rajesh Kumar', phone: '9123456780', line1: '456 Tech Park, Whitefield', city: 'Bangalore', state: 'Karnataka', pincode: '560066', isDefault: false },
    { id: 'addr-3', userIdx: 1, name: 'Priya Sharma', phone: '9123456781', line1: '456 Park Avenue, Andheri West', city: 'Mumbai', state: 'Maharashtra', pincode: '400053', isDefault: true },
    { id: 'addr-4', userIdx: 2, name: 'Amit Patel', phone: '9123456782', line1: '321 Lake View, Navrangpura', city: 'Ahmedabad', state: 'Gujarat', pincode: '380009', isDefault: true },
    { id: 'addr-5', userIdx: 3, name: 'Sneha Reddy', phone: '9123456783', line1: '789 HiTech City, Madhapur', city: 'Hyderabad', state: 'Telangana', pincode: '500081', isDefault: true },
  ];

  for (const a of addresses) {
    await prisma.address.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        userId: customers[a.userIdx].id,
        name: a.name,
        phone: a.phone,
        mobile: a.phone,
        addressLine1: a.line1,
        city: a.city,
        state: a.state,
        pincode: a.pincode,
        isDefault: a.isDefault,
        label: a.isDefault ? 'Home' : 'Office',
      },
    });
  }
  console.log(`✅ Created ${addresses.length} addresses\n`);

  // ==================== COUPONS ====================
  console.log('🏷️ Creating coupons...');
  const coupons = [
    { id: 'coupon-welcome10', code: 'WELCOME10', desc: '10% off on first order', type: 'PERCENTAGE', value: 1000, minOrder: 50000, maxDiscount: 10000 },
    { id: 'coupon-flat50', code: 'FLAT50', desc: 'Flat ₹50 off', type: 'FLAT', value: 5000, minOrder: 30000, maxDiscount: 5000 },
    { id: 'coupon-summer20', code: 'SUMMER20', desc: '20% off on summer collection', type: 'PERCENTAGE', value: 2000, minOrder: 100000, maxDiscount: 20000 },
    { id: 'coupon-festive50', code: 'FESTIVE50', desc: '₹500 off on festive orders', type: 'FLAT', value: 50000, minOrder: 200000, maxDiscount: 50000 },
    { id: 'coupon-vip25', code: 'VIP25', desc: '25% off for VIP members', type: 'PERCENTAGE', value: 2500, minOrder: 150000, maxDiscount: 50000 },
  ];

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        code: c.code,
        description: c.desc,
        discountType: c.type,
        discountValue: c.value,
        minOrderAmount: c.minOrder,
        maxDiscount: c.maxDiscount,
        usageLimit: 100,
        validFrom: new Date(),
        validUntil: new Date('2025-12-31'),
        isActive: true,
      },
    });
  }
  console.log(`✅ Created ${coupons.length} coupons\n`);

  // ==================== ORDERS (10) ====================
  console.log('📋 Creating orders...');
  const orders = [
    { id: 'order-001', userIdx: 0, addrId: 'addr-1', total: 109999, status: 'DELIVERED' as const, number: 'RIS-2024-001', shipping: 0 },
    { id: 'order-002', userIdx: 1, addrId: 'addr-3', total: 2998, status: 'SHIPPED' as const, number: 'RIS-2024-002', shipping: 5000 },
    { id: 'order-003', userIdx: 2, addrId: 'addr-4', total: 124999, status: 'CONFIRMED' as const, number: 'RIS-2024-003', shipping: 0 },
    { id: 'order-004', userIdx: 0, addrId: 'addr-1', total: 4999, status: 'PENDING' as const, number: 'RIS-2024-004', shipping: 5000 },
    { id: 'order-005', userIdx: 3, addrId: 'addr-5', total: 69999, status: 'DELIVERED' as const, number: 'RIS-2024-005', shipping: 0 },
    { id: 'order-006', userIdx: 1, addrId: 'addr-3', total: 149900, status: 'CANCELLED' as const, number: 'RIS-2024-006', shipping: 0 },
    { id: 'order-007', userIdx: 4, addrId: 'addr-1', total: 3999, status: 'PACKED' as const, number: 'RIS-2024-007', shipping: 5000 },
    { id: 'order-008', userIdx: 0, addrId: 'addr-2', total: 8999, status: 'SHIPPED' as const, number: 'RIS-2024-008', shipping: 0 },
    { id: 'order-009', userIdx: 2, addrId: 'addr-4', total: 7499, status: 'PENDING' as const, number: 'RIS-2024-009', shipping: 5000 },
    { id: 'order-010', userIdx: 3, addrId: 'addr-5', total: 2799, status: 'CONFIRMED' as const, number: 'RIS-2024-010', shipping: 5000 },
  ];

  for (const o of orders) {
    await prisma.order.upsert({
      where: { id: o.id },
      update: {},
      create: {
        id: o.id,
        userId: customers[o.userIdx].id,
        addressId: o.addrId,
        itemsSnapshot: JSON.stringify([{ productId: 'prod-samsung-s23', quantity: 1, price: o.total }]),
        totalAmount: o.total,
        status: o.status,
        orderNumber: o.number,
        shippingCharges: o.shipping,
      },
    });

    // Create OrderItem record for complete data
    try {
      await prisma.orderItem.create({
        data: {
          id: uuidv4(),
          orderId: o.id,
          productId: 'prod-samsung-s23',
          vendorId: vendors[1].id, // Electronics World
          quantity: 1,
          price: o.total,
          offerPrice: o.total,
          subtotal: o.total,
          tax: Math.round(o.total * 0.18),
          discount: 0,
          total: o.total + Math.round(o.total * 0.18),
          status: 'PENDING',
        },
      });
    } catch (e) {
      // OrderItem may already exist
    }
  }
  console.log(`✅ Created ${orders.length} orders with OrderItems\n`);

  // ==================== REVIEWS ====================
  console.log('⭐ Creating reviews...');
  await prisma.review.create({ data: { id: uuidv4(), userId: customers[0].id, productId: 'prod-samsung-s23', rating: 5, comment: 'Amazing phone! Camera quality is outstanding.', isVerified: true } });
  await prisma.review.create({ data: { id: uuidv4(), userId: customers[1].id, productId: 'prod-mens-shirt', rating: 4, comment: 'Good quality fabric, fits well.', isVerified: true } });
  await prisma.review.create({ data: { id: uuidv4(), userId: customers[2].id, productId: 'prod-iphone-15', rating: 5, comment: 'Best iPhone ever! Worth every penny.', isVerified: true } });
  await prisma.review.create({ data: { id: uuidv4(), userId: customers[3].id, productId: 'prod-blender', rating: 4, comment: 'Powerful mixer, great for daily use.', isVerified: true } });
  console.log('✅ Created 4 reviews\n');

  // ==================== CARTS ====================
  console.log('🛒 Creating carts...');
  for (const customer of customers) {
    await prisma.cart.upsert({
      where: { userId: customer.id },
      update: {},
      create: { id: uuidv4(), userId: customer.id, updatedAt: new Date() },
    });
  }
  console.log('✅ Created carts for all customers\n');

  // ==================== WISHLISTS ====================
  console.log('💝 Creating wishlists...');
  const wishlistItems = [
    { userIdx: 0, productId: 'prod-iphone-15' },
    { userIdx: 1, productId: 'prod-women-dress' },
    { userIdx: 2, productId: 'prod-oneplus-12' },
  ];
  
  let wishlistCount = 0;
  for (const item of wishlistItems) {
    try {
      await prisma.wishlist.create({
        data: {
          id: uuidv4(),
          userId: customers[item.userIdx].id,
          productId: item.productId,
        },
      });
      wishlistCount++;
    } catch (e) {
      // Already exists, skip
    }
  }
  console.log(`✅ Created ${wishlistCount} new wishlist items\n`);

  // ==================== BANNERS ====================
  console.log('🎯 Creating banners...');
  await prisma.banner.create({
    data: {
      id: uuidv4(),
      title: 'Big Sale - Up to 50% Off',
      imageUrl: 'https://via.placeholder.com/1200x400',
      slot: 'HOME_TOP',
      slotType: 'HERO',
      device: 'ALL',
      priority: 1,
      startDate: new Date(),
      endDate: new Date('2025-03-31'),
      isActive: true,
    },
  });
  await prisma.banner.create({
    data: {
      id: uuidv4(),
      title: 'New Arrivals',
      imageUrl: 'https://via.placeholder.com/600x300',
      slot: 'HOME_MIDDLE',
      slotType: 'STANDARD',
      device: 'ALL',
      priority: 2,
      startDate: new Date(),
      endDate: new Date('2025-06-30'),
      isActive: true,
    },
  });
  console.log('✅ Created 2 banners\n');

  // ==================== GIFT SKUs ====================
  console.log('🎁 Creating gift SKUs...');
  const giftSKUs = [
    { id: 'gift-1', title: 'Premium Gift Box', stock: 100, cost: 5000, categories: ['cat-fashion', 'cat-electronics'] },
    { id: 'gift-2', title: 'Festive Hamper', stock: 50, cost: 15000, categories: ['cat-electronics'] },
  ];
  
  let giftCount = 0;
  for (const gift of giftSKUs) {
    try {
      await prisma.giftSKU.create({
        data: {
          id: gift.id,
          title: gift.title,
          stock: gift.stock,
          cost: gift.cost,
          eligibleCategories: gift.categories,
        },
      });
      giftCount++;
    } catch (e) {
      // Already exists
    }
  }
  console.log(`✅ Created ${giftCount} new gift SKUs\n`);

  // ==================== WAREHOUSES ====================
  console.log('🏭 Creating warehouses...');
  const warehouses = await Promise.all([
    prisma.warehouse.upsert({ where: { id: 'wh-bangalore' }, update: {}, create: { id: 'wh-bangalore', name: 'Bangalore Central', location: 'Electronic City', isActive: true } }),
    prisma.warehouse.upsert({ where: { id: 'wh-mumbai' }, update: {}, create: { id: 'wh-mumbai', name: 'Mumbai Distribution', location: 'Bhiwandi', isActive: true } }),
    prisma.warehouse.upsert({ where: { id: 'wh-delhi' }, update: {}, create: { id: 'wh-delhi', name: 'Delhi NCR Hub', location: 'Gurgaon', isActive: true } }),
  ]);
  console.log(`✅ Created ${warehouses.length} warehouses\n`);

  // ==================== SUPPORT TICKETS ====================
  console.log('🎫 Creating support tickets...');
  const tickets = [
    { num: `TKT${Date.now()}1`, userIdx: 0, cat: 'ORDER_ISSUE' as const, subj: 'Order not delivered', desc: 'Order was supposed to be delivered 2 days ago.', priority: 'HIGH' as const, status: 'OPEN' as const, orderId: 'order-002' },
    { num: `TKT${Date.now()}2`, userIdx: 1, cat: 'RETURN_REFUND' as const, subj: 'Return request', desc: 'Received damaged product, need replacement.', priority: 'MEDIUM' as const, status: 'IN_PROGRESS' as const, orderId: 'order-003' },
  ];
  
  let ticketCount = 0;
  for (const t of tickets) {
    try {
      await prisma.supportTicket.create({
        data: {
          id: uuidv4(),
          ticketNumber: t.num,
          userId: customers[t.userIdx].id,
          category: t.cat,
          subject: t.subj,
          description: t.desc,
          priority: t.priority,
          status: t.status,
          orderId: t.orderId,
        },
      });
      ticketCount++;
    } catch (e) {
      // Skip if fails
    }
  }
  console.log(`✅ Created ${ticketCount} new support tickets\n`);

  // ==================== BLOG POSTS ====================
  console.log('📝 Creating blog posts...');
  const blogCategory = await prisma.blogCategory.upsert({
    where: { id: 'blog-cat-fashion' },
    update: {},
    create: { id: 'blog-cat-fashion', name: 'Fashion Tips', slug: 'fashion-tips', isActive: true },
  });

  try {
    await prisma.blogPost.create({
      data: {
        id: uuidv4(),
        title: 'Summer Fashion Trends 2024',
        slug: `summer-fashion-trends-2024-${Date.now()}`,
        content: 'Discover the latest summer fashion trends...',
        excerpt: 'Top 10 fashion trends for this summer',
        authorId: opsAdmin.id,
        categoryId: blogCategory.id,
        status: 'PUBLISHED',
        isFeatured: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('✅ Created 1 blog post\n');
  } catch (e) {
    console.log('✅ Blog post may already exist\n');
  }
  console.log('✅ Created 1 blog post\n');

  // ==================== CMS PAGES ====================
  console.log('📄 Creating CMS pages...');
  await prisma.cMSPage.upsert({
    where: { id: 'page-about' },
    update: {},
    create: {
      id: 'page-about',
      slug: 'about-us',
      title: 'About Us',
      content: '<h1>About Risbow</h1><p>Your trusted e-commerce platform...</p>',
      isActive: true,
      createdBy: admin.id,
    },
  });
  await prisma.cMSPage.upsert({
    where: { id: 'page-contact' },
    update: {},
    create: {
      id: 'page-contact',
      slug: 'contact-us',
      title: 'Contact Us',
      content: '<h1>Contact Risbow</h1><p>Get in touch with us...</p>',
      isActive: true,
      createdBy: admin.id,
    },
  });
  console.log('✅ Created 2 CMS pages\n');

  // ==================== FINAL SUMMARY ====================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 EXTENDED DATABASE SEEDING COMPLETED!');
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
    prisma.supportTicket.count(),
    prisma.employee.count(),
    prisma.warehouse.count(),
    prisma.giftSKU.count(),
    prisma.blogPost.count(),
    prisma.cMSPage.count(),
  ]);

  console.log('📊 FINAL COUNTS:');
  console.log(`   👤 Users: ${counts[0]} (5 Admin/Staff + ${counts[0] - 5} Customers)`);
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
  console.log(`   🎫 Support Tickets: ${counts[11]}`);
  console.log(`   👔 Employees: ${counts[12]}`);
  console.log(`   🏭 Warehouses: ${counts[13]}`);
  console.log(`   🎁 Gift SKUs: ${counts[14]}`);
  console.log(`   📝 Blog Posts: ${counts[15]}`);
  console.log(`   📄 CMS Pages: ${counts[16]}`);

  console.log('\n🔑 LOGIN CREDENTIALS:');
  console.log('   Admin: admin@risbow.com / risbow123');
  console.log('   Customer: rajesh@example.com / password123');
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


main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
