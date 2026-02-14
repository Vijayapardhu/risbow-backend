import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking products in database...\n');

  // Check total products
  const totalProducts = await prisma.product.count();
  console.log(`📊 Total products: ${totalProducts}`);

  // Check active products
  const activeProducts = await prisma.product.count({
    where: { isActive: true }
  });
  console.log(`✅ Active products: ${activeProducts}`);

  // Check published products
  const publishedProducts = await prisma.product.count({
    where: { visibility: 'PUBLISHED' }
  });
  console.log(`📢 Published products: ${publishedProducts}`);

  // Check products with verified vendors
  const productsWithVerifiedVendors = await prisma.product.count({
    where: {
      isActive: true,
      visibility: 'PUBLISHED',
      Vendor: {
        isActive: true,
        kycStatus: 'VERIFIED'
      }
    }
  });
  console.log(`🎯 Products ready for catalog: ${productsWithVerifiedVendors}\n`);

  // Show sample products
  console.log('📦 Sample products that should appear:\n');
  const sample = await prisma.product.findMany({
    where: {
      isActive: true,
      visibility: 'PUBLISHED',
    },
    take: 5,
    include: {
      Vendor: {
        select: { id: true, name: true, isActive: true, kycStatus: true }
      },
      Category: {
        select: { id: true, name: true }
      }
    }
  });

  for (const p of sample) {
    console.log(`  - ${p.title}`);
    console.log(`    ID: ${p.id}`);
    console.log(`    Active: ${p.isActive}, Visibility: ${p.visibility}`);
    console.log(`    Vendor: ${p.Vendor?.name} (Active: ${p.Vendor?.isActive}, KYC: ${p.Vendor?.kycStatus})`);
    console.log(`    Category: ${p.Category?.name}\n`);
  }

  // Check if vendor KYC status is correct
  console.log('🏪 Vendor KYC Status:\n');
  const vendors = await prisma.vendor.findMany({
    select: { id: true, name: true, isActive: true, kycStatus: true }
  });
  
  for (const v of vendors) {
    const check = v.isActive && v.kycStatus === 'VERIFIED' ? '✅' : '❌';
    console.log(`  ${check} ${v.name}: Active=${v.isActive}, KYC=${v.kycStatus}`);
  }

  console.log('\n✨ Check complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
