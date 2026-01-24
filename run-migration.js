const { execSync } = require('child_process');

/**
 * NOTE (2026-01-24):
 * This repo previously shipped ad-hoc SQL runners for loose `manual_*.sql` files.
 * We now convert those into proper Prisma migration folders so production can run:
 *   npx prisma migrate deploy
 *
 * Keep this script as a convenience wrapper for VM deployments.
 */
function runMigration() {
  try {
    console.log('Running Prisma migrations (deploy mode)...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: __dirname,
      env: process.env,
    });
    console.log('\n✅ prisma migrate deploy completed');
  } catch (error) {
    console.error('\n❌ prisma migrate deploy failed');
    process.exit(1);
  }
}

runMigration();
