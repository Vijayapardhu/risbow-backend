import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Creating AdminUser for login...\n');

    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    // Create admin user with only the fields that exist in the database
    const admin = await prisma.$executeRawUnsafe(`
    INSERT INTO "AdminUser" (id, email, password, name, role, "isActive", "isMfaEnabled", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid(),
      'admin@risbow.com',
      '${hashedPassword}',
      'Super Admin',
      'SUPER_ADMIN',
      true,
      false,
      NOW(),
      NOW()
    )
    ON CONFLICT (email) DO NOTHING
  `);

    console.log('✅ AdminUser created successfully!\n');
    console.log('📧 Email: admin@risbow.com');
    console.log('🔑 Password: Admin@123');
    console.log('👤 Role: SUPER_ADMIN\n');
}

main()
    .catch((e) => {
        console.error('❌ Error creating admin user:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
