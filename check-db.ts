import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkDb() {
    const orders = await prisma.order.count()
    const users = await prisma.user.count()
    const products = await prisma.product.count()
    const vendors = await prisma.vendor.count()

    console.log({
        orders,
        users,
        products,
        vendors
    })

    const recentOrders = await prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
    })
    console.log('Recent Orders:', recentOrders)
}

checkDb()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
