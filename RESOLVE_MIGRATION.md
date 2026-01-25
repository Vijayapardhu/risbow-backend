# Resolve Failed Migration: manual_financial_snapshot_immutability

## Current Situation

The migration `manual_financial_snapshot_immutability` failed because it tried to add a COMMENT to a table that doesn't exist yet. Prisma has marked it as "failed" in the database, blocking all future migrations.

## Resolution Steps

### Step 1: Mark the Failed Migration as Rolled Back

First, we need to tell Prisma that the failed migration has been rolled back:

```bash
npx prisma migrate resolve --rolled-back manual_financial_snapshot_immutability
```

This tells Prisma that the failed migration has been rolled back and it's safe to proceed.

### Step 2: Mark as Applied (Since Table Doesn't Exist Yet)

Since the `OrderFinancialSnapshot` table doesn't exist yet (and will be created by a future Prisma migration), we can mark this migration as applied without actually running it:

```bash
npx prisma migrate resolve --applied manual_financial_snapshot_immutability
```

**OR** if you want to actually run the fixed migration (which now checks if table exists):

### Step 2 Alternative: Re-run the Fixed Migration

The migration file has been fixed to check if the table exists before adding the comment. You can re-apply it:

```bash
# First mark as rolled back
npx prisma migrate resolve --rolled-back manual_financial_snapshot_immutability

# Then deploy (the fixed migration will skip if table doesn't exist)
npx prisma migrate deploy
```

## Recommended Approach

Since the table doesn't exist yet, the cleanest approach is:

```bash
# 1. Mark failed migration as rolled back
npx prisma migrate resolve --rolled-back manual_financial_snapshot_immutability

# 2. Mark it as applied (since it's just documentation and table doesn't exist)
npx prisma migrate resolve --applied manual_financial_snapshot_immutability

# 3. Continue with other migrations
npx prisma migrate deploy
```

## Why This Works

- The migration is just adding a COMMENT to document the immutability constraint
- The table doesn't exist yet, so the comment can't be added
- When Prisma creates the table in a future migration, the comment can be added manually if needed
- The application-level protection (FinancialSnapshotGuardService) is what actually enforces the constraint

## Verification

After resolving, verify:

```bash
npx prisma migrate status
```

You should see:
- `manual_financial_snapshot_immutability` marked as applied
- Other pending migrations ready to apply

## If You Need the Comment Later

When the `OrderFinancialSnapshot` table is created, you can manually add the comment:

```sql
COMMENT ON TABLE "OrderFinancialSnapshot" IS 'IMMUTABLE after order confirmation. Financial snapshot captures state at checkout and must never be modified once order status moves beyond PENDING. Protected by FinancialSnapshotGuardService.';
```

Or create a new migration that adds it conditionally (like the fixed version).
