import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAdminProducts() {
  console.log('Testing admin products query...\n');

  try {
    // Test 1: Count total products
    const total = await prisma.product.count();
    console.log(`✅ Total products: ${total}`);

    // Test 2: Get products with relations (like admin service does)
    const products = await prisma.product.findMany({
      take: 5,
      include: {
        Category: {
          select: { id: true, name: true }
        },
        Vendor: true,
        Review: {
          select: { rating: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ Products with relations: ${products.length}`);

    if (products.length > 0) {
      console.log('\n📦 Sample product:');
      const p = products[0];
      console.log(`  - Title: ${p.title}`);
      console.log(`  - Category: ${p.Category?.name || 'N/A'}`);
      console.log(`  - Vendor: ${p.Vendor?.name || 'N/A'}`);
      console.log(`  - Reviews: ${p.Review?.length || 0}`);
    }

    console.log('\n✅ Admin query works correctly!');
    console.log('   Issue is likely frontend authentication or network.');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('   This is the real error preventing products from loading!');
  }
}

testAdminProducts()
  .finally(() => prisma.$disconnect());
