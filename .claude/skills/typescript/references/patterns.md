# TypeScript Patterns Reference

## Contents
- Idiomatic Patterns
- Error Handling Conventions
- Async Patterns
- Type Narrowing
- Configuration Patterns

---

## Idiomatic Patterns

### Const Assertions for Enums

```typescript
// GOOD - Const assertion for literal types
const TRANSACTION_STATUS = {
  UNCLEARED: 'UNCLEARED',
  CLEARED: 'CLEARED',
  RECONCILED: 'RECONCILED',
} as const

type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS]
// Result: 'UNCLEARED' | 'CLEARED' | 'RECONCILED'

// BAD - String enum (harder to iterate, worse tree-shaking)
enum TransactionStatus {
  UNCLEARED = 'UNCLEARED',
  CLEARED = 'CLEARED',
}
```

### Satisfies for Type Checking

```typescript
// GOOD - satisfies checks type without widening
const config = {
  port: 3001,
  host: 'localhost',
} satisfies ServerConfig

// Type is still { port: 3001; host: 'localhost' }, not ServerConfig

// BAD - Type annotation widens the type
const config: ServerConfig = {
  port: 3001,
  host: 'localhost',
}
// Type is now ServerConfig, losing literal types
```

### Branded Types for IDs

```typescript
// Prevent mixing up different ID types
type UserId = string & { readonly __brand: 'UserId' }
type OrgId = string & { readonly __brand: 'OrgId' }

function createUserId(id: string): UserId {
  return id as UserId
}

function getUser(id: UserId) { /* ... */ }

// Compiler error: cannot pass OrgId to UserId parameter
const orgId = 'org-123' as OrgId
getUser(orgId) // Error!
```

---

## Error Handling Conventions

### Result Type Pattern

```typescript
// Type-safe error handling without exceptions
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E }

async function findTransaction(id: string): Promise<Result<Transaction, 'NOT_FOUND' | 'FORBIDDEN'>> {
  const tx = await prisma.transaction.findUnique({ where: { id } })
  if (!tx) return { ok: false, error: 'NOT_FOUND' }
  return { ok: true, value: tx }
}

// Usage
const result = await findTransaction(id)
if (!result.ok) {
  if (result.error === 'NOT_FOUND') return res.status(404).json({ message: 'Not found' })
  return res.status(403).json({ message: 'Forbidden' })
}
// result.value is now Transaction
```

### Unknown Error Handling

```typescript
// GOOD - Handle unknown errors safely
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error occurred'
}

// BAD - Assuming error is Error
catch (error) {
  console.log(error.message) // Error: 'error' is of type 'unknown'
}
```

---

## Async Patterns

### Typed Async Functions

```typescript
// GOOD - Explicit return type for async functions
async function fetchTransactions(
  accountId: string
): Promise<Transaction[]> {
  const data = await prisma.transaction.findMany({
    where: { accountId },
  })
  return data
}

// BAD - Implicit Promise<any>
async function fetchTransactions(accountId: string) {
  return fetch(`/api/transactions/${accountId}`).then(r => r.json())
  // Return type is Promise<any>
}
```

### Promise.all with Tuple Types

```typescript
// Preserves individual types in the tuple
const [user, org, accounts] = await Promise.all([
  fetchUser(userId),      // Promise<User>
  fetchOrg(orgId),        // Promise<Organization>
  fetchAccounts(orgId),   // Promise<Account[]>
])
// Types: [User, Organization, Account[]]
```

---

## Type Narrowing

### In Operator Narrowing

```typescript
interface ApiSuccess { data: Transaction }
interface ApiError { error: string; statusCode: number }
type ApiResult = ApiSuccess | ApiError

function handleResult(result: ApiResult) {
  if ('error' in result) {
    // result is ApiError
    console.error(result.error, result.statusCode)
  } else {
    // result is ApiSuccess
    console.log(result.data)
  }
}
```

### Exhaustive Switch with never

```typescript
function getStatusColor(status: TransactionStatus): string {
  switch (status) {
    case 'UNCLEARED': return 'gray'
    case 'CLEARED': return 'blue'
    case 'RECONCILED': return 'green'
    default:
      // Compile error if a case is missing
      const _exhaustive: never = status
      throw new Error(`Unhandled status: ${_exhaustive}`)
  }
}
```

---

## Configuration Patterns

### Type-Safe Environment Variables

See the **zod** skill for runtime validation patterns.

```typescript
// treasurer-api/src/config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().default(3001),
})

export const env = envSchema.parse(process.env)
// env is fully typed: { DATABASE_URL: string; JWT_SECRET: string; ... }
```

### Module Augmentation for Express

```typescript
// treasurer-api/src/types/express.d.ts
import type { User, OrganizationMember } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      user?: User
      organizationMember?: OrganizationMember
    }
  }
}