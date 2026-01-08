"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Cleaning up invalid agent references...');
    try {
        await prisma.checkoutFollowup.deleteMany({});
        console.log('Deleted all checkout followups.');
        await prisma.abandonedCheckout.updateMany({
            data: { agentId: null }
        });
        console.log('Reset agentId to null in abandoned checkouts.');
    }
    catch (e) {
        console.error(e);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=cleanup_agents.js.map