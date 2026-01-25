# Migration Fix: OrderFinancialSnapshot

## Problem

The migration `manual_financial_snapshot_immutability` was trying to add a COMMENT to the `OrderFinancialSnapshot` table, but the table doesn't exist in the database yet. This caused error:

```
ERROR: relation "OrderFinancialSnapshot" does not exist
```

## Solution Applied

The migration file has been updated to check if the table exists before attempting to add the comment:

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'OrderFinancialSnapshot'
  ) THEN
    COMMENT ON TABLE "OrderFinancialSnapshot" IS '...';
  END IF;
END $$;
```

## Resolution Steps

### Option 1: Mark Migration as Applied (Recommended if table doesn't exist yet)

If the `OrderFinancialSnapshot` table doesn't exist yet and will be created by a future Prisma migration:

```bash
npx prisma migrate resolve --applied manual_financial_snapshot_immutability
```

This marks the migration as applied without running it, allowing future migrations to proceed.

### Option 2: Create the Table First, Then Run Migration

If you need the table to exist now:

1. **Create the table via Prisma:**
   ```bash
   npx prisma migrate dev --name create_order_financial_snapshot
   ```

   This will generate a migration that creates the `OrderFinancialSnapshot` table based on your schema.

2. **Then apply the comment migration:**
   ```bash
   npx prisma migrate deploy
   ```

### Option 3: Use the Fixed Migration (Already Done)

The migration file has been updated to be conditional. If you have database access:

```bash
npx prisma migrate deploy
```

The migration will now skip adding the comment if the table doesn't exist, and will add it when the table is created later.

## Verification

After resolving, verify the migration status:

```bash
npx prisma migrate status
```

You should see:
- `manual_financial_snapshot_immutability` marked as applied
- No pending migrations (or only new ones you want to apply)

## Database Connection Note

If you're getting connection errors, ensure:

1. **Environment variables are set:**
   ```bash
   # Check your .env file has:
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

2. **For Azure PostgreSQL with private endpoint:**
   - Ensure you're connected via VPN or have network access
   - Check firewall rules allow your IP
   - Verify connection string format

3. **For local development:**
   - Ensure PostgreSQL is running
   - Check connection string points to localhost

## Next Steps

1. **If table doesn't exist yet:**
   - Mark migration as applied: `npx prisma migrate resolve --applied manual_financial_snapshot_immutability`
   - Continue with normal development
   - Table will be created when you run `prisma migrate dev` for schema changes

2. **If table should exist:**
   - Check why it wasn't created
   - Review previous migrations
   - Create it manually or via Prisma migrate

3. **For production:**
   - Always test migrations in staging first
   - Use `prisma migrate deploy` for production (not `prisma migrate dev`)
   - Have a rollback plan

## Related Files

- Migration file: `prisma/migrations/manual_financial_snapshot_immutability/migration.sql`
- Schema definition: `prisma/schema.prisma` (line ~1070)
- Service using it: `src/common/financial-snapshot-guard.service.ts`
