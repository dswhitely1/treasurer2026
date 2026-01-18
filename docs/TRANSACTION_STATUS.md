# Transaction Status Management Feature

**Version:** 0.1.0
**Last Updated:** 2026-01-17
**Feature Status:** Production Ready

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Business Requirements](#business-requirements)
3. [Status State Machine](#status-state-machine)
4. [User Workflows](#user-workflows)
5. [Technical Implementation](#technical-implementation)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [Database Schema](#database-schema)
9. [Testing](#testing)
10. [Future Enhancements](#future-enhancements)

---

## Feature Overview

Transaction Status Management enables users to track the lifecycle of financial transactions from initial creation through reconciliation. This feature supports accurate account reconciliation by providing a clear, auditable progression of transaction states.

**Key Capabilities:**

- Track transactions through three status states: UNCLEARED → CLEARED → RECONCILED
- Bulk status changes for efficient reconciliation
- Complete audit trail with status history
- Protection against modifying reconciled transactions
- Reconciliation summary reports

**Business Value:**

- Ensures financial accuracy through controlled status progression
- Simplifies monthly reconciliation workflows
- Provides audit trail for compliance
- Prevents accidental modification of reconciled data

---

## Business Requirements

### Functional Requirements

**FR-1: Status States**
- Transactions must support three status states: UNCLEARED, CLEARED, RECONCILED
- New transactions default to UNCLEARED status

**FR-2: Status Transitions**
- Valid transitions: UNCLEARED → CLEARED, CLEARED → UNCLEARED, CLEARED → RECONCILED
- RECONCILED is a terminal state (no transitions allowed)

**FR-3: Status Change Audit**
- All status changes must be logged with timestamp, user, and optional notes
- History must be immutable and queryable

**FR-4: Bulk Operations**
- Support changing status of multiple transactions simultaneously
- Maximum 100 transactions per bulk operation
- Partial success handling (some transactions may fail)

**FR-5: Reconciliation Workflow**
- Provide summary of transaction counts and totals by status
- Support filtering transactions by status
- Enable bulk selection for reconciliation

**FR-6: Protection**
- Prevent modification of RECONCILED transactions
- Prevent deletion of RECONCILED transactions
- Require ADMIN or OWNER role for status changes

### Non-Functional Requirements

**NFR-1: Performance**
- Status change operations must complete within 2 seconds
- Bulk operations (100 transactions) must complete within 5 seconds
- History queries must return within 1 second

**NFR-2: Data Integrity**
- All status changes must be atomic (transaction isolation)
- History records must never be lost or corrupted

**NFR-3: Usability**
- Clear visual indication of transaction status
- Intuitive bulk selection interface
- Informative error messages for invalid transitions

---

## Status State Machine

### State Diagram

```
┌─────────────┐
│  UNCLEARED  │ ◀─── New transaction created here
└──────┬──────┘
       │
       │ mark_as_cleared
       ▼
┌─────────────┐
│   CLEARED   │
└──────┬──────┘
       │ ▲
       │ │ revert_to_uncleared
       │ │
       │ └──────────────────────────┐
       │                            │
       │ reconcile                  │
       ▼                            │
┌─────────────┐                     │
│ RECONCILED  │                     │
└─────────────┘                     │
  (TERMINAL)                        │
   No further                       │
   transitions                      │
   allowed                          │
                                    │
   Cannot modify ──────────────────┘
   Cannot delete
```

### State Transition Matrix

| From Status | To Status | Allowed? | Action Required |
|-------------|-----------|----------|-----------------|
| UNCLEARED | UNCLEARED | ❌ | No-op (already in state) |
| UNCLEARED | CLEARED | ✅ | Mark as appeared on statement |
| UNCLEARED | RECONCILED | ❌ | Must go through CLEARED first |
| CLEARED | UNCLEARED | ✅ | Revert if error |
| CLEARED | CLEARED | ❌ | No-op (already in state) |
| CLEARED | RECONCILED | ✅ | Reconcile transaction |
| RECONCILED | UNCLEARED | ❌ | Terminal state |
| RECONCILED | CLEARED | ❌ | Terminal state |
| RECONCILED | RECONCILED | ❌ | No-op (already in state) |

### Status Semantics

**UNCLEARED (Initial State)**
- Transaction has been entered into the system
- Has not yet appeared on bank statement
- User anticipates this transaction will show up
- Fully editable and deletable

**CLEARED (Intermediate State)**
- Transaction has appeared on bank statement
- Amounts match between system and statement
- Ready for reconciliation
- Still editable if errors found
- Can be reverted to UNCLEARED if entered incorrectly

**RECONCILED (Terminal State)**
- Transaction has been verified and locked
- Part of a completed reconciliation
- Cannot be modified or deleted
- Ensures historical accuracy
- Forms basis for financial reports

### State Transition Business Rules

**Rule 1: Progressive Verification**
Transactions must be verified incrementally (UNCLEARED → CLEARED → RECONCILED). This ensures:
- Users review transactions before reconciling
- Errors are caught at CLEARED stage
- RECONCILED represents double-checked accuracy

**Rule 2: Terminal State Protection**
Once RECONCILED, transactions are locked to preserve:
- Historical accuracy for audits
- Integrity of reconciliation reports
- Compliance with financial regulations

**Rule 3: Reversible Cleared State**
CLEARED can revert to UNCLEARED to allow:
- Correction of data entry errors
- Handling of bank statement corrections
- Flexibility before final reconciliation

---

## User Workflows

### Workflow 1: Daily Transaction Entry

```
1. User creates transaction (UNCLEARED)
   ↓
2. Transaction appears in "Uncleared" list
   ↓
3. User waits for bank statement
```

### Workflow 2: Marking Transactions as Cleared

```
1. User receives bank statement
   ↓
2. User navigates to account transactions
   ↓
3. User filters to show UNCLEARED transactions
   ↓
4. For each transaction on statement:
   a. User finds matching transaction in list
   b. User clicks "Mark as Cleared"
   c. Transaction moves to CLEARED status
   ↓
5. User reviews any remaining UNCLEARED
   (these are outstanding transactions)
```

### Workflow 3: Account Reconciliation

```
1. User navigates to Reconciliation page
   ↓
2. User selects account to reconcile
   ↓
3. System displays reconciliation summary:
   - Uncleared count & total
   - Cleared count & total
   - Reconciled count & total
   ↓
4. User enters statement ending balance
   ↓
5. User enters statement date
   ↓
6. System filters to show CLEARED transactions
   ↓
7. User selects transactions to reconcile:
   - Individual selection by clicking checkboxes
   - "Select All" for all visible transactions
   - "Select All Except" for bulk selection with exclusions
   ↓
8. User reviews selection count
   ↓
9. User clicks "Reconcile Selected"
   ↓
10. System performs bulk status change:
    - All selected transactions → RECONCILED
    - Creates audit history for each
    - Updates reconciliation summary
    ↓
11. System displays results:
    - Success toast notification
    - Updated summary with new RECONCILED count
    - Cleared selection
    ↓
12. User verifies reconciliation:
    - Check that statement balance matches
    - Review any failed transactions
```

### Workflow 4: Correcting Errors

**Scenario A: Error in UNCLEARED Transaction**

```
1. User edits transaction details directly
   (fully editable)
```

**Scenario B: Error in CLEARED Transaction**

```
1. User reviews CLEARED transaction
   ↓
2. User realizes amount is wrong
   ↓
3. Option A: Edit transaction directly (still allowed)
   ↓
4. Option B: Revert to UNCLEARED, then edit:
   a. Click "Revert to Uncleared"
   b. Edit transaction details
   c. Re-mark as CLEARED when confirmed
```

**Scenario C: Error in RECONCILED Transaction**

```
1. User discovers error in RECONCILED transaction
   ↓
2. System prevents modification
   ↓
3. User must contact administrator or:
   - Document the error
   - Create offsetting transaction
   - Add notes to transaction history
```

### Workflow 5: Bulk Status Change

```
1. User filters transactions by status
   ↓
2. User selects multiple transactions:
   - Click individual checkboxes
   - Or click "Select All" for all visible
   ↓
3. User clicks bulk action button:
   - "Mark as Cleared" (for UNCLEARED)
   - "Reconcile Selected" (for CLEARED)
   ↓
4. System confirms action
   ↓
5. System processes bulk change:
   - Updates valid transactions
   - Skips invalid transitions
   - Reports success/failure for each
   ↓
6. System displays results:
   - "10 transactions updated successfully"
   - "2 transactions failed: [reasons]"
   ↓
7. User reviews failures and handles individually
```

---

## Technical Implementation

### Backend Architecture

#### Service Layer

Located at `/home/don/dev/treasurer2026/treasurer-api/src/services/transactionStatusService.ts`

**Key Functions:**

```typescript
// Change single transaction status
export async function changeTransactionStatus(
  organizationId: string,
  accountId: string,
  transactionId: string,
  userId: string,
  input: StatusChangeRequestDto
): Promise<StatusHistoryInfo>

// Bulk change transaction status
export async function bulkChangeTransactionStatus(
  organizationId: string,
  accountId: string,
  userId: string,
  input: BulkStatusChangeRequestDto
): Promise<BulkStatusChangeResult>

// Get transaction status history
export async function getTransactionStatusHistory(
  organizationId: string,
  accountId: string,
  transactionId: string
): Promise<StatusHistoryInfo[]>

// Get reconciliation summary
export async function getReconciliationSummary(
  organizationId: string,
  accountId: string
): Promise<ReconciliationSummary>
```

**State Machine Implementation:**

```typescript
const STATUS_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  UNCLEARED: ['CLEARED'],
  CLEARED: ['UNCLEARED', 'RECONCILED'],
  RECONCILED: [], // Terminal state
}

export function isValidStatusTransition(
  currentStatus: TransactionStatus,
  newStatus: TransactionStatus
): boolean {
  if (currentStatus === newStatus) return false  // No-op
  return STATUS_TRANSITIONS[currentStatus].includes(newStatus)
}
```

**Database Transaction Pattern:**

```typescript
// Single transaction for atomicity
const result = await prisma.$transaction(async (tx) => {
  // 1. Update transaction status and timestamps
  await tx.transaction.update({
    where: { id: transactionId },
    data: {
      status: input.status,
      clearedAt: input.status === 'CLEARED' ? new Date() : null,
      reconciledAt: input.status === 'RECONCILED' ? new Date() : null,
    },
  })

  // 2. Create immutable history record
  const history = await tx.transactionStatusHistory.create({
    data: {
      transactionId,
      fromStatus: transaction.status,
      toStatus: input.status,
      changedById: userId,
      notes: input.notes,
    },
    include: { changedBy: true },
  })

  return history
})
```

#### Controller Layer

Located at `/home/don/dev/treasurer2026/treasurer-api/src/controllers/transactionStatusController.ts`

Handles HTTP requests and responses:

```typescript
export const changeStatus: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as StatusChangeRequestDto
    const history = await changeTransactionStatus(
      req.params.orgId,
      req.params.accountId,
      req.params.transactionId,
      req.user!.id,
      data
    )
    sendSuccess(res, { history }, 'Transaction status updated successfully')
  } catch (error) {
    next(error)
  }
}
```

#### Validation Layer

Located at `/home/don/dev/treasurer2026/treasurer-api/src/schemas/transactionStatus.ts`

Zod schemas for runtime validation:

```typescript
export const statusChangeRequestSchema = z.object({
  status: z.enum(['UNCLEARED', 'CLEARED', 'RECONCILED']),
  notes: z.string().max(500).optional(),
})

export const bulkStatusChangeRequestSchema = z.object({
  transactionIds: z
    .array(z.string().uuid())
    .min(1, 'At least one transaction required')
    .max(100, 'Maximum 100 transactions per request'),
  status: z.enum(['UNCLEARED', 'CLEARED', 'RECONCILED']),
  notes: z.string().max(500).optional(),
})
```

### Frontend Architecture

#### Redux State Slice

Located at `/home/don/dev/treasurer2026/treasurer/src/store/features/statusSlice.ts`

Manages client-side status-related state:

```typescript
interface StatusState {
  // Status filtering
  statusFilter: {
    uncleared: boolean
    cleared: boolean
    reconciled: boolean
  }

  // Bulk selection
  selectedIds: string[]
  isSelectAllMode: boolean
  excludedIds: string[]

  // Reconciliation workflow
  reconciliation: {
    isActive: boolean
    statementBalance: number | null
    statementDate: string | null
  }

  // Optimistic update tracking
  pendingChanges: Record<string, {
    previousStatus: TransactionStatus
    newStatus: TransactionStatus
    timestamp: number
  }>
}
```

**Key Actions:**

- `toggleStatusFilter`: Toggle visibility of status type
- `toggleSelection`: Select/deselect transaction
- `toggleSelectAll`: Enable/disable select all mode
- `startReconciliation`: Begin reconciliation workflow
- `completeReconciliation`: Finish and reset workflow
- `trackPendingChange`: Track optimistic update for rollback

#### RTK Query Integration

```typescript
// API endpoint for status change
updateTransactionStatus: builder.mutation({
  query: ({ orgId, accountId, transactionId, ...body }) => ({
    url: `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
    method: 'PATCH',
    body,
  }),

  // Optimistic update
  async onQueryStarted({ transactionId, status }, { dispatch, queryFulfilled }) {
    const patchResult = dispatch(
      transactionsApi.util.updateQueryData('getTransactions', args, (draft) => {
        const tx = draft.data.find(t => t.id === transactionId)
        if (tx) tx.status = status
      })
    )

    try {
      await queryFulfilled
    } catch {
      patchResult.undo()  // Rollback on error
    }
  },
})
```

---

## API Endpoints

See [API.md](./API.md#transaction-status) for complete API documentation.

**Summary:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/transactions/:id/status` | PATCH | Change single transaction status |
| `/transactions/:id/status/history` | GET | Get status change history |
| `/transactions/status/bulk` | POST | Bulk change transaction status |
| `/transactions/status/summary` | GET | Get reconciliation summary |

---

## Frontend Components

### Transaction Status Badge

Visual indicator of transaction status:

```typescript
function StatusBadge({ status }: { status: TransactionStatus }) {
  const variants = {
    UNCLEARED: 'bg-yellow-100 text-yellow-800',
    CLEARED: 'bg-blue-100 text-blue-800',
    RECONCILED: 'bg-green-100 text-green-800',
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${variants[status]}`}>
      {status}
    </span>
  )
}
```

### Bulk Selection Controls

```typescript
function BulkSelectionToolbar({ selectedCount, onClearSelection, onMarkCleared }) {
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center gap-4 p-4 bg-blue-50 border-b">
      <span>{selectedCount} transactions selected</span>
      <button onClick={onMarkCleared}>Mark as Cleared</button>
      <button onClick={onClearSelection}>Clear Selection</button>
    </div>
  )
}
```

### Reconciliation Summary

```typescript
function ReconciliationSummary({ summary }: { summary: ReconciliationSummary }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatusCard
        title="Uncleared"
        count={summary.uncleared.count}
        total={summary.uncleared.total}
        color="yellow"
      />
      <StatusCard
        title="Cleared"
        count={summary.cleared.count}
        total={summary.cleared.total}
        color="blue"
      />
      <StatusCard
        title="Reconciled"
        count={summary.reconciled.count}
        total={summary.reconciled.total}
        color="green"
      />
    </div>
  )
}
```

---

## Database Schema

### Transaction Table

```prisma
model Transaction {
  id           String            @id @default(uuid())
  // ... other fields ...
  status       TransactionStatus @default(UNCLEARED)
  clearedAt    DateTime?         @map("cleared_at")
  reconciledAt DateTime?         @map("reconciled_at")

  statusHistory TransactionStatusHistory[]

  @@index([accountId, status])
  @@index([accountId, status, date])
}

enum TransactionStatus {
  UNCLEARED
  CLEARED
  RECONCILED
}
```

### Transaction Status History Table

```prisma
model TransactionStatusHistory {
  id            String             @id @default(uuid())
  transactionId String             @map("transaction_id")
  fromStatus    TransactionStatus? @map("from_status")  // Null for initial creation
  toStatus      TransactionStatus  @map("to_status")
  changedById   String             @map("changed_by_id")
  changedAt     DateTime           @default(now()) @map("changed_at")
  notes         String?

  transaction Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  changedBy   User        @relation(fields: [changedById], references: [id], onDelete: Cascade)

  @@index([transactionId])
  @@index([changedAt])
  @@map("transaction_status_history")
}
```

**Design Decisions:**

1. **Timestamp Fields**: Separate `clearedAt` and `reconciledAt` for audit trail
2. **Nullable fromStatus**: Allows tracking initial transaction creation
3. **Cascade Delete**: History deleted with transaction (alternative: soft delete)
4. **Indexes**: Optimized for common queries (by transaction, by date)

---

## Testing

### Backend Tests (Vitest)

**Test Coverage:** 138 backend tests include comprehensive status management tests

**Key Test Scenarios:**

```typescript
describe('Transaction Status Service', () => {
  it('should transition from UNCLEARED to CLEARED', async () => {
    const result = await changeTransactionStatus(/* ... */, { status: 'CLEARED' })
    expect(result.toStatus).toBe('CLEARED')
    expect(result.fromStatus).toBe('UNCLEARED')
  })

  it('should reject invalid transition from RECONCILED', async () => {
    await expect(
      changeTransactionStatus(/* reconciled tx */, { status: 'UNCLEARED' })
    ).rejects.toThrow('Cannot modify reconciled transactions')
  })

  it('should handle bulk operation with partial failures', async () => {
    const result = await bulkChangeTransactionStatus(/* ... */)
    expect(result.successful).toHaveLength(2)
    expect(result.failed).toHaveLength(1)
  })

  it('should create history record on status change', async () => {
    await changeTransactionStatus(/* ... */, { status: 'CLEARED', notes: 'Test' })
    const history = await getTransactionStatusHistory(/* ... */)
    expect(history[0].notes).toBe('Test')
  })
})
```

### Frontend Tests (Vitest + Testing Library)

**Test Coverage:** 232 frontend tests include status slice and component tests

```typescript
describe('Status Slice', () => {
  it('should toggle status filter', () => {
    const state = statusReducer(initialState, toggleStatusFilter('uncleared'))
    expect(state.statusFilter.uncleared).toBe(false)
  })

  it('should handle bulk selection', () => {
    const state = statusReducer(initialState, toggleSelectAll())
    expect(state.isSelectAllMode).toBe(true)
  })
})

describe('StatusBadge Component', () => {
  it('should render correct color for CLEARED status', () => {
    render(<StatusBadge status="CLEARED" />)
    expect(screen.getByText('CLEARED')).toHaveClass('bg-blue-100')
  })
})
```

---

## Future Enhancements

### Short-term (Next 3 months)

1. **Batch Reconciliation Templates**
   - Save reconciliation patterns
   - Quick-apply to similar accounts

2. **Status Change Notifications**
   - Email notifications for reconciliation completion
   - In-app notifications for bulk operation results

3. **Enhanced Filtering**
   - Filter by date range within status
   - Filter by reconciliation batch

### Medium-term (3-6 months)

4. **Reconciliation Reports**
   - Export reconciliation summary as PDF
   - Historical reconciliation tracking

5. **Smart Matching**
   - Auto-match transactions to bank imports
   - Suggest CLEARED status for matched transactions

6. **Mobile Reconciliation**
   - Mobile-optimized reconciliation workflow
   - Touch-friendly bulk selection

### Long-term (6+ months)

7. **AI-Assisted Reconciliation**
   - ML model to predict which transactions should be reconciled together
   - Anomaly detection for unusual status patterns

8. **Multi-User Reconciliation**
   - Collaborative reconciliation workflow
   - Approval chains for reconciliation

9. **Scheduled Reconciliation**
   - Automatic monthly reconciliation reminders
   - Pre-filled reconciliation based on statement imports

---

## Related Documentation

- [Architecture Documentation](./ARCHITECTURE.md) - System architecture and design patterns
- [API Documentation](./API.md) - Complete API reference
- [ADR-001: Transaction Status State Machine](./adr/001-transaction-status-state-machine.md)
- [ADR-004: Bulk Operations Partial Failure](./adr/004-bulk-operations-partial-failure.md)
- [ADR-005: Single Transaction Bulk Updates](./adr/005-single-transaction-bulk-updates.md)

---

**Document Metadata:**
- **Version:** 0.1.0
- **Last Updated:** 2026-01-17
- **Feature Owner:** Development Team
- **Review Cycle:** Updated with feature changes
