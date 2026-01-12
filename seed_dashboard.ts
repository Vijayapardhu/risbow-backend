
import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting dashboard seed...');

    // 1. Ensure we have some users and vendors
    const userCount = await prisma.user.count();
    const vendorCount = await prisma.vendor.count();
    const productCount = await prisma.product.count();

    if (vendorCount === 0) {
        console.log('Seeding vendors...');
        await prisma.vendor.createMany({
            data: [
                { name: 'Tech Store', mobile: '9999999991', kycStatus: 'VERIFIED', tier: 'PREMIUM' },
                { name: 'Fashion Hub', mobile: '9999999992', kycStatus: 'VERIFIED', tier: 'PRO' },
                { name: 'Home Decor', mobile: '9999999993', kycStatus: 'VERIFIED', tier: 'BASIC' },
            ],
            skipDuplicates: true,
        });
    }

    const vendors = await prisma.vendor.findMany();

    let defaultCategory = await prisma.category.findFirst();
    if (!defaultCategory) {
        console.log('Seeding category...');
        defaultCategory = await prisma.category.create({
            data: { name: 'General' }
        });
    }

    if (productCount === 0) {
        console.log('Seeding products...');
        for (const vendor of vendors) {
            await prisma.product.create({
                data: {
                    vendorId: vendor.id,
                    title: `Sample Product - ${vendor.name}`,
                    price: Math.floor(Math.random() * 5000) + 500,
                    categoryId: defaultCategory.id,
                    stock: 100,
                    isActive: true
                }
            });
        }
    }

    const products = await prisma.product.findMany();

    if (userCount < 5) {
        console.log('Seeding users...');
        await prisma.user.createMany({
            data: [
                { mobile: '8888888881', name: 'Alice Doe' },
                { mobile: '8888888882', name: 'Bob Smith' },
                { mobile: '8888888883', name: 'Charlie Brown' },
                { mobile: '8888888884', name: 'Diana Prince' },
                { mobile: '8888888885', name: 'Evan Wright' },
            ],
            skipDuplicates: true,
        });
    }

    const users = await prisma.user.findMany({ take: 10 });

    // 2. Create Orders
    console.log('Seeding orders...');
    const statuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    const paymentStatuses: PaymentStatus[] = ['SUCCESS', 'PENDING', 'FAILED'];

    for (let i = 0; i < 50; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const product = products[Math.floor(Math.random() * products.length)];

        // Random date in last 30 days
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const amount = product.price * (Math.floor(Math.random() * 3) + 1);

        const order = await prisma.order.create({
            data: {
                userId: user.id,
                status: status,
                totalAmount: amount,
                items: [
                    {
                        productId: product.id,
                        title: product.title,
                        price: product.price,
                        quantity: 1,
                        image: "https://via.placeholder.com/150"
                    }
                ],
                createdAt: date,
                updatedAt: date,
                payment: {
                    create: {
                        amount: amount,
                        status: status === 'CANCELLED' ? 'REFUNDED' : 'SUCCESS',
                        provider: 'RAZORPAY',
                        providerOrderId: `order_${Math.random().toString(36).substring(7)}`,
                    }
                }
            }
        });

        // process.stdout.write('.');
    }

    console.log('\nSeeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
