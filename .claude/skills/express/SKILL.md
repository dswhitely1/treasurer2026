---
name: express
description: |
  Builds Express REST API server with middleware, routing, and request handling.
  Use when: creating API endpoints, adding middleware, implementing authentication,
  handling errors, or working with request/response patterns in treasurer-api.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Express Skill

This project uses Express 4.x with TypeScript for the backend REST API. The architecture follows a layered pattern: Routes → Middleware → Controllers → Services → Prisma. All routes use Zod schemas for validation at the API boundary.

## Quick Start

### Route with Middleware Chain

```typescript
// src/routes/transactions.ts
router.patch(
  '/:transactionId',
  validate({ params: transactionIdParamSchema, body: updateTransactionSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  preventReconciledModification(),
  update
)
```

### Controller Pattern

```typescript
// src/controllers/transactionController.ts
export const create: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as CreateTransactionDto
    const transaction = await createTransaction(req.params.orgId, req.params.accountId, data)
    sendSuccess(res, { transaction }, 'Transaction created successfully', 201)
  } catch (error) {
    next(error)
  }
}
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| Middleware chain | Compose validation, auth, authz | `validate() → authenticate → requireOrgRole()` |
| Error handling | Throw AppError, caught by errorHandler | `throw new AppError('Not found', 404)` |
| Type augmentation | Extend Request with custom data | `req.user`, `req.orgMembership` |
| Response helpers | Consistent JSON structure | `sendSuccess(res, data, message, 201)` |
| Validation | Zod schemas at API boundary | `validate({ body: createSchema })` |

## Common Patterns

### Throwing Errors

```typescript
import { AppError } from '../middleware/errorHandler.js'

throw new AppError('Account not found', 404)
throw new AppError('Invalid status transition', 400)
throw new AppError('Insufficient permissions', 403)
```

### Accessing Authenticated User

```typescript
// req.user is set by authenticate middleware
const userId = req.user?.id
if (!req.user) throw new AppError('Authentication required', 401)
```

### Database Transactions in Services

```typescript
const result = await prisma.$transaction(async (tx) => {
  await tx.transaction.update({ where: { id }, data })
  return tx.transactionStatusHistory.create({ data: historyData })
})
```

## See Also

- [routes](references/routes.md) - Route patterns and middleware composition
- [services](references/services.md) - Service layer and business logic
- [database](references/database.md) - Prisma integration and transactions
- [auth](references/auth.md) - JWT authentication and authorization
- [errors](references/errors.md) - Error handling patterns

## Related Skills

- See the **typescript** skill for type patterns
- See the **prisma** skill for database operations
- See the **zod** skill for validation schemas
- See the **vitest** skill for testing API endpoints

## Documentation Resources

> Fetch latest Express documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "express"
2. Prefer website documentation (`/websites/expressjs_en`) over source code
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/websites/expressjs_en`

**Recommended Queries:**
- "Middleware patterns and error handling"
- "Router mounting and nested routes"
- "Async route handler best practices"