const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const totalCount = await prisma.product.count()
    console.log('Total Product count:', totalCount)

    const activeCount = await prisma.product.count({ where: { deletedAt: null } })
    console.log('Non-deleted Product count:', activeCount)

    const visibilityCounts = await prisma.product.groupBy({
        by: ['visibility'],
        _count: true
    })
    console.log('Visibility counts:', visibilityCounts)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
