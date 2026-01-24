# TypeScript Types Reference

## Contents
- Type Inference Patterns
- Utility Types
- Generic Constraints
- Conditional Types
- Mapped Types

---

## Type Inference Patterns

### Infer from Zod Schemas

See the **zod** skill for schema definition patterns.

```typescript
// treasurer-api/src/schemas/transaction.ts
import { z } from 'zod'

export const createTransactionSchema = z.object({
  description: z.string().min(1).max(255),
  amount: z.number().positive(),
  transactionType: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  date: z.coerce.date(),
  categoryId: z.string().uuid().optional(),
})

// Infer TypeScript type from schema
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
// Result: { description: string; amount: number; transactionType: 'INCOME' | ... }
```

### Infer from Prisma

See the **prisma** skill for database type patterns.

```typescript
// Generated types from schema.prisma
import type { Transaction, TransactionStatus } from '@prisma/client'

// Prisma utility types for includes
import type { Prisma } from '@prisma/client'

type TransactionWithAccount = Prisma.TransactionGetPayload<{
  include: { account: true }
}>
```

### Infer from as const

```typescript
const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH'] as const

// Infer union type from array
type AccountType = typeof ACCOUNT_TYPES[number]
// Result: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH'

// Use in validation
function isValidAccountType(type: string): type is AccountType {
  return ACCOUNT_TYPES.includes(type as AccountType)
}
```

---

## Utility Types

### Pick and Omit for DTOs

```typescript
import type { Transaction } from '@prisma/client'

// API response excludes internal fields
type TransactionResponse = Omit<Transaction, 'deletedAt' | 'version'>

// Form only needs certain fields
type TransactionFormData = Pick<Transaction, 'description' | 'amount' | 'date'>
```

### Partial for Updates

```typescript
// Update operations accept partial data
type UpdateTransactionInput = Partial<CreateTransactionInput>

async function updateTransaction(id: string, data: UpdateTransactionInput) {
  return prisma.transaction.update({
    where: { id },
    data, // All fields optional
  })
}
```

### Record for Maps

```typescript
// Status to color mapping
const STATUS_COLORS: Record<TransactionStatus, string> = {
  UNCLEARED: 'bg-gray-100',
  CLEARED: 'bg-blue-100',
  RECONCILED: 'bg-green-100',
}

// Ensures all status values have a color
```

### Required for Strict Inputs

```typescript
// Make all optional fields required
type RequiredUser = Required<User>

// Make specific fields required
type UserWithEmail = User & Required<Pick<User, 'email'>>
```

---

## Generic Constraints

### Constrained Generics

```typescript
// T must have an id property
function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id)
}

// Works with any object that has id: string
const transaction = findById(transactions, 'tx-123')
const account = findById(accounts, 'acc-456')
```

### keyof Constraints

```typescript
// K must be a key of T
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

const amount = getProperty(transaction, 'amount') // type: Decimal
const status = getProperty(transaction, 'status') // type: TransactionStatus
```

### Default Type Parameters

```typescript
// Default error type to Error
type AsyncResult<T, E = Error> = Promise<Result<T, E>>

// Can override the error type
type TransactionResult = AsyncResult<Transaction, 'NOT_FOUND' | 'FORBIDDEN'>
```

---

## Conditional Types

### Extract and Exclude

```typescript
type AllStatuses = 'UNCLEARED' | 'CLEARED' | 'RECONCILED' | 'PENDING' | 'FAILED'

// Only active statuses
type ActiveStatus = Extract<AllStatuses, 'UNCLEARED' | 'CLEARED' | 'RECONCILED'>

// Exclude deprecated statuses
type CurrentStatus = Exclude<AllStatuses, 'PENDING' | 'FAILED'>
```

### ReturnType and Parameters

```typescript
// Extract return type of a function
type TransactionServiceReturn = ReturnType<typeof transactionService.create>

// Extract parameter types
type CreateParams = Parameters<typeof transactionService.create>
// Result: [organizationId: string, accountId: string, input: CreateTransactionInput]
```

### Infer in Conditional Types

```typescript
// Extract the resolved type from a Promise
type Awaited<T> = T extends Promise<infer U> ? U : T

type TransactionData = Awaited<ReturnType<typeof fetchTransaction>>
// Unwraps Promise<Transaction> to Transaction
```

---

## Mapped Types

### Readonly Modifier

```typescript
// Make all properties readonly
type ImmutableTransaction = Readonly<Transaction>

// Deep readonly for nested objects
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}
```

### Optional Modifier

```typescript
// Make all properties optional for patches
type TransactionPatch = { [K in keyof Transaction]?: Transaction[K] }

// Same as Partial<Transaction>
```

### Key Remapping

```typescript
// Prefix all keys with 'on'
type EventHandlers<T> = {
  [K in keyof T as `on${Capitalize<string & K>}`]: (value: T[K]) => void
}

type TransactionHandlers = EventHandlers<Pick<Transaction, 'status' | 'amount'>>
// Result: { onStatus: (value: Status) => void; onAmount: (value: Decimal) => void }