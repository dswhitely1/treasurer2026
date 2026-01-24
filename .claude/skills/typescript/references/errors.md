# TypeScript Error Handling Reference

## Contents
- Common Type Errors
- Strict Mode Errors
- Runtime vs Compile Errors
- Error Resolution Patterns

---

## Common Type Errors

### TS2322: Type Assignment Error

**The Problem:**

```typescript
// BAD - Type 'string' is not assignable to type 'TransactionStatus'
const status: TransactionStatus = userInput
```

**Why This Breaks:**
The compiler cannot verify that `userInput` (a string) is one of the valid status values.

**The Fix:**

```typescript
// GOOD - Type guard validates at runtime
function isTransactionStatus(value: string): value is TransactionStatus {
  return ['UNCLEARED', 'CLEARED', 'RECONCILED'].includes(value)
}

if (isTransactionStatus(userInput)) {
  const status: TransactionStatus = userInput // Now safe
}

// BETTER - Use Zod for validation (see zod skill)
const status = transactionStatusSchema.parse(userInput)
```

### TS2532: Object Possibly Undefined

**The Problem:**

```typescript
// BAD - Object is possibly 'undefined'
const name = user.name.toUpperCase()
```

**Why This Breaks:**
With `strictNullChecks`, TypeScript knows `user.name` could be undefined.

**The Fix:**

```typescript
// Option 1: Optional chaining
const name = user.name?.toUpperCase()

// Option 2: Nullish coalescing
const name = (user.name ?? 'Unknown').toUpperCase()

// Option 3: Early return guard
if (!user.name) {
  throw new AppError('User name is required', 400)
}
const name = user.name.toUpperCase() // Now safe
```

### TS7053: Index Signature Error

**The Problem:**

```typescript
// BAD - Element implicitly has an 'any' type
const value = obj[key]
```

**Why This Breaks:**
With `noUncheckedIndexedAccess`, indexed access returns `T | undefined`.

**The Fix:**

```typescript
// Option 1: Add undefined check
const value = obj[key]
if (value !== undefined) {
  // value is now T, not T | undefined
}

// Option 2: Non-null assertion (only when certain)
const value = obj[key]!

// Option 3: Use Record with explicit types
const obj: Record<string, Transaction> = {}
const value = obj[key] // type is Transaction | undefined
```

---

## Strict Mode Errors

### TS2345: Argument Type Mismatch

**The Problem:**

```typescript
// BAD - Argument of type 'unknown' is not assignable
catch (error) {
  console.log(error.message) // error is 'unknown'
}
```

**The Fix:**

```typescript
// GOOD - Type narrow the error
catch (error) {
  if (error instanceof Error) {
    console.log(error.message)
  } else if (typeof error === 'string') {
    console.log(error)
  } else {
    console.log('Unknown error')
  }
}

// OR use a helper function
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
```

### TS2339: Property Does Not Exist

**The Problem:**

```typescript
// BAD - Property 'user' does not exist on type 'Request'
const userId = req.user.id
```

**The Fix:**

```typescript
// Step 1: Extend Express types (see modules.md)
declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

// Step 2: Add guard in code
if (!req.user) {
  throw new AppError('Unauthorized', 401)
}
const userId = req.user.id // Now safe
```

---

## Runtime vs Compile Errors

### Compile-Time Safety

TypeScript catches these at build time:

```typescript
// Caught at compile time
const status: TransactionStatus = 'INVALID' // Error!
transaction.nonExistent // Error!
function add(a: number, b: number) { return a + b }
add('1', '2') // Error!
```

### Runtime Validation Required

These need runtime checks (Zod, type guards):

```typescript
// API input - always validate at runtime
const body = req.body // type is any or unknown
const validated = createTransactionSchema.parse(body)

// External data - never trust types
const apiResponse = await fetch('/api/data').then(r => r.json())
const data = responseSchema.parse(apiResponse)

// URL params - always strings
const id = req.params.id // type is string, but could be anything
if (!isValidUUID(id)) throw new AppError('Invalid ID', 400)
```

---

## Error Resolution Patterns

### Workflow: Fixing Type Errors

Copy this checklist:

1. Read the error message carefully—TypeScript errors are descriptive
2. Check if it's a null/undefined issue → add guards or optional chaining
3. Check if it's a type mismatch → validate or narrow the type
4. Check if it's a missing property → extend types or add to interface
5. Run `pnpm type-check` to verify fix
6. If error persists, check tsconfig.json settings

### Using @ts-expect-error

```typescript
// GOOD - Document why the error is expected
// @ts-expect-error Testing error handling with invalid input
const result = processTransaction({ invalid: 'data' })

// BAD - Never use @ts-ignore (hides errors silently)
// @ts-ignore
const result = processTransaction({ invalid: 'data' })
```

### Type Assertions (Use Sparingly)

```typescript
// ACCEPTABLE - When you know better than the compiler
const canvas = document.getElementById('canvas') as HTMLCanvasElement

// DANGEROUS - Lying to the compiler
const data = response as Transaction[] // No runtime validation!

// SAFER - Assert after validation
const data = transactionArraySchema.parse(response) as Transaction[]
```

---

## Anti-Pattern: any Type

### WARNING: Using any Defeats Type Safety

**The Problem:**

```typescript
// BAD - any propagates and disables all type checking
function processData(data: any) {
  return data.map((item: any) => item.value) // No type safety
}
```

**Why This Breaks:**
1. No autocomplete or IntelliSense
2. No compile-time error detection
3. Bugs only surface at runtime
4. Spreads to connected code

**The Fix:**

```typescript
// GOOD - Use unknown for truly unknown types
function processData(data: unknown): number[] {
  if (!Array.isArray(data)) throw new Error('Expected array')
  return data.map(item => {
    if (typeof item !== 'object' || !item || !('value' in item)) {
      throw new Error('Invalid item')
    }
    return Number(item.value)
  })
}

// BETTER - Use Zod schema (see zod skill)
const schema = z.array(z.object({ value: z.number() }))
function processData(data: unknown) {
  return schema.parse(data).map(item => item.value)
}