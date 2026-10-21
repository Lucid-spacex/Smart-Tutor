# Migration Runbook

## Context

The Smart-Tutor project uses Prisma Migrate for database schema management. Since migrations were never committed to git (they're in .gitignore), there is no historical migration chain. The current migration `20261020120000_add_notification_and_grading_models` in `prisma/migrations/` is a consolidated baseline migration for fresh databases. A copy is stored in `prisma/baseline/` for reference.

## Baseline Migration for Fresh Databases

For any new database (test, staging, or a fresh production database):

```bash
# Apply the baseline migration
npx prisma migrate deploy
```

This will apply `20261020120000_add_notification_and_grading_models` which creates the complete schema from scratch.

## Production Migration (When Existing Data Exists)

**IMPORTANT: This section is for future use when migrating a production database that already has data. The current prodcopy branch was empty, so this was not needed.**

### Prerequisites

1. Create a Neon branch from production: `neon branches create production-copy --branch-from production`
2. Use the branch connection string in `.env.prodcopy`
3. Verify the branch has the same data as production

### Step 1: Inspect Current Schema

```bash
# Pull the current schema from the production copy
npx dotenv-cli -e .env.prodcopy -- npx prisma db pull
```

Review the generated schema to understand the current state.

### Step 2: Generate Delta Migration

```bash
# Generate the delta SQL from current schema to target schema
npx dotenv-cli -e .env.prodcopy -- npx prisma migrate diff \
  --from-schema-datasource prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > delta.sql
```

### Step 3: Review Delta SQL

Open `delta.sql` and review for:

- **Destructive operations**: `DROP TABLE`, `DROP COLUMN`, `ALTER COLUMN ... DROP NOT NULL`
- **Data loss**: Any operation that might lose existing data
- **NOT NULL columns without defaults**: Columns added as NOT NULL without a default value

If found, modify the migration to be safe:

1. Add columns as nullable first
2. Backfill data in a separate step
3. Then make them NOT NULL
4. Create enums before using them in columns

### Step 4: Apply Delta to Production Copy

```bash
# Create a manual migration from the reviewed delta.sql
mkdir -p prisma/migrations/$(date +%Y%m%d%H%M%S)_production_delta
cp delta.sql prisma/migrations/$(date +%Y%m%d%H%M%S)_production_delta/migration.sql

# Apply to production copy
npx dotenv-cli -e .env.prodcopy -- npx prisma migrate deploy
```

### Step 5: Verify Data Survival

Run verification queries to check critical data:

```sql
-- Row counts before and after
SELECT 'User' as table_name, COUNT(*) as count FROM "User"
UNION ALL
SELECT 'Student', COUNT(*) FROM "Student"
UNION ALL
SELECT 'Enrollment', COUNT(*) FROM "Enrollment"
UNION ALL
SELECT 'Session', COUNT(*) FROM "Session"
UNION ALL
SELECT 'Payment', COUNT(*) FROM "Payment"
UNION ALL
SELECT 'Grade', COUNT(*) FROM "Grade"
UNION ALL
SELECT 'Notification', COUNT(*) FROM "Notification";

-- Verify grades kept their status
SELECT status, COUNT(*) FROM "Grade" GROUP BY status;

-- Verify notifications were backfilled
SELECT "dedupeKey" IS NOT NULL as has_dedupe, COUNT(*) FROM "Notification" GROUP BY has_dedupe;
```

### Step 6: Apply to Production

Once verified on the copy:

1. **Backup**: Create another Neon branch as backup: `neon branches create production-backup --branch-from production`
2. **Apply**: Run the same migration steps on production
3. **Verify**: Run the same verification queries on production
4. **Monitor**: Watch for errors in logs for 24 hours

### Rollback Plan

If issues arise after production deployment:

1. Switch traffic to the backup branch
2. Investigate the issue
3. Fix the migration
4. Test on a fresh branch
5. Retry deployment

## Notes

- Never run `prisma migrate reset` on production (it deletes all data)
- Always test migrations on a copy first
- Keep the backup branch until you're confident the migration is stable
- Document any manual SQL changes made during migration
