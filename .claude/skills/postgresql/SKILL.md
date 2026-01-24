---
name: postgresql
description: |
  Designs and optimizes PostgreSQL database schemas with Prisma ORM.
  Use when: creating database migrations, optimizing queries, designing indexes, or working with financial data types.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# PostgreSQL Skill

PostgreSQL 16 serves as the persistence layer for Treasurer's multi-tenant financial data. All database access flows through Prisma ORM, providing type-safe queries and migrations. The schema emphasizes financial accuracy with Decimal(19,4) for monetary values, UUID primary keys for security, and strategic indexing for reconciliation workflows.

## Quick Start

### Financial Decimal Precision

```prisma
// treasurer-api/prisma/schema.prisma
model Transaction {
  amount    Decimal  @db.Decimal(19, 4)  // 4 decimal places for currency
  feeAmount Decimal? @db.Decimal(19, 4)
}
```

### Multi-Tenant Data Isolation

```prisma
model Account {
  organizationId String @map("organization_id")
  
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  @@index([organizationId])  // Always index tenant foreign keys
}
```

### Composite Indexes for Common Queries

```prisma
model Transaction {
  @@index([accountId, status])           // Filter by account + status
  @@index([accountId, status, date])     // Reconciliation date ranges
  @@index([deletedAt])                   // Soft delete queries
}
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| Decimal for money | Prevents floating-point errors | `@db.Decimal(19, 4)` |
| UUID primary keys | Unpredictable, secure IDs | `@id @default(uuid())` |
| Soft deletes | Preserve audit trail | `deletedAt DateTime?` |
| Column mapping | Snake_case in DB, camelCase in code | `@map("created_at")` |
| Cascade deletes | Clean up child records | `onDelete: Cascade` |
| Composite indexes | Multi-column query optimization | `@@index([accountId, status])` |

## Common Patterns

### Hierarchical Categories with Path

**When:** Self-referencing trees with efficient ancestor queries

```prisma
model Category {
  id       String    @id @default(uuid())
  name     String
  parentId String?   @map("parent_id")
  depth    Int       @default(0)
  path     String?   // "/root/parent/child" for fast ancestor queries
  
  parent   Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children Category[] @relation("CategoryHierarchy")
  
  @@index([path])  // Enables LIKE 'path/%' queries
}
```

### Audit Trail with JSON Snapshots

**When:** Full edit history with rollback support

```prisma
model TransactionEditHistory {
  id            String   @id @default(uuid())
  transactionId String   @map("transaction_id")
  editType      EditType @map("edit_type")
  changes       Json     // Field-level changes
  previousState Json?    @map("previous_state")  // Full snapshot
  
  @@index([transactionId, editedAt])
}
```

## See Also

- [patterns](references/patterns.md) - Schema design, indexing, and query optimization
- [workflows](references/workflows.md) - Migrations, testing, and debugging

## Related Skills

- See the **prisma** skill for ORM patterns and type-safe queries
- See the **typescript** skill for type definitions matching Prisma models
- See the **vitest** skill for database testing patterns

## Documentation Resources

> Fetch latest PostgreSQL documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "postgresql"
2. **Prefer website documentation** (IDs starting with `/websites/`) over source code repositories
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/websites/postgresql.org` _(resolve using mcp__context7__resolve-library-id)_

**Recommended Queries:**
- "JSONB operators and indexing"
- "Decimal precision and rounding"
- "Index types btree gin gist"
- "Transaction isolation levels"