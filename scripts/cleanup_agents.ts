import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log('Cleaning up invalid agent references...');
    try {
        // Deleting followups first because they are child records and likely required agentId in old schema
        await prisma.checkoutFollowup.deleteMany({});
        console.log('Deleted all checkout followups.');

        // Setting agentId to null in checkouts
        await prisma.abandonedCheckout.updateMany({
            data: { agentId: null }
        });
        console.log('Reset agentId to null in abandoned checkouts.');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
