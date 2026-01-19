# Transaction Edit Database Schema

## Overview

This document defines the database schema changes required to support transaction editing with audit trails and optimistic locking.

## Required Schema Changes

### 1. Transaction Table Modifications

Add audit and versioning fields to the existing `Transaction` model:

```prisma
model Transaction {
  id                   String            @id @default(uuid())
  memo                 String?
  amount               Decimal           @db.Decimal(19, 4)
  transactionType      TransactionType   @default(EXPENSE) @map("transaction_type")
  date                 DateTime          @default(now())
  feeAmount            Decimal?          @db.Decimal(19, 4) @map("fee_amount")
  status               TransactionStatus @default(UNCLEARED)
  clearedAt            DateTime?         @map("cleared_at")
  reconciledAt         DateTime?         @map("reconciled_at")
  accountId            String            @map("account_id")
  destinationAccountId String?           @map("destination_account_id")
  vendorId             String?           @map("vendor_id")

  // ===== NEW AUDIT FIELDS =====
  version              Int               @default(1)
  createdById          String            @map("created_by_id")
  lastModifiedById     String?           @map("last_modified_by_id")
  // ===========================

  createdAt            DateTime          @default(now()) @map("created_at")
  updatedAt            DateTime          @updatedAt @map("updated_at")

  account            Account                    @relation("SourceTransactions", fields: [accountId], references: [id], onDelete: Cascade)
  destinationAccount Account?                   @relation("DestinationTransactions", fields: [destinationAccountId], references: [id], onDelete: SetNull)
  vendor             Vendor?                    @relation(fields: [vendorId], references: [id], onDelete: SetNull)
  splits             TransactionSplit[]
  statusHistory      TransactionStatusHistory[]

  // ===== NEW RELATIONS =====
  createdBy          User                       @relation("TransactionCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)
  lastModifiedBy     User?                      @relation("TransactionLastModifiedBy", fields: [lastModifiedById], references: [id], onDelete: SetNull)
  editHistory        TransactionEditHistory[]
  // ========================

  @@index([accountId])
  @@index([destinationAccountId])
  @@index([vendorId])
  @@index([date])
  @@index([status])
  @@index([accountId, status])
  @@index([accountId, status, date])

  // ===== NEW INDEXES =====
  @@index([version])
  @@index([createdById])
  @@index([lastModifiedById])
  // ======================

  @@map("transactions")
}
```

### 2. New TransactionEditHistory Table

Create a new table to store the audit trail of transaction edits:

```prisma
model TransactionEditHistory {
  id            String   @id @default(uuid())
  transactionId String   @map("transaction_id")
  editedById    String   @map("edited_by_id")
  editedAt      DateTime @default(now()) @map("edited_at")
  version       Int
  changes       Json     // JSONB column storing array of field changes
  metadata      Json?    // JSONB column for IP, user agent, etc.

  transaction Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  editedBy    User        @relation("TransactionEditHistory", fields: [editedById], references: [id], onDelete: Restrict)

  @@index([transactionId])
  @@index([editedById])
  @@index([editedAt])
  @@index([transactionId, editedAt])
  @@map("transaction_edit_history")
}
```

### 3. User Model Updates

Add relations to the `User` model for the new audit fields:

```prisma
model User {
  id                 String   @id @default(uuid())
  email              String   @unique
  password           String
  name               String?
  role               Role     @default(USER)
  lastOrganizationId String?  @map("last_organization_id")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  memberships            OrganizationMember[]
  statusChanges          TransactionStatusHistory[]

  // ===== NEW RELATIONS =====
  transactionsCreated      Transaction[]              @relation("TransactionCreatedBy")
  transactionsLastModified Transaction[]              @relation("TransactionLastModifiedBy")
  transactionEdits         TransactionEditHistory[]   @relation("TransactionEditHistory")
  // ========================

  @@map("users")
}
```

## Migration Script

### PostgreSQL Migration SQL

```sql
-- Add audit fields to transactions table
ALTER TABLE transactions
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN created_by_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000', -- Temporary default
  ADD COLUMN last_modified_by_id UUID;

-- Add foreign key constraints
ALTER TABLE transactions
  ADD CONSTRAINT transactions_created_by_fkey
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT transactions_last_modified_by_fkey
    FOREIGN KEY (last_modified_by_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes for audit fields
CREATE INDEX transactions_version_idx ON transactions(version);
CREATE INDEX transactions_created_by_id_idx ON transactions(created_by_id);
CREATE INDEX transactions_last_modified_by_id_idx ON transactions(last_modified_by_id);

-- Create transaction_edit_history table
CREATE TABLE transaction_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  edited_by_id UUID NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB,

  CONSTRAINT transaction_edit_history_transaction_fkey
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  CONSTRAINT transaction_edit_history_edited_by_fkey
    FOREIGN KEY (edited_by_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Add indexes for transaction_edit_history
CREATE INDEX transaction_edit_history_transaction_id_idx ON transaction_edit_history(transaction_id);
CREATE INDEX transaction_edit_history_edited_by_id_idx ON transaction_edit_history(edited_by_id);
CREATE INDEX transaction_edit_history_edited_at_idx ON transaction_edit_history(edited_at);
CREATE INDEX transaction_edit_history_transaction_edited_at_idx ON transaction_edit_history(transaction_id, edited_at);

-- Optional: GIN index for JSONB queries (if querying changes field frequently)
CREATE INDEX transaction_edit_history_changes_gin_idx ON transaction_edit_history USING GIN (changes);

-- Data migration: Set created_by_id for existing transactions
-- This is a placeholder - you'll need to determine the appropriate user ID
-- Option 1: Use the first admin user
UPDATE transactions
SET created_by_id = (SELECT id FROM users WHERE role = 'ADMIN' ORDER BY created_at LIMIT 1)
WHERE created_by_id = '00000000-0000-0000-0000-000000000000';

-- Option 2: Create a system user
INSERT INTO users (id, email, password, name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system@treasurer.internal',
  '$2a$12$SYSTEM_PLACEHOLDER_HASH',
  'System',
  'ADMIN'
) ON CONFLICT DO NOTHING;

UPDATE transactions
SET created_by_id = '00000000-0000-0000-0000-000000000001'
WHERE created_by_id = '00000000-0000-0000-0000-000000000000';

-- Create initial edit history entries for existing transactions
INSERT INTO transaction_edit_history (transaction_id, edited_by_id, edited_at, version, changes, metadata)
SELECT
  id,
  created_by_id,
  created_at,
  1,
  '[]'::jsonb,
  jsonb_build_object('action', 'CREATED', 'source', 'MIGRATION')
FROM transactions;
```

### Rollback Script

```sql
-- Drop transaction_edit_history table
DROP TABLE IF EXISTS transaction_edit_history;

-- Remove audit fields from transactions
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_created_by_fkey,
  DROP CONSTRAINT IF EXISTS transactions_last_modified_by_fkey,
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS created_by_id,
  DROP COLUMN IF EXISTS last_modified_by_id;

-- Drop indexes (automatically dropped with columns, but explicit for clarity)
DROP INDEX IF EXISTS transactions_version_idx;
DROP INDEX IF EXISTS transactions_created_by_id_idx;
DROP INDEX IF EXISTS transactions_last_modified_by_id_idx;
```

## Data Model Documentation

### Field Descriptions

#### Transaction Audit Fields

| Field | Type | Nullable | Description | Default |
|-------|------|----------|-------------|---------|
| `version` | Integer | No | Optimistic locking version number, incremented on each update | 1 |
| `createdById` | UUID | No | User ID who created the transaction | (Required) |
| `lastModifiedById` | UUID | Yes | User ID who last modified the transaction | NULL |

#### TransactionEditHistory Fields

| Field | Type | Nullable | Description | Default |
|-------|------|----------|-------------|---------|
| `id` | UUID | No | Primary key | gen_random_uuid() |
| `transactionId` | UUID | No | Foreign key to Transaction | (Required) |
| `editedById` | UUID | No | User ID who made the edit | (Required) |
| `editedAt` | Timestamp | No | When the edit was made | NOW() |
| `version` | Integer | No | Transaction version after this edit | (Required) |
| `changes` | JSONB | No | Array of field changes | [] |
| `metadata` | JSONB | Yes | Additional metadata (IP, user agent, etc.) | NULL |

### JSONB Schema: changes Field

The `changes` field stores an array of change objects:

```typescript
interface FieldChange {
  field: string        // Field name that changed (e.g., "amount", "memo")
  oldValue: unknown    // Previous value (type varies by field)
  newValue: unknown    // New value (type varies by field)
}

// Example:
[
  {
    "field": "amount",
    "oldValue": "100.50",
    "newValue": "125.50"
  },
  {
    "field": "memo",
    "oldValue": "Grocery shopping",
    "newValue": "Updated grocery shopping"
  },
  {
    "field": "splits",
    "oldValue": [
      { "categoryName": "Groceries", "amount": "100.50" }
    ],
    "newValue": [
      { "categoryName": "Groceries", "amount": "75.50" },
      { "categoryName": "Household", "amount": "50.00" }
    ]
  }
]
```

### JSONB Schema: metadata Field

The `metadata` field stores optional metadata about the edit:

```typescript
interface EditMetadata {
  action?: 'CREATED' | 'UPDATED'  // Type of operation
  userAgent?: string              // Browser/client user agent
  ipAddress?: string              // Client IP address
  source?: string                 // Source of edit (e.g., 'WEB', 'MOBILE', 'API', 'MIGRATION')
}

// Example:
{
  "action": "UPDATED",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
  "ipAddress": "192.168.1.100",
  "source": "WEB"
}
```

## Index Strategy

### Performance Indexes

1. **transactions.version**
   - Purpose: Optimistic lock checks during updates
   - Type: B-tree
   - Usage: `WHERE version = ?`

2. **transactions.created_by_id**
   - Purpose: User-created transaction lookups
   - Type: B-tree
   - Usage: `WHERE created_by_id = ?`

3. **transactions.last_modified_by_id**
   - Purpose: User-modified transaction lookups
   - Type: B-tree
   - Usage: `WHERE last_modified_by_id = ?`

4. **transaction_edit_history.transaction_id**
   - Purpose: Get all edits for a transaction
   - Type: B-tree
   - Usage: `WHERE transaction_id = ?`

5. **transaction_edit_history.edited_by_id**
   - Purpose: Get all edits by a user
   - Type: B-tree
   - Usage: `WHERE edited_by_id = ?`

6. **transaction_edit_history.edited_at**
   - Purpose: Chronological ordering of edits
   - Type: B-tree
   - Usage: `ORDER BY edited_at DESC`

7. **transaction_edit_history(transaction_id, edited_at)**
   - Purpose: Composite index for transaction history queries with ordering
   - Type: B-tree
   - Usage: `WHERE transaction_id = ? ORDER BY edited_at DESC`

8. **transaction_edit_history.changes (GIN)**
   - Purpose: Query specific field changes within JSONB
   - Type: GIN (Generalized Inverted Index)
   - Usage: `WHERE changes @> '[{"field": "amount"}]'`
   - Optional: Only create if querying changes field frequently

### Index Maintenance

- All indexes are created during migration
- PostgreSQL automatically maintains indexes on INSERT/UPDATE/DELETE
- Consider periodic `REINDEX` on high-write tables (quarterly)
- Monitor index bloat with `pg_stat_user_indexes`

## Foreign Key Constraints

### On Delete Behaviors

1. **transactions.created_by_id → users.id**
   - `ON DELETE RESTRICT`
   - Rationale: Cannot delete user who created transactions (data integrity)
   - Workaround: Transfer ownership before deletion or use soft delete

2. **transactions.last_modified_by_id → users.id**
   - `ON DELETE SET NULL`
   - Rationale: User deletion shouldn't block if they only modified (not created)
   - Result: Field set to NULL, preserving transaction

3. **transaction_edit_history.transaction_id → transactions.id**
   - `ON DELETE CASCADE`
   - Rationale: Edit history is meaningless without transaction
   - Result: All history entries deleted when transaction deleted

4. **transaction_edit_history.edited_by_id → users.id**
   - `ON DELETE RESTRICT`
   - Rationale: Preserve audit trail integrity
   - Workaround: Use soft delete for users or archive audit trail first

## Data Integrity Constraints

### Check Constraints

Optional check constraints for additional data integrity:

```sql
-- Ensure version is always positive
ALTER TABLE transactions
  ADD CONSTRAINT transactions_version_positive CHECK (version > 0);

-- Ensure version in history matches transaction version at time of edit
-- (This is enforced in application logic, not database constraint)

-- Ensure changes field is an array (PostgreSQL JSONB validation)
ALTER TABLE transaction_edit_history
  ADD CONSTRAINT transaction_edit_history_changes_is_array
    CHECK (jsonb_typeof(changes) = 'array');
```

### Unique Constraints

No additional unique constraints needed beyond existing primary keys.

## Storage Estimates

### Transaction Table Growth

Assuming 10,000 transactions:

- 3 new fields (version: 4 bytes, created_by_id: 16 bytes, last_modified_by_id: 16 bytes)
- Additional storage per row: ~36 bytes
- **Total additional storage: ~360 KB**

### TransactionEditHistory Table Growth

Assuming:
- Average 3 edits per transaction
- Average 2 field changes per edit
- Average change object: ~150 bytes
- Average metadata object: ~200 bytes

Per edit history entry:
- id: 16 bytes
- transaction_id: 16 bytes
- edited_by_id: 16 bytes
- edited_at: 8 bytes
- version: 4 bytes
- changes: ~300 bytes (2 changes × 150 bytes)
- metadata: ~200 bytes
- Total: ~560 bytes per entry

For 10,000 transactions with 3 edits each:
- **Total entries: 30,000**
- **Total storage: ~16.8 MB**

### Index Storage

Approximate index overhead:
- B-tree indexes: ~50% of indexed column size
- GIN index on JSONB: ~2-3× data size

Estimated total index storage: ~10 MB for 30,000 history entries

### Total Storage Impact

For 10,000 transactions with typical edit frequency:
- **Transaction table: ~360 KB additional**
- **Edit history table: ~16.8 MB**
- **Indexes: ~10 MB**
- **Total: ~27 MB**

This is negligible for modern databases and scales linearly with transaction count.

## Query Performance Benchmarks

### Expected Query Times (PostgreSQL on standard hardware)

| Query | Expected Time | Notes |
|-------|---------------|-------|
| Get single transaction with audit fields | < 5ms | Indexed primary key lookup |
| Update transaction with version check | < 10ms | Single row update with index |
| Create audit history entry | < 5ms | Simple insert |
| Get transaction history (50 entries) | < 10ms | Indexed transaction_id + limit |
| Count total history entries | < 5ms | Index-only scan |
| Complex JSONB query on changes | < 20ms | GIN index required |

These benchmarks assume:
- Properly indexed tables
- PostgreSQL 13+
- Standard SSD storage
- < 100k history entries

## Backup and Recovery Considerations

### Backup Strategy

1. **Regular Backups**: Include `transaction_edit_history` in all backups
2. **Point-in-Time Recovery**: Ensure WAL archiving captures all audit changes
3. **Audit Trail Preservation**: Never truncate or archive `transaction_edit_history` without business approval

### Data Retention Policy

Recommended retention:
- **Transaction data**: Indefinite (financial records)
- **Edit history**: Indefinite (audit trail for compliance)
- **Soft deletes**: Consider soft delete flag instead of hard delete

### Compliance Requirements

For financial applications, consider:
- **SOX Compliance**: Audit trail must be tamper-proof and complete
- **GDPR**: User deletion may require anonymization rather than hard delete
- **Data Archival**: Move old history to archive table after N years (e.g., 7 years)

## Testing the Migration

### Pre-Migration Checklist

- [ ] Backup database
- [ ] Test migration on staging environment
- [ ] Verify all existing transactions have a valid user for `created_by_id`
- [ ] Estimate migration time for production data volume
- [ ] Plan for downtime or zero-downtime migration strategy

### Post-Migration Validation

```sql
-- Verify all transactions have version >= 1
SELECT COUNT(*) FROM transactions WHERE version < 1;
-- Expected: 0

-- Verify all transactions have created_by_id
SELECT COUNT(*) FROM transactions WHERE created_by_id IS NULL;
-- Expected: 0

-- Verify all transactions have initial history entry
SELECT COUNT(*) FROM transactions t
LEFT JOIN transaction_edit_history h ON t.id = h.transaction_id
WHERE h.id IS NULL;
-- Expected: 0

-- Verify foreign key integrity
SELECT COUNT(*) FROM transactions t
LEFT JOIN users u ON t.created_by_id = u.id
WHERE u.id IS NULL;
-- Expected: 0
```

### Sample Test Queries

```sql
-- Get transaction with creator info
SELECT
  t.id,
  t.amount,
  t.version,
  u.name AS created_by_name,
  t.created_at
FROM transactions t
JOIN users u ON t.created_by_id = u.id
WHERE t.id = 'some-transaction-id';

-- Get transaction edit history
SELECT
  h.id,
  h.edited_at,
  u.name AS edited_by_name,
  h.version,
  h.changes
FROM transaction_edit_history h
JOIN users u ON h.edited_by_id = u.id
WHERE h.transaction_id = 'some-transaction-id'
ORDER BY h.edited_at DESC;

-- Find all transactions edited by specific user
SELECT
  t.id,
  t.amount,
  t.memo,
  h.edited_at,
  h.changes
FROM transactions t
JOIN transaction_edit_history h ON t.id = h.transaction_id
WHERE h.edited_by_id = 'some-user-id'
ORDER BY h.edited_at DESC;

-- Find transactions with high edit frequency (potential issues)
SELECT
  t.id,
  t.memo,
  t.version,
  COUNT(h.id) AS edit_count
FROM transactions t
LEFT JOIN transaction_edit_history h ON t.id = h.transaction_id
GROUP BY t.id, t.memo, t.version
HAVING COUNT(h.id) > 10
ORDER BY edit_count DESC;
```

## Prisma Commands

### Generate Prisma Client

After updating `schema.prisma`:

```bash
cd treasurer-api
pnpm db:generate
```

### Create Migration

```bash
cd treasurer-api
pnpm db:migrate dev --name add-transaction-audit-fields
```

### Apply Migration to Production

```bash
cd treasurer-api
pnpm db:migrate deploy
```

### Reset Database (Development Only)

```bash
cd treasurer-api
pnpm db:push --force-reset
```

## Summary

This schema design provides:

1. **Optimistic Locking**: Version field prevents concurrent modification conflicts
2. **Audit Trail**: Complete edit history with user tracking
3. **Data Integrity**: Foreign key constraints and cascading deletes
4. **Performance**: Proper indexing for common queries
5. **Scalability**: Efficient storage and query performance
6. **Compliance**: Tamper-proof audit trail for financial regulations
7. **Flexibility**: JSONB fields for extensible change tracking

The schema integrates seamlessly with Treasurer's existing Prisma-based architecture while adding minimal overhead (~27 MB for 10,000 transactions with typical edit frequency).
