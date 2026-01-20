
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const userId = 'cmk0usyug00004a9qf96gy1yt';

    // 1. Check for conflict on mobile
    const conflictUser = await prisma.user.findUnique({
        where: { mobile: '9998765432' }
    });

    if (conflictUser && conflictUser.id !== userId) {
        console.log(`Deleting conflicting user ${conflictUser.id} with mobile 9999999999`);
        await prisma.user.delete({ where: { id: conflictUser.id } });
    }

    // 2. Create or Update user
    const user = await prisma.user.upsert({
        where: { id: userId },
        update: { role: 'ADMIN', status: 'ACTIVE', mobile: '9999999999' },
        create: {
            id: userId,
            name: 'Admin User',
            email: 'admin@rijsbow.com',
            mobile: '9999999999',
            role: 'ADMIN',
            status: 'ACTIVE',
            coinsBalance: 0,
            referralCode: 'ADMINREF'
        }
    });

    console.log('User created/updated:', user);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
