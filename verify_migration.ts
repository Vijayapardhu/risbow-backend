import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMigration() {
  try {
    console.log('=== Verifying Migration ===\n');

    // Query 1: Check that enums exist and have correct values
    console.log('1. Checking enum types...\n');
    const enumsResult = await prisma.$queryRaw`
      SELECT typname, string_agg(enumlabel, ', ' ORDER BY enumsortorder) as values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE typname IN ('KycStatus', 'VendorDocumentType', 'DocumentStatus')
      GROUP BY typname;
    `;
    
    console.log('Enum Types:');
    console.table(enumsResult);

    // Query 2: Check that columns use the enum types
    console.log('\n2. Checking columns use enum types...\n');
    const columnsResult = await prisma.$queryRaw`
      SELECT 
        table_name,
        column_name,
        udt_name as data_type
      FROM information_schema.columns
      WHERE table_name IN ('Vendor', 'VendorDocument')
        AND column_name IN ('kycStatus', 'documentType', 'status')
      ORDER BY table_name, column_name;
    `;
    
    console.log('Columns with Enum Types:');
    console.table(columnsResult);

    console.log('\n✅ Migration verification complete!');
  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration();
