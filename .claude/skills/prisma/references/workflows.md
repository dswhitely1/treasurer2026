# Prisma Workflows Reference

## Contents
- Migration Workflow
- Schema Change Process
- Testing Database Operations
- Production Deployment
- Troubleshooting

---

## Migration Workflow

### Creating a New Migration

Copy this checklist and track progress:
- [ ] Step 1: Modify `prisma/schema.prisma`
- [ ] Step 2: Generate migration with `pnpm db:migrate`
- [ ] Step 3: Review generated SQL in `prisma/migrations/`
- [ ] Step 4: Regenerate client with `pnpm db:generate`
- [ ] Step 5: Update service layer types if needed
- [ ] Step 6: Run tests to verify changes

```bash
# Create migration with descriptive name
cd treasurer-api
pnpm db:migrate --name add_vendor_description

# Verify migration was created
ls prisma/migrations/
```

### Migration Naming Convention

```
YYYYMMDDHHMMSS_description_of_change
```

Examples:
- `20260115120000_add_vendor_table`
- `20260116093000_add_transaction_memo_field`
- `20260117140000_create_category_hierarchy_indexes`

---

## Schema Change Process

### Adding a New Field

```prisma
// 1. Add field to schema
model Transaction {
  // existing fields...
  memo String?  // New optional field
}
```

```bash
# 2. Create and apply migration
pnpm db:migrate --name add_transaction_memo

# 3. Regenerate client
pnpm db:generate
```

```typescript
// 4. Update service layer
const transaction = await prisma.transaction.create({
  data: {
    ...data,
    memo: input.memo ?? null,
  },
})
```

### Adding an Index

```prisma
model Transaction {
  // fields...
  
  @@index([vendorId])  // New index
  @@index([accountId, status, date])  // Composite index
}
```

```bash
# Create index-only migration
pnpm db:migrate --name add_transaction_vendor_index
```

### Adding a Relation

```prisma
// Add to Transaction model
model Transaction {
  vendorId String? @map("vendor_id")
  vendor   Vendor? @relation(fields: [vendorId], references: [id], onDelete: SetNull)
}

// Add to Vendor model
model Vendor {
  transactions Transaction[]
}
```

---

## Testing Database Operations

### Test Setup Pattern

See the **vitest** skill for complete testing patterns.

```typescript
// tests/setup.ts
import { prisma } from '../src/config/database.js'

beforeEach(async () => {
  // Clean in correct order (respect foreign keys)
  await prisma.transactionStatusHistory.deleteMany()
  await prisma.transactionEditHistory.deleteMany()
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
// tests/helpers/testFactories.ts
export async function createTestUser(overrides = {}) {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      password: await hash('password123', 12),
      name: 'Test User',
      ...overrides,
    },
  })
}

export async function createTestTransaction(accountId: string, overrides = {}) {
  return prisma.transaction.create({
    data: {
      accountId,
      amount: 100.00,
      transactionType: 'EXPENSE',
      date: new Date(),
      status: 'UNCLEARED',
      ...overrides,
    },
  })
}
```

### Service Layer Test Example

```typescript
describe('transactionService', () => {
  it('should update transaction with version check', async () => {
    const tx = await createTestTransaction(accountId, { version: 1 })
    
    const updated = await updateTransaction(tx.id, userId, {
      memo: 'Updated memo',
      version: 1,
    })
    
    expect(updated.memo).toBe('Updated memo')
    expect(updated.version).toBe(2)
  })
  
  it('should reject stale version', async () => {
    const tx = await createTestTransaction(accountId, { version: 2 })
    
    await expect(
      updateTransaction(tx.id, userId, { memo: 'Test', version: 1 })
    ).rejects.toThrow('Version conflict')
  })
})
```

---

## Production Deployment

### Pre-deployment Checklist

Copy this checklist and track progress:
- [ ] All migrations tested locally
- [ ] Backup production database
- [ ] Run `pnpm db:migrate deploy` (not `pnpm db:migrate`)
- [ ] Verify migration status
- [ ] Run smoke tests

```bash
# Production migration command (non-interactive)
DATABASE_URL="$PROD_DATABASE_URL" pnpm prisma migrate deploy

# Verify applied migrations
DATABASE_URL="$PROD_DATABASE_URL" pnpm prisma migrate status
```

### Zero-Downtime Migration Strategy

For breaking changes, use multi-phase deployment:

```
Phase 1: Add new column (nullable)
Phase 2: Deploy code that writes to both columns
Phase 3: Backfill existing data
Phase 4: Deploy code that reads from new column
Phase 5: Remove old column
```

---

## Troubleshooting

### Migration Conflicts

```bash
# Reset local database (DEVELOPMENT ONLY)
pnpm db:push --force-reset

# Or drop and recreate
docker compose down -v
docker compose up -d
pnpm db:migrate
```

### Prisma Client Out of Sync

```
Error: The column `memo` does not exist in the current database.
```

**Fix:**
```bash
pnpm db:generate  # Regenerate client
pnpm db:migrate   # Apply pending migrations
```

### Connection Issues

```
Error: Can't reach database server at `localhost:5432`
```

**Fix:**
```bash
# Check if PostgreSQL is running
docker compose ps

# Restart database
docker compose restart db
```

### Validation Loop

1. Make schema changes
2. Run: `pnpm db:migrate`
3. If migration fails, fix schema and repeat step 2
4. Only proceed when migration succeeds
5. Run: `pnpm db:generate`
6. Run: `pnpm test`
7. If tests fail, fix code and repeat step 6