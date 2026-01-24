# PostgreSQL Workflows Reference

## Contents
- Migration Workflow
- Schema Change Checklist
- Query Performance Debugging
- Database Testing Patterns
- Production Considerations

## Migration Workflow

### Development Migration Flow

```bash
# 1. Modify schema.prisma
# 2. Create migration
cd treasurer-api
pnpm db:migrate --name add_vendor_description

# 3. Migration creates:
# prisma/migrations/20260123_add_vendor_description/migration.sql

# 4. Verify and commit both schema.prisma and migration file
```

### Push vs Migrate

| Command | Use Case | Production Safe |
|---------|----------|-----------------|
| `pnpm db:push` | Rapid prototyping, sync schema | NO |
| `pnpm db:migrate` | Tracked changes, production | YES |

### Copy this checklist for schema changes:
- [ ] Modify `prisma/schema.prisma`
- [ ] Run `pnpm db:migrate --name descriptive_name`
- [ ] Review generated SQL in migration file
- [ ] Run `pnpm db:generate` to update Prisma client
- [ ] Update TypeScript types if needed
- [ ] Add tests for new fields/models
- [ ] Commit schema.prisma AND migration folder

## Schema Change Checklist

### Adding a New Column

```prisma
// 1. Add to schema with default or nullable
model Transaction {
  memo String?  // Nullable - existing rows get NULL
  // OR
  status TransactionStatus @default(UNCLEARED)  // Default value
}
```

### WARNING: Breaking Changes Require Migration Strategy

**The Problem:**

```prisma
// BAD - Renaming column loses data
// Before: description String
// After:  memo String
```

**The Fix:**

```sql
-- migration.sql: Rename preserves data
ALTER TABLE transactions RENAME COLUMN description TO memo;
```

### Adding Required Column to Existing Table

```bash
# 1. Add as nullable first
pnpm db:migrate --name add_vendor_id_nullable

# 2. Backfill data
pnpm db:seed  # Or custom backfill script

# 3. Make required
pnpm db:migrate --name make_vendor_id_required
```

## Query Performance Debugging

### Enable Query Logging

```typescript
// treasurer-api/src/config/database.ts
export const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
  ],
})

prisma.$on('query', (e) => {
  console.log(`Query: ${e.query}`)
  console.log(`Duration: ${e.duration}ms`)
})
```

### EXPLAIN ANALYZE via Prisma

```typescript
// Debug slow queries
const result = await prisma.$queryRaw`
  EXPLAIN ANALYZE
  SELECT * FROM transactions
  WHERE account_id = ${accountId}
    AND status = 'CLEARED'
    AND date BETWEEN ${startDate} AND ${endDate}
`
console.log(result)
```

### Index Usage Verification

```sql
-- Check if index is being used
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM transactions
WHERE account_id = 'uuid' AND status = 'CLEARED';

-- Look for:
-- Index Scan using idx_transactions_account_status (good)
-- Seq Scan on transactions (bad - missing index)
```

### Iterate-Until-Pass Performance Workflow

1. Identify slow query via logging
2. Run EXPLAIN ANALYZE
3. Check for Seq Scan or high row estimates
4. Add appropriate index
5. Re-run EXPLAIN ANALYZE
6. If still slow, check query structure
7. Only proceed when Index Scan appears

## Database Testing Patterns

### Test Database Setup

```typescript
// treasurer-api/tests/setup.ts
import { prisma } from '../src/config/database.js'

beforeAll(async () => {
  await prisma.$connect()
})

afterEach(async () => {
  // Clean in dependency order
  await prisma.transactionEditHistory.deleteMany()
  await prisma.transactionStatusHistory.deleteMany()
  await prisma.transactionSplit.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.account.deleteMany()
  await prisma.category.deleteMany()
  await prisma.vendor.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

### Test Factories

```typescript
// treasurer-api/tests/helpers/testFactories.ts
export async function createTestOrganization(overrides = {}) {
  return prisma.organization.create({
    data: {
      name: 'Test Org',
      ...overrides,
    },
  })
}

export async function createTestTransaction(accountId: string, overrides = {}) {
  return prisma.transaction.create({
    data: {
      accountId,
      amount: new Prisma.Decimal('100.00'),
      transactionType: 'EXPENSE',
      status: 'UNCLEARED',
      date: new Date(),
      ...overrides,
    },
  })
}
```

See the **vitest** skill for test execution patterns.

## Production Considerations

### Connection Pooling

```env
# treasurer-api/.env
# Default pool size is 5, adjust based on load
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20"
```

### Prepared Statement Caching

Prisma uses prepared statements automatically. For high-throughput:

```env
# Increase prepared statement cache
DATABASE_URL="postgresql://...?statement_cache_size=500"
```

### Monitoring Queries

Key metrics to track:
- Query duration (p95, p99)
- Connection pool utilization
- Slow query log (queries > 100ms)
- Lock waits

### Backup Strategy

```bash
# Logical backup (smaller, slower restore)
pg_dump -Fc treasurer > treasurer_$(date +%Y%m%d).dump

# Restore
pg_restore -d treasurer treasurer_20260123.dump
```

### WARNING: Missing Transaction Boundaries

**The Problem:**

```typescript
// BAD - Partial failure leaves inconsistent state
await prisma.transaction.update({ where: { id }, data: { status: 'RECONCILED' } })
await prisma.transactionStatusHistory.create({ data: { ... } })
// If second query fails, transaction is updated without history
```

**The Fix:**

```typescript
// GOOD - Atomic operation
await prisma.$transaction(async (tx) => {
  await tx.transaction.update({ where: { id }, data: { status: 'RECONCILED' } })
  await tx.transactionStatusHistory.create({ data: { ... } })
})
```

See the **prisma** skill for transaction patterns.