# Transaction Audit Trail Migration

**Migration**: `20260118230000_add_transaction_audit_fields`
**Date**: 2026-01-18
**Purpose**: Add comprehensive audit trail functionality for transaction edits

## Overview

This migration adds audit trail capabilities to the transaction system, enabling:
- Tracking who created, modified, and deleted transactions
- Recording detailed edit history with change diffs
- Supporting soft deletes with restoration capability
- Version control for optimistic locking
- Detailed change logging in JSONB format

## Schema Changes

### New Enum: EditType

```sql
CREATE TYPE "EditType" AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE',
  'RESTORE',
  'SPLIT_CHANGE'
);
```

### Transaction Table Updates

Added audit fields to `transactions`:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `created_by_id` | TEXT | Yes | NULL | User who created the transaction |
| `last_modified_by_id` | TEXT | Yes | NULL | User who last modified the transaction |
| `version` | INTEGER | No | 1 | Version number for optimistic locking |
| `deleted_at` | TIMESTAMP(3) | Yes | NULL | Soft delete timestamp |
| `deleted_by_id` | TEXT | Yes | NULL | User who deleted the transaction |

**Foreign Keys**:
- `created_by_id` → `users(id)` ON DELETE SET NULL
- `last_modified_by_id` → `users(id)` ON DELETE SET NULL
- `deleted_by_id` → `users(id)` ON DELETE SET NULL

**Indexes**:
- `transactions_created_by_id_idx`
- `transactions_last_modified_by_id_idx`
- `transactions_deleted_at_idx`
- `transactions_deleted_by_id_idx`

### New Table: transaction_edit_history

Comprehensive audit log for all transaction changes:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | TEXT | No | - | Primary key |
| `transaction_id` | TEXT | No | - | Reference to transaction |
| `edited_by_id` | TEXT | No | - | User who made the edit |
| `edited_at` | TIMESTAMP(3) | No | CURRENT_TIMESTAMP | When the edit occurred |
| `edit_type` | EditType | No | - | Type of edit operation |
| `changes` | JSONB | No | - | JSON diff of changes |
| `previous_state` | JSONB | Yes | NULL | Optional full snapshot before change |

**Foreign Keys**:
- `transaction_id` → `transactions(id)` ON DELETE CASCADE
- `edited_by_id` → `users(id)` ON DELETE SET NULL

**Indexes**:
- `transaction_edit_history_transaction_id_idx` - Fast lookup by transaction
- `transaction_edit_history_edited_by_id_idx` - Fast lookup by user
- `transaction_edit_history_edited_at_idx` - Time-based queries
- `transaction_edit_history_edit_type_idx` - Filter by edit type
- `transaction_edit_history_transaction_id_edited_at_idx` - Composite for chronological history

## Use Cases

### 1. Audit Trail
Track complete history of who changed what and when:
```sql
SELECT * FROM transaction_edit_history
WHERE transaction_id = 'xxx'
ORDER BY edited_at DESC;
```

### 2. Soft Deletes
Find active (non-deleted) transactions:
```sql
SELECT * FROM transactions
WHERE deleted_at IS NULL;
```

### 3. Restore Deleted Transactions
```sql
UPDATE transactions
SET deleted_at = NULL,
    deleted_by_id = NULL,
    last_modified_by_id = 'user_id',
    version = version + 1
WHERE id = 'xxx';
```

### 4. Optimistic Locking
Prevent concurrent update conflicts:
```sql
UPDATE transactions
SET amount = 100.00,
    version = version + 1,
    last_modified_by_id = 'user_id'
WHERE id = 'xxx' AND version = 1;
```

### 5. Change History Analysis
Review what changed in a specific edit:
```sql
SELECT
  edited_at,
  edit_type,
  changes,
  u.name as edited_by_name
FROM transaction_edit_history teh
JOIN users u ON u.id = teh.edited_by_id
WHERE transaction_id = 'xxx'
ORDER BY edited_at DESC;
```

## Breaking Changes

None - all new fields are nullable or have defaults, ensuring backward compatibility.

## Migration Steps

1. Creates `EditType` enum with 5 values
2. Adds 5 new columns to `transactions` table (all nullable except `version`)
3. Creates `transaction_edit_history` table with JSONB support
4. Adds 4 indexes to `transactions` table
5. Adds 5 indexes to `transaction_edit_history` table
6. Creates 3 foreign key constraints from `transactions` to `users`
7. Creates 2 foreign key constraints from `transaction_edit_history`

## Rollback

To rollback this migration, run the `rollback.sql` script:

```bash
psql -U treasurer -d treasurer_db -f rollback.sql
```

**WARNING**: Rolling back will permanently delete all audit trail data!

## Performance Considerations

- **JSONB Storage**: The `changes` and `previous_state` columns use JSONB for efficient storage and querying
- **Indexes**: Comprehensive indexes ensure fast queries for common audit patterns
- **ON DELETE behaviors**:
  - User deletions set foreign keys to NULL (preserves audit trail)
  - Transaction deletions cascade to edit history (maintains referential integrity)
- **Soft Deletes**: Use `deleted_at IS NULL` in WHERE clauses for active records

## Application Integration

### Creating Transactions
```typescript
await prisma.transaction.create({
  data: {
    // ... transaction data
    createdById: userId,
    lastModifiedById: userId,
    version: 1
  }
});
```

### Updating Transactions
```typescript
await prisma.transaction.update({
  where: { id, version },
  data: {
    // ... updated fields
    lastModifiedById: userId,
    version: { increment: 1 }
  }
});

// Log the edit
await prisma.transactionEditHistory.create({
  data: {
    transactionId: id,
    editedById: userId,
    editType: 'UPDATE',
    changes: { /* diff object */ }
  }
});
```

### Soft Delete
```typescript
await prisma.transaction.update({
  where: { id },
  data: {
    deletedAt: new Date(),
    deletedById: userId,
    lastModifiedById: userId,
    version: { increment: 1 }
  }
});

// Log the deletion
await prisma.transactionEditHistory.create({
  data: {
    transactionId: id,
    editedById: userId,
    editType: 'DELETE',
    changes: { deletedAt: new Date() }
  }
});
```

## Testing Recommendations

1. Test optimistic locking with concurrent updates
2. Verify soft delete and restore functionality
3. Ensure edit history is created for all modifications
4. Test JSONB query performance with large datasets
5. Validate foreign key cascade behaviors
6. Test audit trail queries with various filters

## Related Files

- Schema: `prisma/schema.prisma`
- Migration: `prisma/migrations/20260118230000_add_transaction_audit_fields/migration.sql`
- Rollback: `prisma/migrations/20260118230000_add_transaction_audit_fields/rollback.sql`
