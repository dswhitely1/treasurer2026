# Prisma Patterns Reference

## Contents
- Organization-Scoped Queries
- Relation Handling
- Transaction Patterns
- Decimal Field Handling
- Anti-Patterns

---

## Organization-Scoped Queries

Every data query MUST include organization scope for multi-tenancy security.

```typescript
// GOOD - Always scope by organization
const transactions = await prisma.transaction.findMany({
  where: {
    account: { organizationId },
    status: 'UNCLEARED',
    deletedAt: null,
  },
  include: {
    vendor: true,
    splits: { include: { category: true } },
  },
  orderBy: { date: 'desc' },
})
```

```typescript
// BAD - Missing organization scope allows cross-tenant data access
const transactions = await prisma.transaction.findMany({
  where: { status: 'UNCLEARED' },
})
```

---

## Relation Handling

### Nested Includes

```typescript
// Load transaction with all related data
const transaction = await prisma.transaction.findUnique({
  where: { id: transactionId },
  include: {
    account: true,
    vendor: true,
    splits: {
      include: { category: true },
      orderBy: { createdAt: 'asc' },
    },
    statusHistory: {
      include: { changedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { changedAt: 'desc' },
    },
  },
})
```

### Select for Partial Data

```typescript
// GOOD - Only fetch needed fields for list views
const accounts = await prisma.account.findMany({
  where: { organizationId, isActive: true },
  select: {
    id: true,
    name: true,
    accountType: true,
    balance: true,
    _count: { select: { sourceTransactions: true } },
  },
})
```

### WARNING: N+1 Query Pattern

**The Problem:**

```typescript
// BAD - Fetches each vendor separately (N+1 queries)
const transactions = await prisma.transaction.findMany({ where: { accountId } })
for (const tx of transactions) {
  const vendor = await prisma.vendor.findUnique({ where: { id: tx.vendorId } })
  tx.vendorName = vendor?.name
}
```

**Why This Breaks:**
1. 100 transactions = 101 database queries
2. Massive latency increase
3. Database connection pool exhaustion

**The Fix:**

```typescript
// GOOD - Single query with include
const transactions = await prisma.transaction.findMany({
  where: { accountId },
  include: { vendor: { select: { name: true } } },
})
```

---

## Transaction Patterns

### Atomic Operations with Audit Trail

```typescript
export async function updateTransaction(
  transactionId: string,
  userId: string,
  data: UpdateTransactionDto
): Promise<TransactionInfo> {
  return prisma.$transaction(async (tx) => {
    // Get current state for history
    const current = await tx.transaction.findUniqueOrThrow({
      where: { id: transactionId },
    })
    
    // Optimistic locking check
    if (data.version !== current.version) {
      throw new AppError('Version conflict', 409)
    }
    
    // Update with version increment
    const updated = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        ...data,
        version: { increment: 1 },
        lastModifiedById: userId,
      },
    })
    
    // Record edit history
    await tx.transactionEditHistory.create({
      data: {
        transactionId,
        editedById: userId,
        editType: 'UPDATE',
        changes: calculateChanges(current, updated),
        previousState: current,
      },
    })
    
    return updated
  })
}
```

### Bulk Operations

```typescript
// GOOD - Batch create in single transaction
await prisma.$transaction(async (tx) => {
  // Update all transactions
  await Promise.all(
    transactionIds.map((id) =>
      tx.transaction.update({
        where: { id },
        data: { status: 'RECONCILED', reconciledAt: new Date() },
      })
    )
  )
  
  // Batch create history records
  await tx.transactionStatusHistory.createMany({
    data: transactionIds.map((id) => ({
      transactionId: id,
      fromStatus: 'CLEARED',
      toStatus: 'RECONCILED',
      changedById: userId,
    })),
  })
})
```

---

## Decimal Field Handling

Prisma returns `Decimal` objects for financial fields. Convert appropriately.

```typescript
// Schema definition
model Transaction {
  amount    Decimal @db.Decimal(19, 4)
  feeAmount Decimal? @db.Decimal(19, 4)
}
```

```typescript
// GOOD - Convert to number for JSON response
function formatTransaction(tx: Transaction): TransactionInfo {
  return {
    ...tx,
    amount: tx.amount.toNumber(),
    feeAmount: tx.feeAmount?.toNumber() ?? null,
  }
}
```

```typescript
// BAD - Sending raw Decimal to frontend causes serialization issues
res.json({ data: transaction }) // Decimal becomes string "42.5000"
```

---

## Anti-Patterns

### WARNING: Raw Queries Without Parameterization

**The Problem:**

```typescript
// BAD - SQL injection vulnerability
const results = await prisma.$queryRawUnsafe(
  `SELECT * FROM transactions WHERE description LIKE '%${searchTerm}%'`
)
```

**Why This Breaks:**
1. SQL injection allows data exfiltration
2. Attackers can delete or modify data
3. Security audit failure

**The Fix:**

```typescript
// GOOD - Use parameterized queries
const results = await prisma.$queryRaw`
  SELECT * FROM transactions 
  WHERE description ILIKE ${`%${searchTerm}%`}
`
```

### WARNING: Missing Error Handling for Unique Constraints

**The Problem:**

```typescript
// BAD - P2002 error crashes the application
await prisma.category.create({
  data: { name: 'Groceries', organizationId },
})
```

**The Fix:**

```typescript
// GOOD - Handle unique constraint violation
try {
  await prisma.category.create({
    data: { name: 'Groceries', organizationId },
  })
} catch (error) {
  if (error.code === 'P2002') {
    throw new AppError('Category already exists', 409)
  }
  throw error
}
```

### WARNING: Forgetting deletedAt in Queries

```typescript
// BAD - Returns soft-deleted records
const transactions = await prisma.transaction.findMany({
  where: { accountId },
})

// GOOD - Exclude soft-deleted records
const transactions = await prisma.transaction.findMany({
  where: { accountId, deletedAt: null },
})