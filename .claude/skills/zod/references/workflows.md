# Zod Workflows Reference

## Contents
- Adding a New API Schema
- Frontend Form Integration
- Testing Schemas
- Environment Variable Validation
- Error Handling Integration

---

## Adding a New API Schema

### Workflow Checklist

Copy this checklist and track progress:
- [ ] Step 1: Create schema file in `treasurer-api/src/schemas/`
- [ ] Step 2: Define create/update/param schemas
- [ ] Step 3: Export DTOs with `z.infer<>`
- [ ] Step 4: Add validation middleware to route
- [ ] Step 5: Write schema tests

### Step-by-Step Example

**1. Create the schema file:**

```typescript
// treasurer-api/src/schemas/newEntity.ts
import { z } from 'zod'

export const createNewEntitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  value: z.number().positive(),
})

export const updateNewEntitySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  value: z.number().positive().optional(),
})

export const newEntityIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
  entityId: z.string().uuid('Invalid entity ID'),
})

export type CreateNewEntityDto = z.infer<typeof createNewEntitySchema>
export type UpdateNewEntityDto = z.infer<typeof updateNewEntitySchema>
```

**2. Add to route with validation middleware:**

```typescript
// treasurer-api/src/routes/newEntity.ts
import { validate } from '@/middleware/validate.js'
import { createNewEntitySchema, newEntityIdParamSchema } from '@/schemas/newEntity.js'

router.post(
  '/',
  authenticate,
  requireOrgRole('OWNER', 'ADMIN'),
  validate({ params: orgIdParamSchema, body: createNewEntitySchema }),
  create
)

router.patch(
  '/:entityId',
  authenticate,
  requireOrgRole('OWNER', 'ADMIN'),
  validate({ params: newEntityIdParamSchema, body: updateNewEntitySchema }),
  update
)
```

---

## Frontend Form Integration

### With react-hook-form

```typescript
// treasurer/src/lib/validations/newEntity.ts
import { z } from 'zod'

export const newEntitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  value: z.number().positive('Value must be positive'),
})

export type NewEntityInput = z.infer<typeof newEntitySchema>
```

```typescript
// treasurer/src/pages/NewEntityPage.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { newEntitySchema, type NewEntityInput } from '@/lib/validations/newEntity'

function NewEntityForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewEntityInput>({
    resolver: zodResolver(newEntitySchema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...register('name')}
        error={!!errors.name}
        errorMessage={errors.name?.message}
      />
      <Input
        type="number"
        {...register('value', { valueAsNumber: true })}
        error={!!errors.value}
        errorMessage={errors.value?.message}
      />
    </form>
  )
}
```

### Validation Feedback Loop

1. User submits form
2. Validate: `zodResolver` runs schema
3. If validation fails, display `errors.field.message` under each field
4. User fixes errors and resubmits
5. Only proceed when validation passes

---

## Testing Schemas

### Unit Test Pattern

```typescript
// treasurer-api/src/schemas/__tests__/transaction.test.ts
import { describe, it, expect } from 'vitest'
import { createTransactionSchema } from '../transaction'

describe('createTransactionSchema', () => {
  it('accepts valid transaction', () => {
    const result = createTransactionSchema.safeParse({
      amount: 100,
      splits: [{ amount: 100, categoryName: 'Food' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects when splits do not equal amount', () => {
    const result = createTransactionSchema.safeParse({
      amount: 100,
      splits: [{ amount: 50, categoryName: 'Food' }],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('splits')
    }
  })

  it('requires destination account for transfers', () => {
    const result = createTransactionSchema.safeParse({
      amount: 100,
      transactionType: 'TRANSFER',
      splits: [{ amount: 100, categoryName: 'Transfer' }],
    })
    expect(result.success).toBe(false)
  })
})
```

### Testing Coercion

```typescript
describe('transactionQuerySchema', () => {
  it('coerces string limit to number', () => {
    const result = transactionQuerySchema.parse({ limit: '25' })
    expect(result.limit).toBe(25)
    expect(typeof result.limit).toBe('number')
  })

  it('applies defaults', () => {
    const result = transactionQuerySchema.parse({})
    expect(result.limit).toBe(50)
    expect(result.offset).toBe(0)
  })
})
```

---

## Environment Variable Validation

### Pattern: Fail Fast on Startup

```typescript
// treasurer-api/src/config/env.ts
import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
```

**Why `.safeParse()` here:**
- Never throws; returns result object
- Allows structured logging of all errors before exit
- Use `.flatten().fieldErrors` for readable output

---

## Error Handling Integration

### Centralized ZodError Handling

```typescript
// treasurer-api/src/middleware/errorHandler.ts
import { ZodError } from 'zod'

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
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
  // ... other error handlers
}
```

### Response Format

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["Invalid email address"],
    "password": ["Password must be at least 8 characters"],
    "splits": ["Split amounts must equal the transaction amount"]
  }
}
```

---

## Common Workflow: Adding Password Validation

### Checklist

- [ ] Update backend schema: `treasurer-api/src/schemas/auth.ts`
- [ ] Update frontend schema: `treasurer/src/lib/validations/auth.ts`
- [ ] Add/update tests for new rules
- [ ] Test both frontend and backend validation

### Example: Adding Password Strength

```typescript
// Both files should match
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'), // New rule
  name: z.string().max(100).optional(),
})