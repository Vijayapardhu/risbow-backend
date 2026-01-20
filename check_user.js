
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const userId = 'cmk0usyug00004a9qf96gy1yt';
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    console.log('User found:', user ? 'YES' : 'NO');
    if (user) {
        console.log('Role:', user.role);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
