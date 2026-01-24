# Routes Reference

## Contents
- Route File Structure
- Middleware Composition
- Nested Routes with mergeParams
- Parameter Validation
- Anti-Patterns

## Route File Structure

Routes define HTTP endpoints and compose middleware chains. Each route file exports a router.

```typescript
// src/routes/transactions.ts
import { Router, type Router as RouterType } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requireOrgRole } from '../middleware/organization.js'
import { validate } from '../middleware/validate.js'
import { create, list, update, remove } from '../controllers/transactionController.js'

const router: RouterType = Router({ mergeParams: true })

// Apply auth to all routes in this router
router.use(authenticate)

router.post('/', validate({ body: createTransactionSchema }), requireOrgRole('OWNER', 'ADMIN'), create)
router.get('/', validate({ query: transactionQuerySchema }), requireOrgMembership(), list)
router.patch('/:transactionId', validate({ params: transactionIdParamSchema, body: updateTransactionSchema }), requireOrgRole('OWNER', 'ADMIN'), update)
```

## Middleware Composition

Middleware executes left-to-right. Order matters critically.

```typescript
// CORRECT: validate → auth → authz → business rule → controller
router.patch(
  '/:transactionId',
  validate({ params: transactionIdParamSchema, body: updateTransactionSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  preventReconciledModification(),
  update
)
```

### Middleware Order Rules

1. **Validation first** - Reject malformed requests before auth
2. **Authentication** - Verify JWT, attach `req.user`
3. **Authorization** - Check org membership/role
4. **Business rules** - Domain-specific guards (e.g., prevent editing reconciled)
5. **Controller** - Handle request

### WARNING: Wrong Middleware Order

**The Problem:**

```typescript
// BAD - Authorization before authentication
router.patch('/:id', requireOrgRole('ADMIN'), authenticate, update)
```

**Why This Breaks:**
- `requireOrgRole` checks `req.user` which doesn't exist yet
- Request fails with confusing "Authentication required" from wrong middleware
- Security logic becomes unpredictable

**The Fix:**

```typescript
// GOOD - Auth before authz
router.patch('/:id', authenticate, requireOrgRole('ADMIN'), update)
```

## Nested Routes with mergeParams

Use `mergeParams: true` for nested resource routes to access parent params.

```typescript
// src/routes/organizations.ts
const router = Router()
router.use(authenticate)
router.use('/:orgId/accounts', accountRouter)  // Mount nested router

// src/routes/accounts.ts
const router = Router({ mergeParams: true })  // Access :orgId from parent

router.get('/', async (req, res) => {
  const { orgId } = req.params  // Available from parent route
  // ...
})
```

## Parameter Validation

Validate params, query, and body with Zod schemas. See the **zod** skill.

```typescript
// src/schemas/transaction.ts
export const transactionIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
  accountId: z.string().uuid('Invalid account ID'),
  transactionId: z.string().uuid('Invalid transaction ID'),
})

// Route usage
router.get('/:transactionId', validate({ params: transactionIdParamSchema }), get)
```

## Export Route (Special Endpoint)

For endpoints that need different content types:

```typescript
router.get(
  '/export',
  validate({ params: accountTransactionParamSchema, query: exportQuerySchema }),
  requireOrgMembership(),
  exportTransactions  // Controller sets Content-Type for Excel file
)
```

## Anti-Patterns

### WARNING: Business Logic in Routes

**The Problem:**

```typescript
// BAD - Logic in route file
router.post('/', authenticate, async (req, res) => {
  const existing = await prisma.transaction.findFirst({ where: { id: req.body.id } })
  if (existing) throw new AppError('Duplicate', 409)
  const tx = await prisma.transaction.create({ data: req.body })
  res.json(tx)
})
```

**Why This Breaks:**
- Can't unit test business logic without HTTP layer
- Duplicate validation scattered across routes
- Violates separation of concerns

**The Fix:**

```typescript
// GOOD - Delegate to service
router.post('/', authenticate, create)

// Controller calls service
const result = await createTransaction(orgId, accountId, data)
```

### WARNING: Missing Validation

**The Problem:**

```typescript
// BAD - Trusting user input
router.post('/', authenticate, async (req, res) => {
  await prisma.transaction.create({ data: req.body })  // No validation!
})
```

**Why This Breaks:**
- SQL injection via Prisma is unlikely, but schema violations crash the app
- Invalid data corrupts the database
- No type safety for `req.body`

**The Fix:**

```typescript
// GOOD - Validate before controller
router.post('/', validate({ body: createTransactionSchema }), authenticate, create)