const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const count = await prisma.product.count()
    console.log('Product count:', count)

    if (count > 0) {
        const products = await prisma.product.findMany({ take: 5 })
        console.log('First 5 products:', products.map(p => p.title))
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
