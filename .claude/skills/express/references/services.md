# Services Reference

## Contents
- Service Layer Pattern
- Throwing Errors
- Database Transactions
- State Machine Pattern
- Bulk Operations

## Service Layer Pattern

Services contain business logic. Controllers handle HTTP, services handle domain.

```typescript
// src/services/transactionService.ts
export async function createTransaction(
  organizationId: string,
  accountId: string,
  input: CreateTransactionDto,
  userId?: string
): Promise<TransactionInfo> {
  // 1. Verify ownership
  const account = await prisma.account.findFirst({
    where: { id: accountId, organizationId }
  })
  if (!account) throw new AppError('Account not found', 404)

  // 2. Business validation
  if (input.vendorId) {
    const isValid = await validateVendorOwnership(input.vendorId, organizationId)
    if (!isValid) throw new AppError('Vendor not found or inactive', 404)
  }

  // 3. Database operation
  const transaction = await prisma.$transaction(async (tx) => {
    return tx.transaction.create({ data: { ... } })
  })

  return formatTransaction(transaction)
}
```

### Service Responsibilities

| Do | Don't |
|----|----|
| Validate business rules | Access `req` or `res` objects |
| Throw `AppError` with status codes | Return HTTP responses |
| Use Prisma transactions | Handle HTTP headers |
| Format data for response | Log request details |

## Throwing Errors

Use `AppError` with appropriate status codes:

```typescript
import { AppError } from '../middleware/errorHandler.js'

// Not found
throw new AppError('Account not found', 404)

// Business rule violation
throw new AppError('Cannot modify reconciled transactions', 400)

// Duplicate
throw new AppError('Email already registered', 409)

// With error ID for tracking
throw new AppError('Account not found', 404, undefined, ERROR_IDS.TXN_ACCOUNT_NOT_FOUND)
```

## Database Transactions

Use `prisma.$transaction` for multi-step operations:

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Update transaction status
  await tx.transaction.update({
    where: { id: transactionId },
    data: { status: newStatus, clearedAt: new Date() }
  })

  // Create audit record
  return tx.transactionStatusHistory.create({
    data: {
      transactionId,
      fromStatus: oldStatus,
      toStatus: newStatus,
      changedById: userId,
      notes
    }
  })
})
```

### Transaction Rules

1. All operations in a transaction succeed or all fail
2. Use `tx` (transaction client), not `prisma`
3. Return the final result from the transaction callback

## State Machine Pattern

Enforce valid state transitions:

```typescript
// src/services/transactionStatusService.ts
const STATUS_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  UNCLEARED: ['CLEARED'],
  CLEARED: ['UNCLEARED', 'RECONCILED'],
  RECONCILED: []  // Terminal state
}

export function isValidStatusTransition(
  currentStatus: TransactionStatus,
  newStatus: TransactionStatus
): boolean {
  if (currentStatus === newStatus) return false
  return STATUS_TRANSITIONS[currentStatus].includes(newStatus)
}

// Usage in service
if (!isValidStatusTransition(transaction.status, input.status)) {
  if (transaction.status === 'RECONCILED') {
    throw new AppError('Cannot modify reconciled transactions', 400)
  }
  throw new AppError(`Invalid transition from ${transaction.status} to ${input.status}`, 400)
}
```

## Bulk Operations with Partial Failure

Handle partial success in bulk operations:

```typescript
export async function bulkChangeTransactionStatus(
  organizationId: string,
  accountId: string,
  userId: string,
  input: BulkStatusChangeRequestDto
): Promise<BulkStatusChangeResult> {
  const successful: Array<{ transactionId: string; status: string }> = []
  const failed: Array<{ transactionId: string; error: string }> = []

  // Validate each transaction
  for (const transactionId of input.transactionIds) {
    const transaction = transactions.find(t => t.id === transactionId)
    
    if (!transaction) {
      failed.push({ transactionId, error: 'Transaction not found' })
      continue
    }
    
    if (!isValidStatusTransition(transaction.status, input.status)) {
      failed.push({ transactionId, error: `Invalid transition` })
      continue
    }
    
    validTransactions.push({ id: transactionId })
  }

  // Process valid ones in single transaction
  if (validTransactions.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const validTx of validTransactions) {
        await tx.transaction.update({ where: { id: validTx.id }, data: { status: input.status } })
        successful.push({ transactionId: validTx.id, status: input.status })
      }
    })
  }

  return { successful, failed }
}
```

## Anti-Patterns

### WARNING: Service Accessing Request Object

**The Problem:**

```typescript
// BAD - Coupled to HTTP layer
export async function createTransaction(req: Request) {
  const userId = req.user?.id  // Dependency on Express
}
```

**Why This Breaks:**
- Can't test without mocking HTTP request
- Can't reuse from CLI or background jobs
- Violates separation of concerns

**The Fix:**

```typescript
// GOOD - Pure business logic
export async function createTransaction(
  organizationId: string,
  accountId: string,
  input: CreateTransactionDto,
  userId: string
): Promise<TransactionInfo>