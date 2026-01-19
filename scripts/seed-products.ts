import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const products = [
    {
      id: 'prod-tshirt-1',
      title: 'Classic Cotton T-Shirt',
      description: 'Premium quality cotton t-shirt, perfect for everyday wear.',
      price: 599,
      offerPrice: null,
      stock: 100,
      categoryId: 'cat-mens-wear',
      vendorId: 'cmkayiyy3000ingqf2tlgn3dw',
      images: ['https://picsum.photos/seed/tshirt1/400', 'https://picsum.photos/seed/tshirt2/400'],
      isActive: true,
      sku: 'TSHIRT-CLASSIC-1',
    },
    {
      id: 'prod-jeans-1',
      title: 'Slim Fit Denim Jeans',
      description: 'Stylish slim fit jeans with stretch fabric.',
      price: 1299,
      offerPrice: null,
      stock: 50,
      categoryId: 'cat-mens-wear',
      vendorId: 'cmkayiyy3000ingqf2tlgn3dw',
      images: ['https://picsum.photos/seed/jeans1/400'],
      isActive: true,
      sku: 'JEANS-SLIM-1',
    },
    {
      id: 'prod-watch-1',
      title: 'Smart Watch Pro',
      description: 'Feature-packed smartwatch with health tracking.',
      price: 4999,
      offerPrice: null,
      stock: 15,
      categoryId: 'cat-electronics',
      vendorId: 'cmkayizsd000jngqfouc0ljd6',
      images: ['https://picsum.photos/seed/watch/400'],
      isActive: true,
      sku: 'WATCH-PRO-1',
    },
    {
      id: 'prod-headphones-1',
      title: 'Wireless Bluetooth Headphones',
      description: 'High-quality sound with noise cancellation.',
      price: 2999,
      offerPrice: null,
      stock: 25,
      categoryId: 'cat-electronics',
      vendorId: 'cmkayizsd000jngqfouc0ljd6',
      images: ['https://picsum.photos/seed/headphones/400'],
      isActive: true,
      sku: 'HEADPHONES-WL-1',
    },
    {
      id: 'prod-sneakers-1',
      title: 'Running Sneakers',
      description: 'Comfortable running shoes with cushioned sole.',
      price: 1999,
      offerPrice: null,
      stock: 40,
      categoryId: 'cat-footwear',
      vendorId: 'cmkayiyy3000ingqf2tlgn3dw',
      images: ['https://picsum.photos/seed/sneakers/400'],
      isActive: true,
      sku: 'SNEAKERS-RUN-1',
    },
    {
      id: 'prod-bag-1',
      title: 'Leather Backpack',
      description: 'Genuine leather backpack with laptop compartment.',
      price: 2499,
      offerPrice: null,
      stock: 20,
      categoryId: 'cat-accessories',
      vendorId: 'cmkayiyy3000ingqf2tlgn3dw',
      images: ['https://picsum.photos/seed/backpack/400'],
      isActive: true,
      sku: 'BAG-LEATHER-1',
    },
    {
      id: 'prod-dress-1',
      title: 'Floral Summer Dress',
      description: 'Beautiful floral print dress for summer.',
      price: 1499,
      offerPrice: null,
      stock: 30,
      categoryId: 'cat-womens-wear',
      vendorId: 'cmkayiyy3000ingqf2tlgn3dw',
      images: ['https://picsum.photos/seed/dress1/400'],
      isActive: true,
      sku: 'DRESS-SUMMER-1',
    },
    {
      id: 'prod-lowstock-1',
      title: 'Limited Edition Jacket',
      description: 'Exclusive limited edition jacket.',
      price: 3999,
      offerPrice: null,
      stock: 3,
      categoryId: 'cat-mens-wear',
      vendorId: 'cmkayiyy3000ingqf2tlgn3dw',
      images: ['https://picsum.photos/seed/jacket/400'],
      isActive: true,
      sku: 'JACKET-LTD-1',
    },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    })
  }

  console.log(`Upserted ${products.length} products`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
