
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.count()
    const orders = await prisma.order.count()
    const products = await prisma.product.count()
    const vendors = await prisma.vendor.count()
    const categories = await prisma.category.count()

    console.log({ users, orders, products, vendors, categories })
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
