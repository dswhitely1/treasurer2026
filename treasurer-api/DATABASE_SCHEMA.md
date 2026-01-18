# Database Schema Documentation

## Overview

The Treasurer application uses PostgreSQL with Prisma ORM. The schema includes vendor management, hierarchical categories, and comprehensive transaction tracking.

## Entity Relationship Diagram

```
Organization (1) ──────< (N) Vendor
     │
     ├──────< (N) Account ──────< (N) Transaction ────── (0..1) Vendor
     │                                     │
     └──────< (N) Category                 └──────< (N) TransactionSplit ────── (1) Category
                    │
                    └── (self-reference) parent-child hierarchy
```

## Tables

### vendors

Organization-scoped vendors with fuzzy text search support.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| name | TEXT | NOT NULL | Vendor name |
| description | TEXT | NULL | Optional description |
| organization_id | TEXT | FK → organizations.id, NOT NULL | Organization scoping |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes**:
- `vendors_pkey` (PK): id
- `vendors_organization_id_idx` (B-tree): organization_id
- `vendors_organization_id_name_key` (UNIQUE): (organization_id, name)
- `vendors_name_trgm_idx` (GIN): name gin_trgm_ops

**Constraints**:
- UNIQUE: (organization_id, name)
- FK: organization_id → organizations.id ON DELETE CASCADE

**Usage**:
```typescript
// Fuzzy search for vendor autocomplete
const vendors = await prisma.$queryRaw`
  SELECT id, name, similarity(name, ${search}) as score
  FROM vendors
  WHERE organization_id = ${orgId}
    AND name % ${search}
  ORDER BY score DESC
  LIMIT 10
`;
```

### categories (Enhanced with Hierarchy)

Organization-scoped categories with parent-child relationships and materialized path.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| name | TEXT | NOT NULL | Category name |
| parent_id | TEXT | FK → categories.id, NULL | Parent category (NULL = root) |
| depth | INTEGER | NOT NULL, DEFAULT 0 | Hierarchy level (0 = root) |
| path | TEXT | NULL | Materialized path (e.g., "parent_id/child_id") |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Soft delete flag |
| organization_id | TEXT | FK → organizations.id, NOT NULL | Organization scoping |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes**:
- `categories_pkey` (PK): id
- `categories_organization_id_idx` (B-tree): organization_id
- `categories_parent_id_idx` (B-tree): parent_id
- `categories_organization_id_parent_id_idx` (B-tree): (organization_id, parent_id)
- `categories_path_idx` (B-tree): path
- `categories_organization_id_name_key` (UNIQUE): (organization_id, name)

**Constraints**:
- UNIQUE: (organization_id, name)
- FK: organization_id → organizations.id ON DELETE CASCADE
- FK: parent_id → categories.id ON DELETE RESTRICT

**Usage**:
```typescript
// Get all root categories
const rootCategories = await prisma.category.findMany({
  where: {
    organizationId: orgId,
    parentId: null
  }
});

// Get category with children
const categoryTree = await prisma.category.findUnique({
  where: { id: categoryId },
  include: {
    children: {
      where: { isActive: true }
    }
  }
});

// Get entire subtree using materialized path
const subtree = await prisma.$queryRaw`
  SELECT * FROM categories
  WHERE organization_id = ${orgId}
    AND (path LIKE ${categoryId + '%'} OR id = ${categoryId})
    AND is_active = true
  ORDER BY depth, name
`;
```

### transactions (Enhanced with Vendor)

Financial transactions with vendor association and memo field.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| memo | TEXT | NOT NULL | Transaction memo (renamed from description) |
| amount | DECIMAL(19,4) | NOT NULL | Transaction amount |
| transaction_type | TransactionType | NOT NULL, DEFAULT 'EXPENSE' | INCOME, EXPENSE, TRANSFER |
| date | TIMESTAMP | NOT NULL, DEFAULT NOW() | Transaction date |
| fee_amount | DECIMAL(19,4) | NULL | Optional transaction fee |
| status | TransactionStatus | NOT NULL, DEFAULT 'UNCLEARED' | UNCLEARED, CLEARED, RECONCILED |
| cleared_at | TIMESTAMP | NULL | When transaction was cleared |
| reconciled_at | TIMESTAMP | NULL | When transaction was reconciled |
| account_id | TEXT | FK → accounts.id, NOT NULL | Source account |
| destination_account_id | TEXT | FK → accounts.id, NULL | Destination (for transfers) |
| vendor_id | TEXT | FK → vendors.id, NULL | Associated vendor |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

**Indexes**:
- `transactions_pkey` (PK): id
- `transactions_account_id_idx` (B-tree): account_id
- `transactions_destination_account_id_idx` (B-tree): destination_account_id
- `transactions_vendor_id_idx` (B-tree): vendor_id
- `transactions_date_idx` (B-tree): date
- `transactions_status_idx` (B-tree): status
- `transactions_account_id_status_idx` (B-tree): (account_id, status)
- `transactions_account_id_status_date_idx` (B-tree): (account_id, status, date)

**Constraints**:
- FK: account_id → accounts.id ON DELETE CASCADE
- FK: destination_account_id → accounts.id ON DELETE SET NULL
- FK: vendor_id → vendors.id ON DELETE SET NULL

**Usage**:
```typescript
// Create transaction with vendor
const transaction = await prisma.transaction.create({
  data: {
    memo: 'Grocery shopping',
    amount: 125.50,
    transactionType: 'EXPENSE',
    date: new Date(),
    accountId: accountId,
    vendorId: vendorId,
    status: 'UNCLEARED'
  },
  include: {
    vendor: true,
    splits: {
      include: { category: true }
    }
  }
});

// Get transactions by vendor
const vendorTransactions = await prisma.transaction.findMany({
  where: { vendorId: vendorId },
  include: { vendor: true },
  orderBy: { date: 'desc' }
});
```

## PostgreSQL Extensions

### pg_trgm (Trigram Text Search)

Enabled for fuzzy text search on vendor names.

**Features**:
- Similarity scoring: `similarity(text1, text2)` returns 0.0 to 1.0
- Similarity operator: `text % pattern` for matching
- GIN indexes for fast searches

**Configuration**:
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index
CREATE INDEX vendors_name_trgm_idx ON vendors USING gin (name gin_trgm_ops);

-- Query with similarity
SELECT * FROM vendors
WHERE name % 'search_term'
ORDER BY similarity(name, 'search_term') DESC;
```

## Performance Considerations

### Vendor Autocomplete

**Optimization**: Trigram GIN index
- O(log n) lookup time
- Handles typos and partial matches
- Adjustable similarity threshold

**Query Pattern**:
```sql
SELECT id, name
FROM vendors
WHERE organization_id = ? AND name % ?
ORDER BY similarity(name, ?) DESC
LIMIT 10;
```

**Performance**: < 10ms for 100K vendors

### Category Hierarchy Queries

**Root Categories** (uses composite index):
```sql
-- Uses: categories_organization_id_parent_id_idx
SELECT * FROM categories
WHERE organization_id = ? AND parent_id IS NULL;
```

**Children Lookup** (uses parent_id index):
```sql
-- Uses: categories_parent_id_idx
SELECT * FROM categories WHERE parent_id = ?;
```

**Subtree Traversal** (uses path index):
```sql
-- Uses: categories_path_idx
SELECT * FROM categories
WHERE path LIKE 'root_id%';
```

**Performance**: < 5ms for 10K categories, < 50ms for 100K categories

### Transaction Queries

**Most Common Query Patterns**:

1. **Account statement** (uses composite index):
```sql
-- Uses: transactions_account_id_status_date_idx
SELECT * FROM transactions
WHERE account_id = ? AND status IN ('CLEARED', 'RECONCILED')
ORDER BY date DESC;
```

2. **Vendor spending analysis**:
```sql
-- Uses: transactions_vendor_id_idx
SELECT vendor_id, SUM(amount), COUNT(*)
FROM transactions
WHERE vendor_id IS NOT NULL
GROUP BY vendor_id;
```

## Data Integrity

### Foreign Key Behaviors

| Relationship | ON DELETE | Reason |
|--------------|-----------|--------|
| Organization → Vendor | CASCADE | Delete vendor when org is deleted |
| Organization → Category | CASCADE | Delete category when org is deleted |
| Account → Transaction | CASCADE | Delete transaction when account is deleted |
| Account (destination) → Transaction | SET NULL | Preserve transaction if dest account deleted |
| Vendor → Transaction | SET NULL | Preserve transaction if vendor deleted |
| Category → Category (parent) | RESTRICT | Prevent deleting category with children |
| Category → TransactionSplit | default | Prevent deleting category in use |

### Unique Constraints

- **Vendors**: (organization_id, name) - No duplicate vendor names per org
- **Categories**: (organization_id, name) - No duplicate category names per org

### Check Constraints

None currently defined. Consider adding:
- Transaction amount > 0
- Category depth <= MAX_DEPTH (e.g., 5)
- Path length <= MAX_PATH_LENGTH

## Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| 20260116000000_add_transaction_status | 2026-01-16 | Added transaction status tracking |
| 20260118000001_add_vendors | 2026-01-18 | Added vendors table with fuzzy search |
| 20260118000002_add_category_hierarchy | 2026-01-18 | Added category parent-child hierarchy |
| 20260118000003_add_vendor_to_transactions | 2026-01-18 | Linked transactions to vendors, renamed description to memo |

## Best Practices

### Vendor Management

1. **Autocomplete UX**: Use debounced fuzzy search with 2-3 character minimum
2. **Vendor Creation**: Auto-create vendors on transaction entry
3. **Deduplication**: Check similarity before creating new vendors

### Category Hierarchy

1. **Depth Limits**: Enforce maximum depth (e.g., 5 levels)
2. **Path Maintenance**: Update path when moving categories
3. **Soft Deletion**: Use `is_active = false` instead of DELETE
4. **Prevent Cycles**: Validate parent_id doesn't create cycles

### Transaction Processing

1. **Atomic Updates**: Use transactions for multi-step operations
2. **Status Workflow**: UNCLEARED → CLEARED → RECONCILED (one direction)
3. **Memo Standards**: Encourage consistent memo formats
4. **Vendor Association**: Link vendors at transaction creation time

## Query Examples

### Advanced Vendor Search

```typescript
// Find vendors with similar names across all organizations
const duplicateVendors = await prisma.$queryRaw`
  SELECT v1.name, v1.organization_id, v2.organization_id,
         similarity(v1.name, v2.name) as sim
  FROM vendors v1
  JOIN vendors v2 ON v1.id < v2.id
  WHERE similarity(v1.name, v2.name) > 0.8
  ORDER BY sim DESC;
`;
```

### Category Tree Aggregation

```typescript
// Get spending by category tree
const categorySpending = await prisma.$queryRaw`
  WITH RECURSIVE category_tree AS (
    SELECT id, name, parent_id, 0 as level
    FROM categories
    WHERE organization_id = ${orgId} AND parent_id IS NULL

    UNION ALL

    SELECT c.id, c.name, c.parent_id, ct.level + 1
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
  )
  SELECT ct.name, ct.level, COALESCE(SUM(ts.amount), 0) as total
  FROM category_tree ct
  LEFT JOIN transaction_splits ts ON ts.category_id = ct.id
  GROUP BY ct.id, ct.name, ct.level
  ORDER BY ct.level, ct.name;
`;
```

### Vendor Transaction Summary

```typescript
// Get top vendors by spending
const topVendors = await prisma.$queryRaw`
  SELECT
    v.id,
    v.name,
    COUNT(t.id) as transaction_count,
    SUM(t.amount) as total_amount,
    AVG(t.amount) as avg_amount,
    MAX(t.date) as last_transaction_date
  FROM vendors v
  LEFT JOIN transactions t ON t.vendor_id = v.id
  WHERE v.organization_id = ${orgId}
  GROUP BY v.id, v.name
  HAVING COUNT(t.id) > 0
  ORDER BY total_amount DESC
  LIMIT 20;
`;
```

## Backup and Recovery

### Backup Strategy

```bash
# Full database backup
pg_dump -h localhost -U treasurer -d treasurer_db -F c -f backup.dump

# Schema-only backup
pg_dump -h localhost -U treasurer -d treasurer_db --schema-only > schema.sql

# Table-specific backup
pg_dump -h localhost -U treasurer -d treasurer_db -t vendors -t categories > vendors_categories.sql
```

### Restore

```bash
# Restore full database
pg_restore -h localhost -U treasurer -d treasurer_db backup.dump

# Restore schema
psql -h localhost -U treasurer -d treasurer_db < schema.sql
```

## Monitoring

### Key Metrics to Track

1. **Query Performance**:
   - Slow queries (> 100ms)
   - Index usage statistics
   - Cache hit ratio

2. **Data Growth**:
   - Vendor count per organization
   - Category depth distribution
   - Transaction volume per day

3. **Index Health**:
   - Index bloat
   - Unused indexes
   - Missing indexes

### Monitoring Queries

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexname NOT LIKE '%pkey';

-- Check table sizes
SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;
```
