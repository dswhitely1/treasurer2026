# Rollback Scripts

This directory contains SQL scripts to rollback the vendor management and category hierarchy migrations.

## ⚠️ Important Warning

**ALWAYS backup your database before running any rollback scripts!**

```bash
# PostgreSQL backup
pg_dump -h localhost -U treasurer -d treasurer_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Rollback Order

Rollback migrations in **reverse order** to avoid foreign key constraint violations:

### 1. Rollback Transaction Vendor Association (SAFE)
```bash
cd /home/don/dev/treasurer2026/treasurer-api
npx prisma db execute --file prisma/migrations/rollback_scripts/rollback_20260118000003_add_vendor_to_transactions.sql
```

**Impact**:
- Removes vendor_id from transactions
- Renames memo back to description
- **No data loss** - all transaction data preserved

### 2. Rollback Category Hierarchy (CAUTION)
```bash
npx prisma db execute --file prisma/migrations/rollback_scripts/rollback_20260118000002_add_category_hierarchy.sql
```

**Impact**:
- Removes parent-child relationships
- Removes depth, path, and is_active columns
- **Data loss**: All category hierarchy structure is lost
- Categories revert to flat list

**Prerequisites**:
- Verify no critical dependencies on category hierarchy
- Document existing category relationships if needed

### 3. Rollback Vendors Table (DESTRUCTIVE)
```bash
npx prisma db execute --file prisma/migrations/rollback_scripts/rollback_20260118000001_add_vendors.sql
```

**Impact**:
- **DELETES ALL VENDOR DATA**
- Removes vendors table
- Optionally removes pg_trgm extension

**Prerequisites**:
- Ensure rollback #1 was completed (no transaction references to vendors)
- Export vendor data if needed for future reference

## Pre-Rollback Checklist

- [ ] Database backup completed
- [ ] Verified rollback order (3 → 2 → 1)
- [ ] Exported critical data (vendors, category hierarchy)
- [ ] Notified team of downtime (if applicable)
- [ ] Tested rollback on staging/dev environment
- [ ] Updated application code to handle schema changes

## Verification After Rollback

### After Rollback #3
```sql
-- Verify transactions have description column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'transactions' AND column_name = 'description';

-- Verify no vendor_id column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'transactions' AND column_name = 'vendor_id';
-- Should return 0 rows
```

### After Rollback #2
```sql
-- Verify categories have no hierarchy columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'categories'
AND column_name IN ('parent_id', 'depth', 'path', 'is_active');
-- Should return 0 rows
```

### After Rollback #1
```sql
-- Verify vendors table is gone
SELECT tablename FROM pg_tables WHERE tablename = 'vendors';
-- Should return 0 rows

-- Verify pg_trgm extension still exists (if needed)
SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';
```

## Alternative: Manual Rollback via Prisma

Instead of using these SQL scripts, you can also:

1. **Update Prisma schema** - revert changes in `schema.prisma`
2. **Generate migration** - run `npx prisma migrate dev --name rollback_vendors_and_hierarchy`
3. **Review migration** - check generated SQL before applying
4. **Apply migration** - run `npx prisma migrate deploy`

## Recovery

If you need to re-apply migrations after rollback:

```bash
cd /home/don/dev/treasurer2026/treasurer-api

# Re-apply all migrations
npx prisma migrate deploy

# Or re-apply specific migration
npx prisma migrate resolve --applied 20260118000001_add_vendors
npx prisma migrate resolve --applied 20260118000002_add_category_hierarchy
npx prisma migrate resolve --applied 20260118000003_add_vendor_to_transactions
```

## Support

If issues occur during rollback:

1. **Check migration status**: `npx prisma migrate status`
2. **Review database logs**: Check PostgreSQL error logs
3. **Verify foreign keys**: Ensure no orphaned references exist
4. **Restore from backup**: If rollback fails, restore database from backup

## Notes

- These scripts use `IF EXISTS` to prevent errors if already rolled back
- Scripts are idempotent - can be run multiple times safely
- Always test on non-production environment first
- Document reason for rollback in change log
