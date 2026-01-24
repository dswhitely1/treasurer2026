---
name: prisma
description: |
  Manages Prisma ORM for type-safe database access and migrations.
  Use when: writing database queries, creating/running migrations, adding indexes, debugging database issues, or working with the Prisma schema.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Prisma Skill

Prisma provides type-safe database access for Treasurer's PostgreSQL database. The schema defines multi-tenant financial entities (Organizations, Accounts, Transactions) with audit trails and hierarchical categories. All queries flow through the service layer, never directly from controllers.

## Quick Start

### Database Client Singleton

```typescript
// treasurer-api/src/config/database.ts
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
})
```

### Basic Query Pattern

```typescript
// Service layer query with organization scoping
const accounts = await prisma.account.findMany({
  where: { 
    organizationId,
    isActive: true,
  },
  orderBy: { name: 'asc' },
})
```

### Transaction with Audit Trail

```typescript
const result = await prisma.$transaction(async (tx) => {
  const updated = await tx.transaction.update({
    where: { id: transactionId },
    data: { status: 'CLEARED', clearedAt: new Date() },
  })
  
  await tx.transactionStatusHistory.create({
    data: {
      transactionId,
      fromStatus: 'UNCLEARED',
      toStatus: 'CLEARED',
      changedById: userId,
    },
  })
  
  return updated
})
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| Multi-tenancy | All data scoped to organization | `where: { organizationId }` |
| Decimal fields | Financial precision (19,4) | `@db.Decimal(19, 4)` |
| Soft delete | `isActive` flag or `deletedAt` | `where: { isActive: true }` |
| Audit trails | History tables for changes | `TransactionStatusHistory` |
| Composite indexes | Performance optimization | `@@index([accountId, status, date])` |

## Common Commands

```bash
pnpm db:generate    # Generate Prisma client after schema changes
pnpm db:migrate     # Run pending migrations
pnpm db:push        # Push schema directly (dev only)
pnpm db:studio      # Open Prisma Studio GUI
```

## See Also

- [patterns](references/patterns.md) - Query patterns, relations, transactions
- [workflows](references/workflows.md) - Migrations, schema changes, testing

## Related Skills

- See the **postgresql** skill for database design and indexing strategies
- See the **typescript** skill for type safety patterns with Prisma types
- See the **express** skill for integrating queries in the service layer
- See the **zod** skill for validating data before database operations
- See the **vitest** skill for testing database operations

## Documentation Resources

> Fetch latest Prisma documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "prisma"
2. Prefer website documentation (IDs starting with `/websites/`) over source code
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Recommended Queries:**
- "Schema modeling relations"
- "Transaction API"
- "Migration workflows"
- "Query optimization"