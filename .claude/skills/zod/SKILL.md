---
name: zod
description: |
  Defines Zod schemas for runtime validation at API boundaries.
  Use when: Creating validation schemas for forms, API requests, environment variables, or any data parsing at system boundaries.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Zod Skill

Runtime schema validation for TypeScript with full type inference. This project uses Zod at every API boundary: request validation middleware, form validation with react-hook-form, and environment variable parsing. Schemas live in `treasurer-api/src/schemas/` (backend) and `treasurer/src/lib/validations/` (frontend).

## Quick Start

### API Request Schema

```typescript
// treasurer-api/src/schemas/account.ts
import { z } from 'zod'

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  balance: z.number().optional().default(0),
  currency: z.string().length(3).optional().default('USD'),
})

export type CreateAccountDto = z.infer<typeof createAccountSchema>
```

### Form Validation with react-hook-form

```typescript
// treasurer/src/pages/LoginPage.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'

const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
  resolver: zodResolver(loginSchema),
})
```

### Environment Variable Validation

```typescript
// treasurer-api/src/config/env.ts
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}
export const env = parsed.data
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| `z.infer<T>` | Extract TypeScript type from schema | `type Dto = z.infer<typeof schema>` |
| `.refine()` | Cross-field validation | Splits must equal transaction amount |
| `.coerce` | Parse strings to numbers | Query params: `z.coerce.number()` |
| `.safeParse()` | Returns result object, never throws | Environment validation |
| `.parse()` | Throws ZodError on failure | Middleware validation |

## Common Patterns

### Enum Schemas for Database Types

```typescript
export const transactionStatusEnum = z.enum(['UNCLEARED', 'CLEARED', 'RECONCILED'])
export type TransactionStatus = z.infer<typeof transactionStatusEnum>
```

### UUID Parameter Validation

```typescript
export const accountIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
  accountId: z.string().uuid('Invalid account ID'),
})
```

### Query String Coercion

```typescript
export const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
})
```

## See Also

- [patterns](references/patterns.md) - Schema composition, refinements, error handling
- [workflows](references/workflows.md) - Adding new schemas, testing, frontend integration

## Related Skills

For form integration with React, see the **react** skill. For TypeScript type patterns, see the **typescript** skill. For Express middleware integration, see the **express** skill.

## Documentation Resources

> Fetch latest Zod documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "zod"
2. **Prefer website documentation** (IDs starting with `/websites/`) over source code repositories
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/websites/v3_zod_dev` _(Zod v3 documentation - matches this project)_

**Recommended Queries:**
- "zod refine transform custom validation"
- "zod error handling safeParse"
- "zod coercion for primitives"
- "zod object schema composition"