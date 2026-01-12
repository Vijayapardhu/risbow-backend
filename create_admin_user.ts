import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
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
    
    console.log('✅ Admin user created/updated:', adminUser.email);
    console.log('✅ Role:', adminUser.role);
    console.log('✅ Status:', adminUser.status);
}

main()
    .catch(e => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
