# Database Reference

## Contents
- Prisma Client Setup
- Query Patterns
- N+1 Prevention
- Transactions
- Error Mapping

## Prisma Client Setup

Single Prisma client instance shared across the application:

```typescript
// src/config/database.ts
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error']
})
```

See the **prisma** skill for schema and migrations.

## Query Patterns

### Finding with Ownership Check

Always verify resource ownership through organization:

```typescript
const account = await prisma.account.findFirst({
  where: {
    id: accountId,
    organizationId  // Tenant isolation
  }
})

if (!account) throw new AppError('Account not found', 404)
```

### Including Relations

```typescript
const transaction = await prisma.transaction.findFirst({
  where: { id: transactionId, accountId },
  include: {
    vendor: true,
    splits: {
      include: { category: true }
    },
    createdBy: {
      select: { id: true, name: true, email: true }
    }
  }
})
```

### Pagination

```typescript
const [transactions, total] = await Promise.all([
  prisma.transaction.findMany({
    where: { accountId },
    orderBy: { date: 'desc' },
    take: query.limit,
    skip: query.offset,
    include: { splits: { include: { category: true } } }
  }),
  prisma.transaction.count({ where: { accountId } })
])

return { transactions, total }
```

## N+1 Prevention

### WARNING: N+1 Query in Loop

**The Problem:**

```typescript
// BAD - One query per transaction
const transactions = await prisma.transaction.findMany({ where: { accountId } })
for (const tx of transactions) {
  const splits = await prisma.transactionSplit.findMany({ where: { transactionId: tx.id } })
  tx.splits = splits
}
```

**Why This Breaks:**
- 100 transactions = 101 queries
- Exponential response times
- Database connection exhaustion

**The Fix:**

```typescript
// GOOD - Single query with include
const transactions = await prisma.transaction.findMany({
  where: { accountId },
  include: {
    splits: { include: { category: true } }
  }
})
```

## Transactions

Use database transactions for multi-step operations:

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Create transaction
  const newTransaction = await tx.transaction.create({
    data: { description, amount, accountId, splits: { create: splitsData } }
  })

  // Update account balance
  await tx.account.update({
    where: { id: accountId },
    data: { balance: { increment: amount } }
  })

  return newTransaction
})
```

### Transaction Isolation

All operations in `$transaction` callback use the same database transaction:
- If any operation fails, all are rolled back
- Use `tx` client (not `prisma`) for all operations inside

## Error Mapping

Prisma errors are mapped in the error handler:

```typescript
// src/middleware/errorHandler.ts
if (err instanceof Prisma.PrismaClientKnownRequestError) {
  if (err.code === 'P2002') {
    sendError(res, 'A record with this value already exists', 409)
    return
  }
  if (err.code === 'P2025') {
    sendError(res, 'Record not found', 404)
    return
  }
}
```

### Common Prisma Error Codes

| Code | Meaning | HTTP Status |
|------|---------|-------------|
| P2002 | Unique constraint violation | 409 Conflict |
| P2025 | Record not found | 404 Not Found |
| P2003 | Foreign key constraint | 400 Bad Request |

## Optimistic Locking

Prevent concurrent edit conflicts with version field:

```typescript
// Check version before update
if (existing.version !== input.version) {
  throw new VersionConflictError(
    'Transaction has been modified by another user',
    { currentVersion: existing.version, lastModifiedAt: existing.updatedAt },
    formatTransaction(existing)
  )
}

// Increment version on update
await tx.transaction.update({
  where: { id: transactionId },
  data: { ...updateData, version: { increment: 1 } }
})