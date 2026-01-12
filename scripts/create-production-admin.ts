import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Use DIRECT_URL for migrations and scripts
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DIRECT_URL || process.env.DATABASE_URL
        }
    }
});

async function main() {
    console.log('🔧 Creating production admin user...');
    
    const hashedPassword = await bcrypt.hash('risbow123', 10);
    
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin.risbow@gmail.com' },
        update: {
            password: hashedPassword,
            role: 'ADMIN',
            status: 'ACTIVE',
        },
        create: {
            email: 'admin.risbow@gmail.com',
            mobile: '8888888881',
            name: 'Admin Risbow',
            password: hashedPassword,
            role: 'ADMIN',
            status: 'ACTIVE',
            coinsBalance: 5000,
        }
    });
    
    console.log('✅ Production admin user created/updated!');
    console.log('   Email:', adminUser.email);
    console.log('   Role:', adminUser.role);
    console.log('   Status:', adminUser.status);
    console.log('\n📝 Login credentials:');
    console.log('   Email: admin.risbow@gmail.com');
    console.log('   Password: risbow123');
}

main()
    .catch(e => {
        console.error('❌ Error:', e.message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
