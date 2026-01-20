import { PrismaClient } from '@prisma/client';
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Creating admin user and basic mock data...\n');

    // ==================== ADMIN USER ====================
    console.log('👤 Creating admin user...');

    const hashedPassword = await bcrypt.hash('risbow123', 10);

    const admin = await prisma.user.upsert({
        where: { mobile: '9999999999' },
        update: {},
        create: {
            mobile: '9999999999',
            email: 'admin.risbow@gmail.com',
            password: hashedPassword,
            name: 'Risbow Admin',
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
        },
    });
    console.log('✅ Admin user created');
    console.log('   Email: admin.risbow@gmail.com');
    console.log('   Password: risbow123');
    console.log('   Mobile: 9999999999\n');

    // ==================== SAMPLE CUSTOMERS ====================
    console.log('👥 Creating sample customers...');

    await prisma.user.upsert({
        where: { mobile: '9123456780' },
        update: {},
        create: {
            mobile: '9123456780',
            email: 'customer1@example.com',
            password: await bcrypt.hash('password123', 10),
            name: 'Rajesh Kumar',
            role: 'CUSTOMER',
            status: 'ACTIVE',
        },
    });

    await prisma.user.upsert({
        where: { mobile: '9123456781' },
        update: {},
        create: {
            mobile: '9123456781',
            email: 'customer2@example.com',
            password: await bcrypt.hash('password123', 10),
            name: 'Priya Sharma',
            role: 'CUSTOMER',
            status: 'ACTIVE',
        },
    });

    console.log('✅ Created 2 sample customers\n');

    // ==================== SUMMARY ====================
    const totalUsers = await prisma.user.count();
    const totalCategories = await prisma.category.count();
    const totalVendors = await prisma.vendor.count();

    console.log('\n🎉 Mock database seeding completed!\n');
    console.log('📊 Summary:');
    console.log(`   ✅ Admin: admin.risbow@gmail.com / risbow123`);
    console.log(`   ✅ Total Users: ${totalUsers}`);
    console.log(`   ✅ Total Categories: ${totalCategories}`);
    console.log(`   ✅ Total Vendors: ${totalVendors}`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Login with admin credentials');
    console.log('   2. Add products through the admin panel');
    console.log('   3. Test all features\n');
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
