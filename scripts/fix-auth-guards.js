#!/usr/bin/env node
/**
 * Bulk fix authentication guards migration script
 * Converts @UseGuards(JwtAuthGuard, RolesGuard) + @Roles(UserRole.ADMIN...)
 * to @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard) + @AdminRoles(AdminRole...)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Controllers to fix
const controllersToFix = [
  'src/banners/banners.controller.ts',
  'src/vendor-payouts/vendor-payouts.controller.ts',
  'src/search/search.controller.ts',
  'src/invoices/invoices.controller.ts',
  'src/catalog/catalog.controller.ts',
  'src/cart/buy-later.controller.ts',
  'src/moderation/content-moderation.controller.ts',
  'src/returns/returns-qc.controller.ts',
  'src/vendors/vendor-bow-coin-ledger.controller.ts',
  'src/vendors/vendor-discipline.controller.ts',
  'src/vendor-documents/vendor-documents.controller.ts',
];

const importAdditions = `
import { AdminJwtAuthGuard } from '../admin/auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin/auth/guards/admin-roles.guard';
import { AdminPermissionsGuard } from '../admin/auth/guards/admin-permissions.guard';
import { AdminRoles } from '../admin/auth/decorators/admin-roles.decorator';
import { AdminRole } from '@prisma/client';`;

const fixes = [];
const errors = [];

controllersToFix.forEach(controllerPath => {
  const fullPath = path.join(process.cwd(), controllerPath);
  
  if (!fs.existsSync(fullPath)) {
    errors.push(`File not found: ${controllerPath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Check if already has admin imports
  if (!content.includes('AdminJwtAuthGuard')) {
    // Add imports after UserRole import
    content = content.replace(
      /import { UserRole } from '@prisma\/client';/,
      `import { UserRole } from '@prisma/client';${importAdditions}`
    );
    modified = true;
  }
  
  // Replace guards for admin endpoints only (keep vendor/user endpoints)
  // Pattern: admin/* endpoints with @Roles(UserRole.ADMIN...)
  const lines = content.split('\n');
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is an admin endpoint
    const isAdminEndpoint = line.includes("@Get('admin/") || 
                           line.includes("@Post('admin/") ||
                           line.includes("@Patch('admin/") ||
                           line.includes("@Delete('admin/");
    
    // Check for the old guard pattern
    if (line.includes('@UseGuards(JwtAuthGuard, RolesGuard)') && isAdminEndpoint) {
      // Look ahead for @Roles decorator
      let rolesLineIndex = -1;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].includes('@Roles(UserRole.ADMIN') || lines[j].includes('@Roles(UserRole.SUPER_ADMIN')) {
          rolesLineIndex = j;
          break;
        }
      }
      
      if (rolesLineIndex !== -1) {
        // Replace with admin guards
        newLines.push('    @UseGuards(AdminJwtAuthGuard, AdminRolesGuard, AdminPermissionsGuard)');
        newLines.push('    @AdminRoles(AdminRole.OPERATIONS_ADMIN, AdminRole.SUPER_ADMIN)');
        i = rolesLineIndex; // Skip the old @Roles line
        modified = true;
        continue;
      }
    }
    
    newLines.push(line);
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, newLines.join('\n'));
    fixes.push(controllerPath);
    console.log(`✅ Fixed: ${controllerPath}`);
  } else {
    console.log(`⏭️  Skipped: ${controllerPath} (no changes needed)`);
  }
});

console.log('\n=== Migration Summary ===');
console.log(`✅ Fixed: ${fixes.length} files`);
console.log(`⏭️  Skipped: ${controllersToFix.length - fixes.length - errors.length} files`);
console.log(`❌ Errors: ${errors.length} files`);

if (errors.length > 0) {
  console.log('\nErrors:');
  errors.forEach(e => console.log(`  - ${e}`));
}

if (fixes.length > 0) {
  console.log('\nFixed files:');
  fixes.forEach(f => console.log(`  - ${f}`));
}
