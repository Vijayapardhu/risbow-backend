import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.adminUser.count();
    console.log(`AdminUser count: ${count}`);
    if (count > 0) {
        const admin = await prisma.adminUser.findFirst();
        console.log(`First admin email: ${admin?.email}`);
        console.log(`First admin isActive: ${admin?.isActive}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
