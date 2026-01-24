# PostgreSQL Patterns Reference

## Contents
- Financial Data Types
- Multi-Tenant Schema Design
- Indexing Strategies
- Soft Deletes
- JSON Column Patterns
- Common Anti-Patterns

## Financial Data Types

### WARNING: Never Use FLOAT for Money

**The Problem:**

```sql
-- BAD - Floating-point arithmetic errors
SELECT 0.1 + 0.2;  -- Returns 0.30000000000000004
```

**Why This Breaks:**
1. Floating-point cannot represent decimals exactly
2. Rounding errors accumulate over thousands of transactions
3. Financial audits will fail

**The Fix:**

```prisma
// GOOD - Exact decimal arithmetic
model Transaction {
  amount Decimal @db.Decimal(19, 4)  // Up to 999 trillion with 4 decimal places
}
```

**Prisma Query Handling:**

```typescript
// Prisma returns Decimal as Prisma.Decimal object
const transaction = await prisma.transaction.findFirst()
const amount = transaction.amount.toNumber()  // Convert for calculations
const formatted = transaction.amount.toFixed(2)  // For display
```

## Multi-Tenant Schema Design

### Organization Scoping Pattern

Every tenant-specific table includes `organizationId`:

```prisma
model Account {
  id             String @id @default(uuid())
  organizationId String @map("organization_id")
  
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([organizationId])  // REQUIRED for tenant queries
}
```

### Unique Constraints Within Tenant

```prisma
model Category {
  name           String
  organizationId String @map("organization_id")
  
  // Names unique per organization, not globally
  @@unique([organizationId, parentId, name])
}

model Vendor {
  name           String
  organizationId String @map("organization_id")
  
  @@unique([organizationId, name])
}
```

## Indexing Strategies

### Composite Index Order Matters

```prisma
// GOOD - Most selective column first for equality, then range
@@index([accountId, status, date])

// Query that benefits:
// WHERE accountId = ? AND status = ? AND date BETWEEN ? AND ?
```

### WARNING: Missing Indexes on Foreign Keys

**The Problem:**

```prisma
// BAD - No index on vendorId
model Transaction {
  vendorId String? @map("vendor_id")
  vendor   Vendor? @relation(fields: [vendorId], references: [id])
}
```

**Why This Breaks:**
1. JOIN operations scan entire table
2. Cascade deletes become O(n) operations
3. Performance degrades with data growth

**The Fix:**

```prisma
// GOOD - Index every foreign key
model Transaction {
  vendorId String? @map("vendor_id")
  vendor   Vendor? @relation(fields: [vendorId], references: [id])
  
  @@index([vendorId])
}
```

### Index Types for Different Queries

| Query Pattern | Index Type | Prisma Syntax |
|---------------|------------|---------------|
| Equality (`=`) | B-tree (default) | `@@index([column])` |
| Range (`<`, `>`, `BETWEEN`) | B-tree | `@@index([column])` |
| Pattern (`LIKE 'prefix%'`) | B-tree | `@@index([column])` |
| Full-text search | GIN | Raw SQL migration |
| JSONB containment | GIN | Raw SQL migration |

## Soft Deletes

### Treasurer Pattern

```prisma
model Transaction {
  deletedAt   DateTime? @map("deleted_at")
  deletedById String?   @map("deleted_by_id")
  
  deletedBy User? @relation("TransactionsDeleted", fields: [deletedById], references: [id])
  
  @@index([deletedAt])  // Filter soft-deleted records efficiently
}
```

### Query Patterns

```typescript
// Active records only
const active = await prisma.transaction.findMany({
  where: { accountId, deletedAt: null }
})

// Include deleted (admin view)
const all = await prisma.transaction.findMany({
  where: { accountId }
})

// Deleted only (trash view)
const deleted = await prisma.transaction.findMany({
  where: { accountId, deletedAt: { not: null } }
})
```

## JSON Column Patterns

### Audit Trail with Typed JSON

```prisma
model TransactionEditHistory {
  changes       Json   // { field: { old: value, new: value } }
  previousState Json?  // Full transaction snapshot
}
```

### TypeScript Types for JSON

```typescript
// Define structure in TypeScript
interface FieldChange {
  old: unknown
  new: unknown
}

interface EditChanges {
  [fieldName: string]: FieldChange
}

// Prisma returns Json as unknown, cast after validation
const changes = editHistory.changes as EditChanges
```

### WARNING: Querying Deep JSON Without Indexes

**The Problem:**

```typescript
// BAD - Full table scan on JSON
await prisma.$queryRaw`
  SELECT * FROM transaction_edit_history 
  WHERE changes->>'amount' IS NOT NULL
`
```

**The Fix:**

For frequent JSON queries, create a GIN index via raw migration:

```sql
-- In a migration file
CREATE INDEX idx_edit_changes ON transaction_edit_history USING GIN (changes);
```

## Common Anti-Patterns

### WARNING: N+1 Queries

**The Problem:**

```typescript
// BAD - One query per transaction
const accounts = await prisma.account.findMany()
for (const account of accounts) {
  const transactions = await prisma.transaction.findMany({
    where: { accountId: account.id }
  })
}
```

**The Fix:**

```typescript
// GOOD - Single query with include
const accounts = await prisma.account.findMany({
  include: { sourceTransactions: true }
})

// OR batch query
const accountIds = accounts.map(a => a.id)
const transactions = await prisma.transaction.findMany({
  where: { accountId: { in: accountIds } }
})
```

### WARNING: Selecting All Columns

**The Problem:**

```typescript
// BAD - Fetches entire previousState JSON for list view
const history = await prisma.transactionEditHistory.findMany()
```

**The Fix:**

```typescript
// GOOD - Select only needed fields
const history = await prisma.transactionEditHistory.findMany({
  select: {
    id: true,
    editType: true,
    editedAt: true,
    editedBy: { select: { name: true } }
  }
})
```

See the **prisma** skill for more query optimization patterns.