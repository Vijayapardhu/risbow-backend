import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const keys = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));
console.log('Prisma Keys:', keys);
process.exit(0);
