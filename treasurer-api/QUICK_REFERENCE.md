# Database Quick Reference Guide

## New Models & Fields

### Vendor Model (NEW)
```typescript
vendor: {
  id: string
  name: string
  description?: string
  organizationId: string
  createdAt: Date
  updatedAt: Date
}
```

### Category Model (ENHANCED)
```typescript
category: {
  id: string
  name: string
  parentId?: string        // NEW - Parent category
  depth: number            // NEW - Hierarchy level (0 = root)
  path?: string            // NEW - Materialized path
  isActive: boolean        // NEW - Soft delete
  organizationId: string
  createdAt: Date
  updatedAt: Date
}
```

### Transaction Model (UPDATED)
```typescript
transaction: {
  id: string
  memo: string             // RENAMED from 'description'
  amount: Decimal
  vendorId?: string        // NEW - Vendor reference
  // ... other fields unchanged
}
```

## Common Queries

### Vendor Autocomplete
```typescript
// Fuzzy search for vendors
const vendors = await prisma.$queryRaw<Array<{id: string, name: string, score: number}>>`
  SELECT id, name, similarity(name, ${searchTerm}) as score
  FROM vendors
  WHERE organization_id = ${orgId}
    AND name % ${searchTerm}
  ORDER BY score DESC
  LIMIT 10
`;
```

### Category Hierarchy

```typescript
// Get root categories
const roots = await prisma.category.findMany({
  where: {
    organizationId: orgId,
    parentId: null,
    isActive: true
  }
});

// Get category with children
const tree = await prisma.category.findUnique({
  where: { id: categoryId },
  include: {
    children: {
      where: { isActive: true },
      include: { children: true }
    }
  }
});

// Get all ancestors
const ancestors = await prisma.category.findMany({
  where: {
    id: { in: category.path?.split('/') || [] }
  }
});
```

### Transaction with Vendor

```typescript
// Create transaction with vendor
const transaction = await prisma.transaction.create({
  data: {
    memo: 'Grocery shopping',
    amount: 125.50,
    transactionType: 'EXPENSE',
    accountId: accountId,
    vendorId: vendorId,
    date: new Date()
  },
  include: {
    vendor: true,
    splits: {
      include: {
        category: {
          include: { parent: true }
        }
      }
    }
  }
});

// Get transactions by vendor
const txns = await prisma.transaction.findMany({
  where: { vendorId: vendorId },
  include: { vendor: true },
  orderBy: { date: 'desc' }
});
```

## Field Mapping

### Transaction Field Changes
| Old Field | New Field | Migration |
|-----------|-----------|-----------|
| `description` | `memo` | Auto-renamed, data preserved |
| N/A | `vendorId` | New field, nullable |

### Category New Fields
| Field | Default | Description |
|-------|---------|-------------|
| `parentId` | `NULL` | Parent category ID (NULL = root) |
| `depth` | `0` | Hierarchy level |
| `path` | `NULL` | Materialized path for subtree queries |
| `isActive` | `true` | Soft delete flag |

## Index Usage

### Fast Queries (Indexed)

✅ Vendor autocomplete by name (trigram)
✅ Find vendor by organization + name (composite unique)
✅ Get category children (parent_id)
✅ Get root categories (organization_id + parent_id)
✅ Get transaction by vendor (vendor_id)
✅ Category subtree queries (path)

### Slow Queries (Not Indexed)

❌ Vendor search by description
❌ Category search by arbitrary path pattern
❌ Transaction search by memo content (use full-text search if needed)

## Constraints to Remember

### Unique Constraints
- `(organizationId, name)` on vendors - No duplicate vendor names per org
- `(organizationId, name)` on categories - No duplicate category names per org

### Foreign Key Behaviors
- Delete organization → Deletes all vendors (CASCADE)
- Delete vendor → Preserves transactions, sets vendor_id to NULL (SET NULL)
- Delete category with children → **BLOCKED** (RESTRICT)
- Delete account → Deletes all transactions (CASCADE)

## Best Practices

### Vendors
```typescript
// ✅ DO: Check for similar vendors before creating
const similar = await prisma.$queryRaw`
  SELECT id, name FROM vendors
  WHERE organization_id = ${orgId}
    AND similarity(name, ${newName}) > 0.8
`;

// ✅ DO: Create vendor and transaction together
const result = await prisma.$transaction(async (tx) => {
  const vendor = await tx.vendor.create({ data: {...} });
  const transaction = await tx.transaction.create({
    data: { vendorId: vendor.id, ... }
  });
  return { vendor, transaction };
});
```

### Categories
```typescript
// ✅ DO: Update path when moving categories
await prisma.category.update({
  where: { id: categoryId },
  data: {
    parentId: newParentId,
    depth: parentDepth + 1,
    path: `${parentPath}/${newParentId}`
  }
});

// ✅ DO: Soft delete instead of hard delete
await prisma.category.update({
  where: { id: categoryId },
  data: { isActive: false }
});

// ❌ DON'T: Create circular references
// Always validate parentId doesn't create a cycle
```

### Transactions
```typescript
// ✅ DO: Use memo instead of description
const txn = await prisma.transaction.create({
  data: {
    memo: 'Payment to vendor',  // NOT 'description'
    vendorId: vendorId,
    // ...
  }
});

// ✅ DO: Handle nullable vendor gracefully
const vendor = transaction.vendor?.name || 'No vendor';
```

## Migration Commands

```bash
# Check status
npx prisma migrate status

# Apply migrations
npx prisma migrate deploy

# Reset database (DEV ONLY)
npx prisma migrate reset

# Generate client
npx prisma generate

# Open studio
npx prisma studio
```

## Troubleshooting

### "Column 'description' not found"
**Cause**: Using old field name
**Fix**: Use `memo` instead of `description`

### "Cannot delete category"
**Cause**: Category has children (RESTRICT constraint)
**Fix**: Delete children first or use soft delete (`isActive = false`)

### "Vendor autocomplete not working"
**Cause**: pg_trgm extension not enabled
**Fix**: Run `CREATE EXTENSION IF NOT EXISTS pg_trgm;`

### "Category depth validation failed"
**Cause**: No application-level depth check
**Fix**: Add validation in service layer:
```typescript
if (depth >= MAX_DEPTH) {
  throw new Error('Maximum category depth exceeded');
}
```

## Environment Setup

Required in `.env`:
```env
DATABASE_URL="postgresql://treasurer:treasurer@localhost:5432/treasurer_db?schema=public"
```

PostgreSQL extensions required:
- `pg_trgm` (for vendor fuzzy search)

## Performance Tips

1. **Vendor autocomplete**: Debounce input (300ms) and require 2+ characters
2. **Category tree**: Load incrementally, not all at once
3. **Transaction lists**: Always include pagination and date filters
4. **Use indexes**: Check query plans with `EXPLAIN ANALYZE`
5. **Batch operations**: Use `prisma.$transaction()` for multiple writes

## Testing

Run verification:
```bash
node test-db-schema.js
```

Expected output:
```
✅ All tests passed!
- Vendor model: ✓
- Category hierarchy: ✓
- Transaction memo field: ✓
- Transaction vendor relation: ✓
- Trigram fuzzy search: ✓
```

## Documentation

- **MIGRATION_GUIDE.md**: Detailed migration process
- **DATABASE_SCHEMA.md**: Complete schema reference
- **IMPLEMENTATION_SUMMARY.md**: Implementation overview
- **QUICK_REFERENCE.md**: This file

## Support

Questions? Check:
1. Schema: `prisma/schema.prisma`
2. Migrations: `prisma/migrations/*/migration.sql`
3. Tests: `test-db-schema.js`
4. Docs: `DATABASE_SCHEMA.md`
