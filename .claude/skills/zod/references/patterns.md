# Zod Patterns Reference

## Contents
- Schema Composition
- Cross-Field Validation with Refine
- Query Parameter Coercion
- Error Message Customization
- Type Inference Patterns
- Anti-Patterns

---

## Schema Composition

### Separate Create and Update Schemas

Create schemas require fields; update schemas make them optional.

```typescript
// treasurer-api/src/schemas/vendor.ts
export const createVendorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
})

export const updateVendorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
})
```

### Reusable Enum Schemas

Define enums once, import everywhere.

```typescript
// treasurer-api/src/schemas/transaction.ts
export const transactionTypeEnum = z.enum(['INCOME', 'EXPENSE', 'TRANSFER'])
export const transactionStatusEnum = z.enum(['UNCLEARED', 'CLEARED', 'RECONCILED'])

// Reuse in other schemas
export const transactionQuerySchema = z.object({
  type: transactionTypeEnum.optional(),
  status: transactionStatusEnum.optional(),
  statuses: z.array(transactionStatusEnum).optional(),
})
```

---

## Cross-Field Validation with Refine

### Validate Related Fields

Use `.refine()` for business rules that span multiple fields.

```typescript
// treasurer-api/src/schemas/transaction.ts
export const createTransactionSchema = z
  .object({
    amount: z.number().positive('Amount must be positive'),
    transactionType: transactionTypeEnum.optional().default('EXPENSE'),
    destinationAccountId: z.string().uuid().optional(),
    splits: z.array(transactionSplitSchema).min(1),
  })
  .refine(
    (data) => {
      const splitsTotal = data.splits.reduce((sum, split) => sum + split.amount, 0)
      return Math.abs(splitsTotal - data.amount) < 0.01
    },
    {
      message: 'Split amounts must equal the transaction amount',
      path: ['splits'],
    }
  )
  .refine(
    (data) => {
      if (data.transactionType === 'TRANSFER') return !!data.destinationAccountId
      return true
    },
    {
      message: 'Destination account is required for transfer transactions',
      path: ['destinationAccountId'],
    }
  )
```

### Password Confirmation Pattern

```typescript
const passwordForm = z
  .object({
    password: z.string().min(8),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don't match",
    path: ['confirm'],
  })
```

---

## Query Parameter Coercion

Query strings are always strings. Use `z.coerce` to parse them.

```typescript
// treasurer-api/src/schemas/transaction.ts
export const transactionQuerySchema = z.object({
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
})
```

### WARNING: Missing Coerce for Query Params

**The Problem:**

```typescript
// BAD - Query params are strings, this always fails
const schema = z.object({
  page: z.number().int().positive(),
})
schema.parse({ page: '1' }) // ZodError: expected number, received string
```

**Why This Breaks:**
1. Express parses query strings as `string | string[]`, never as `number`
2. The schema fails for every request with pagination
3. Users see confusing "expected number" errors

**The Fix:**

```typescript
// GOOD - Use z.coerce for query parameters
const schema = z.object({
  page: z.coerce.number().int().positive(),
})
schema.parse({ page: '1' }) // { page: 1 }
```

---

## Error Message Customization

### Per-Validation Messages

```typescript
// treasurer-api/src/schemas/auth.ts
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(1).max(100).optional(),
})
```

### Schema-Level Error Messages

```typescript
const name = z.string({
  required_error: 'Name is required',
  invalid_type_error: 'Name must be a string',
})
```

---

## Type Inference Patterns

### Export Type Alongside Schema

```typescript
export const createAccountSchema = z.object({ /* ... */ })
export type CreateAccountDto = z.infer<typeof createAccountSchema>
```

### Infer From Enum

```typescript
export const accountTypeEnum = z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD'])
export type AccountType = z.infer<typeof accountTypeEnum>
// Type is: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD'
```

---

## Anti-Patterns

### WARNING: Duplicating Validation Logic

**The Problem:**

```typescript
// BAD - Validation logic duplicated between frontend and backend
// Frontend
const emailSchema = z.string().email().min(5)
// Backend (different file)
const emailSchema = z.string().email().min(6) // Different min length!
```

**Why This Breaks:**
1. Frontend passes validation, backend rejects
2. Inconsistent user experience
3. Maintenance nightmare when rules change

**The Fix:**

Keep schemas in sync. This project has:
- Backend: `treasurer-api/src/schemas/auth.ts`
- Frontend: `treasurer/src/lib/validations/auth.ts`

When updating password rules, update BOTH files.

---

### WARNING: Using .parse() Without Try-Catch

**The Problem:**

```typescript
// BAD - Unhandled exception crashes the server
app.post('/users', (req, res) => {
  const data = userSchema.parse(req.body) // Throws if invalid
  // ...
})
```

**Why This Breaks:**
1. ZodError is thrown, not caught
2. Express default error handler returns HTML 500
3. No structured error response for clients

**The Fix:**

Use validation middleware (this project's pattern):

```typescript
// treasurer-api/src/middleware/validate.ts
export const validate = (schemas: ValidationSchemas): RequestHandler => {
  return (req, _res, next) => {
    if (schemas.body) req.body = schemas.body.parse(req.body)
    if (schemas.query) req.query = schemas.query.parse(req.query)
    if (schemas.params) req.params = schemas.params.parse(req.params)
    next()
  }
}
```

Combined with error handler:

```typescript
// treasurer-api/src/middleware/errorHandler.ts
if (err instanceof ZodError) {
  const errors: Record<string, string[]> = {}
  for (const issue of err.issues) {
    const path = issue.path.join('.')
    if (!errors[path]) errors[path] = []
    errors[path].push(issue.message)
  }
  sendError(res, 'Validation failed', 400, errors)
  return
}
```

---

### WARNING: Nullable vs Optional Confusion

**The Problem:**

```typescript
// BAD - Mixing nullable and optional incorrectly
const schema = z.object({
  bio: z.string().optional(), // undefined allowed, null NOT allowed
})
schema.parse({ bio: null }) // ZodError!
```

**Why This Breaks:**
1. API clients send `null` for empty fields
2. Database returns `null` for nullable columns
3. Schema rejects valid data

**The Fix:**

```typescript
// GOOD - Allow both null and undefined
const schema = z.object({
  bio: z.string().nullable().optional(), // null or undefined or string
})

// Or for updates where you want to clear a field
const updateSchema = z.object({
  vendorId: z.string().uuid().nullable().optional(), // Can set to null to clear
})