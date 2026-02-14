import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing product cache...\n');

  try {
    // Connect to Redis
    const redis = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    await redis.connect();
    console.log('✅ Connected to Redis');

    // Find and delete all product-related cache keys
    const productKeys = await redis.keys('products:*');
    const nearbyKeys = await redis.keys('nearby:products:*');
    const detailKeys = await redis.keys('product:detail:*');

    const allKeys = [...productKeys, ...nearbyKeys, ...detailKeys];
    
    console.log(`Found ${allKeys.length} cached product keys`);

    if (allKeys.length > 0) {
      for (const key of allKeys) {
        await redis.del(key);
        console.log(`  🗑️  Deleted: ${key}`);
      }
    }

    await redis.quit();
    console.log('\n✅ Product cache cleared!');
    console.log('   Products should now load on the frontend.\n');

  } catch (error) {
    console.log('⚠️  Could not connect to Redis or clear cache:');
    console.log('   Make sure Redis is running and REDIS_URL is configured.\n');
    console.log('   You can also restart your backend server to clear the cache.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
