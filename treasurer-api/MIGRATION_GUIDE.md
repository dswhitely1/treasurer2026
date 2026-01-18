# Database Migration Guide: Vendor Management & Category Hierarchy

This guide documents the database schema changes for vendor management and hierarchical categories in the Treasurer application.

## Overview

Three migrations were created to implement:
1. **Vendor Management** - Organization-scoped vendors with autocomplete support
2. **Category Hierarchy** - Multi-level category organization with parent-child relationships
3. **Transaction Enhancements** - Vendor linking and memo field (renamed from description)

## Migration Details

### Migration 1: Add Vendors (`20260118000001_add_vendors`)

**Purpose**: Create the Vendor model with fuzzy text search support

**Changes**:
- Enables `pg_trgm` PostgreSQL extension for trigram-based fuzzy text search
- Creates `vendors` table with organization scoping
- Adds trigram GIN index on vendor name for fast autocomplete queries
- Adds organization foreign key relationship

**Schema**:
```sql
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);
```

**Indexes**:
- `vendors_organization_id_idx` - Standard B-tree index for organization lookups
- `vendors_organization_id_name_key` - Unique constraint (organization + name)
- `vendors_name_trgm_idx` - GIN trigram index for fuzzy search

**Fuzzy Search Example**:
```sql
SELECT id, name, similarity(name, 'Walmart') as sim
FROM vendors
WHERE organization_id = ? AND name % 'Walmart'
ORDER BY similarity DESC
LIMIT 10;
```

### Migration 2: Add Category Hierarchy (`20260118000002_add_category_hierarchy`)

**Purpose**: Enable multi-level category organization

**Changes**:
- Adds `parent_id` column for parent category reference (self-referential FK)
- Adds `depth` column to track hierarchy level (0 = root, 1 = child, etc.)
- Adds `path` column to store materialized path for efficient subtree queries
- Adds `is_active` column for soft deletion/archiving
- Adds indexes for efficient hierarchy traversal

**New Columns**:
```sql
ALTER TABLE "categories" ADD COLUMN "parent_id" TEXT;          -- NULL for root categories
ALTER TABLE "categories" ADD COLUMN "depth" INTEGER DEFAULT 0;  -- Hierarchy level
ALTER TABLE "categories" ADD COLUMN "path" TEXT;               -- Materialized path
ALTER TABLE "categories" ADD COLUMN "is_active" BOOLEAN DEFAULT true;
```

**Indexes**:
- `categories_parent_id_idx` - For finding children of a category
- `categories_organization_id_parent_id_idx` - Composite for org-scoped queries
- `categories_path_idx` - For efficient subtree queries

**Data Preservation**:
- All existing categories automatically become root categories (parent_id = NULL)
- All existing categories have depth = 0 by default
- All existing categories are active (is_active = true)

**Hierarchy Query Examples**:
```sql
-- Get all root categories for an organization
SELECT * FROM categories
WHERE organization_id = ? AND parent_id IS NULL;

-- Get all children of a category
SELECT * FROM categories WHERE parent_id = ?;

-- Get entire subtree using materialized path
SELECT * FROM categories
WHERE path LIKE 'parent_id%' OR id = 'parent_id';
```

### Migration 3: Add Vendor to Transactions (`20260118000003_add_vendor_to_transactions`)

**Purpose**: Link transactions to vendors and rename description to memo

**Changes**:
- Renames `description` column to `memo` (preserves all existing data)
- Adds `vendor_id` column with foreign key to vendors table
- Adds index for vendor lookups
- Uses ON DELETE SET NULL to preserve transactions if vendor is deleted

**Schema Changes**:
```sql
ALTER TABLE "transactions" RENAME COLUMN "description" TO "memo";
ALTER TABLE "transactions" ADD COLUMN "vendor_id" TEXT;
```

**Indexes**:
- `transactions_vendor_id_idx` - For efficient vendor-based transaction queries

**Data Preservation**:
- All existing transaction descriptions are preserved as memos
- All existing transactions have vendor_id = NULL (no vendor assigned)
- No data loss occurs during migration

## Performance Optimizations

### Trigram Indexes for Autocomplete

The `pg_trgm` extension provides fuzzy text search capabilities:

```sql
-- Fast autocomplete query (uses trigram index)
SELECT id, name, similarity(name, $search) as score
FROM vendors
WHERE organization_id = $orgId
  AND name % $search  -- % operator uses trigram similarity
ORDER BY score DESC
LIMIT 10;
```

**Performance**: O(log n) lookup time even with thousands of vendors

### Category Hierarchy Queries

Multiple indexing strategies for different query patterns:

1. **Get Children** (uses `parent_id` index):
```sql
SELECT * FROM categories WHERE parent_id = ?;
```

2. **Get Root Categories** (uses `organization_id_parent_id` composite):
```sql
SELECT * FROM categories
WHERE organization_id = ? AND parent_id IS NULL;
```

3. **Get Subtree** (uses `path` index):
```sql
SELECT * FROM categories
WHERE organization_id = ? AND path LIKE 'root_id%';
```

### Transaction Vendor Lookups

The `vendor_id` index enables efficient queries:

```sql
-- Get all transactions for a vendor
SELECT * FROM transactions WHERE vendor_id = ?;

-- Get transaction stats by vendor
SELECT vendor_id, COUNT(*), SUM(amount)
FROM transactions
GROUP BY vendor_id;
```

## Rollback Procedures

### Rollback Migration 3 (Remove Vendor from Transactions)

```sql
-- Remove foreign key
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_vendor_id_fkey";

-- Drop index
DROP INDEX "transactions_vendor_id_idx";

-- Remove vendor column
ALTER TABLE "transactions" DROP COLUMN "vendor_id";

-- Rename memo back to description
ALTER TABLE "transactions" RENAME COLUMN "memo" TO "description";
```

### Rollback Migration 2 (Remove Category Hierarchy)

```sql
-- Remove self-referential foreign key
ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_id_fkey";

-- Drop indexes
DROP INDEX "categories_parent_id_idx";
DROP INDEX "categories_organization_id_parent_id_idx";
DROP INDEX "categories_path_idx";

-- Remove hierarchy columns
ALTER TABLE "categories" DROP COLUMN "parent_id";
ALTER TABLE "categories" DROP COLUMN "depth";
ALTER TABLE "categories" DROP COLUMN "path";
ALTER TABLE "categories" DROP COLUMN "is_active";
```

### Rollback Migration 1 (Remove Vendors)

```sql
-- Drop foreign key
ALTER TABLE "vendors" DROP CONSTRAINT "vendors_organization_id_fkey";

-- Drop indexes
DROP INDEX "vendors_organization_id_idx";
DROP INDEX "vendors_name_trgm_idx";

-- Drop unique constraint index
DROP INDEX "vendors_organization_id_name_key";

-- Drop table
DROP TABLE "vendors";

-- Optionally remove extension (if no other tables use it)
-- DROP EXTENSION IF EXISTS pg_trgm;
```

## Testing

Run the verification script to ensure all migrations work correctly:

```bash
cd treasurer-api
node test-db-schema.js
```

This script verifies:
- Vendor creation and fuzzy search
- Category hierarchy creation and traversal
- Transaction memo and vendor linking
- All foreign key relationships
- Index usage and performance

## Migration Status

Check current migration status:

```bash
npx prisma migrate status
```

Apply pending migrations:

```bash
npx prisma migrate deploy
```

## Production Deployment

### Pre-deployment Checklist

1. Backup database before applying migrations
2. Test migrations on staging environment
3. Verify rollback procedures work
4. Monitor query performance after deployment

### Deployment Steps

```bash
# 1. Backup database
pg_dump -h host -U user -d treasurer_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Apply migrations
npx prisma migrate deploy

# 3. Verify migration status
npx prisma migrate status

# 4. Run verification tests
node test-db-schema.js

# 5. Monitor application logs and performance
```

### Zero-Downtime Considerations

These migrations are designed to be backward-compatible:

- **Migration 1**: Adds new table (no impact on existing queries)
- **Migration 2**: Adds nullable columns with defaults (existing queries work)
- **Migration 3**: Column rename requires code deployment coordination

**Recommended deployment order**:
1. Apply Migration 1 & 2 (safe)
2. Deploy code that supports both `description` and `memo` fields
3. Apply Migration 3 (column rename)
4. Deploy code that uses only `memo` field

## Prisma Client Updates

After applying migrations, regenerate Prisma Client:

```bash
npx prisma generate
```

The updated Prisma Client includes:

```typescript
// Vendor model
model Vendor {
  id: string
  name: string
  description: string | null
  organizationId: string
  transactions: Transaction[]
}

// Category with hierarchy
model Category {
  id: string
  name: string
  parentId: string | null
  depth: number
  path: string | null
  isActive: boolean
  parent: Category | null
  children: Category[]
}

// Transaction with memo and vendor
model Transaction {
  id: string
  memo: string  // renamed from description
  vendorId: string | null
  vendor: Vendor | null
}
```

## Database Constraints

### Foreign Key Behaviors

- `vendors.organization_id` → `organizations.id`: ON DELETE CASCADE
  - Deleting an organization deletes all its vendors

- `categories.parent_id` → `categories.id`: ON DELETE RESTRICT
  - Cannot delete a category that has children
  - Must delete/reassign children first

- `transactions.vendor_id` → `vendors.id`: ON DELETE SET NULL
  - Deleting a vendor preserves transactions (vendor_id becomes NULL)

### Unique Constraints

- `vendors(organization_id, name)`: Each vendor name must be unique within an organization
- `categories(organization_id, name)`: Each category name must be unique within an organization

## Maintenance

### Rebuilding Trigram Index

If vendor search performance degrades:

```sql
REINDEX INDEX vendors_name_trgm_idx;
```

### Updating Category Paths

When restructuring categories, update the materialized path:

```sql
-- Update path when moving a category
UPDATE categories
SET path = (SELECT path || '/' || id FROM categories WHERE id = $newParentId)
WHERE id = $categoryId;
```

### Cleaning Up Inactive Categories

Archive instead of delete to preserve transaction history:

```sql
UPDATE categories SET is_active = false WHERE id = ?;
```

## Support

For issues or questions:
1. Check migration status: `npx prisma migrate status`
2. Review migration files in `prisma/migrations/`
3. Run verification script: `node test-db-schema.js`
4. Check database logs for errors
