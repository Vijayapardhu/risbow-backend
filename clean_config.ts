
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Cleaning PlatformConfig & BannerCampaign...');
        // Using raw SQL to bypass mismatched client definitions
        await prisma.$executeRawUnsafe('DELETE FROM "PlatformConfig";');
        await prisma.$executeRawUnsafe('DELETE FROM "BannerCampaign";');
        console.log('Tables cleaned.');
    } catch (e) {
        console.error('Error cleaning tables:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
