
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
    console.log('Verifying database content...');

    const userCount = await prisma.user.count();
    const orderCount = await prisma.order.count();
    const productCount = await prisma.product.count();

    console.log(`Users: ${userCount}`);
    console.log(`Orders: ${orderCount}`);
    console.log(`Products: ${productCount}`);

    if (orderCount > 0) {
        const firstOrder = await prisma.order.findFirst();
        console.log('Sample Order:', firstOrder);
    }
}

verify()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
