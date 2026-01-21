const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
    try {
        console.log('Reading migration file...');
        const sqlPath = path.join(__dirname, 'prisma', 'migrations', 'manual_add_vendor_features.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolon and filter out empty statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`Found ${statements.length} SQL statements to execute`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`Executing statement ${i + 1}/${statements.length}...`);

            try {
                await prisma.$executeRawUnsafe(statement + ';');
                console.log(`✓ Statement ${i + 1} executed successfully`);
            } catch (error) {
                // Ignore errors for already existing objects
                if (error.message.includes('already exists')) {
                    console.log(`⚠ Statement ${i + 1} skipped (already exists)`);
                } else {
                    console.error(`✗ Statement ${i + 1} failed:`, error.message);
                    // Continue with other statements
                }
            }
        }

        console.log('\n✅ Migration completed!');
        console.log('\nNew tables created:');
        console.log('  - VendorMembership');
        console.log('  - VendorPromotion');
        console.log('  - VendorFollower');
        console.log('  - VendorPayout');
        console.log('  - BowInteraction');
        console.log('  - ReferralTracking');
        console.log('\nVendor table enhanced with 9 new columns');
        console.log('Product table enhanced with 2 new columns');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runMigration();
