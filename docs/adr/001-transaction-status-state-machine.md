# ADR-001: Transaction Status State Machine

**Status:** Accepted
**Date:** 2026-01-17
**Deciders:** Development Team
**Technical Story:** Transaction reconciliation feature

## Context

Financial transactions in Treasurer need to track their verification status as they progress from initial entry through bank statement verification to final reconciliation. We needed a system that:

1. Provides clear progression of transaction verification
2. Prevents accidental modification of verified data
3. Supports account reconciliation workflows
4. Maintains audit trail for compliance
5. Balances flexibility with data integrity

## Decision

We implemented a **strict state machine** with three states:

```
UNCLEARED → CLEARED → RECONCILED
     ↓          ↓
     └──────────┘
   (reversible) (terminal)
```

### State Definitions

**UNCLEARED (Initial State)**
- Transaction entered but not verified
- Fully editable and deletable
- Represents anticipated or pending transactions

**CLEARED (Intermediate State)**
- Transaction appeared on bank statement
- Amounts verified against statement
- Still editable if errors discovered
- Can revert to UNCLEARED if needed

**RECONCILED (Terminal State)**
- Transaction verified and locked
- Part of completed reconciliation
- Cannot be modified or deleted
- Permanent historical record

### Transition Rules

**Valid Transitions:**
- UNCLEARED → CLEARED (mark as appeared on statement)
- CLEARED → UNCLEARED (revert if error found)
- CLEARED → RECONCILED (lock as part of reconciliation)

**Invalid Transitions:**
- UNCLEARED → RECONCILED (must verify via CLEARED first)
- RECONCILED → any state (terminal, immutable)

### Implementation

```typescript
const STATUS_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  UNCLEARED: ['CLEARED'],
  CLEARED: ['UNCLEARED', 'RECONCILED'],
  RECONCILED: [], // Terminal state
}

function isValidStatusTransition(
  current: TransactionStatus,
  next: TransactionStatus
): boolean {
  return STATUS_TRANSITIONS[current].includes(next)
}
```

## Consequences

### Positive

**1. Clear Verification Workflow**
- Users have obvious progression: enter → verify → reconcile
- Reduces confusion about transaction status
- Natural alignment with banking workflow

**2. Data Integrity Protection**
- RECONCILED state prevents accidental modification
- Historical financial data remains accurate
- Supports audit requirements

**3. Error Correction Flexibility**
- CLEARED state is reversible
- Users can fix mistakes before finalizing
- Balances safety with usability

**4. Audit Trail**
- Every status change logged with timestamp and user
- Immutable history table
- Compliance and troubleshooting support

**5. Simplified Business Logic**
- State machine prevents invalid states
- Single source of truth for transition rules
- Easy to test and validate

### Negative

**1. Rigid After Reconciliation**
- Cannot modify RECONCILED transactions
- Errors require offsetting transactions
- Some users may find this restrictive

**Mitigation:**
- Clear documentation of reconciliation finality
- Warning messages before reconciliation
- Support for correction transactions with notes

**2. Additional Step for Simple Use Cases**
- Solo users might not need full workflow
- Overhead for users who don't reconcile regularly

**Mitigation:**
- Status changes can be bulk-applied
- UNCLEARED state is functional without progression
- Reconciliation is optional

**3. Cannot Skip CLEARED State**
- Must mark as CLEARED before RECONCILED
- Extra step even if already verified

**Mitigation:**
- Bulk operations make this efficient
- Aligns with real-world reconciliation process
- Ensures double-verification

### Technical Impact

**Database:**
- Added `status`, `clearedAt`, `reconciledAt` fields to Transaction table
- Added TransactionStatusHistory table
- Composite index on (accountId, status, date)

**Backend:**
- Created transactionStatusService with state machine logic
- Added validation middleware
- Created dedicated status endpoints

**Frontend:**
- Created statusSlice for status-related state
- Added bulk selection and reconciliation UI
- Implemented optimistic updates with rollback

## Alternatives Considered

### Alternative 1: Free-Form Status Tags

**Description:** Allow users to create custom status tags (e.g., "pending", "verified", "final").

**Rejected because:**
- No enforcement of progression
- Users could skip verification steps
- Difficult to build reliable reconciliation on top
- No guarantee of data integrity

### Alternative 2: Boolean Flags

**Description:** Use simple flags like `isCleared`, `isReconciled`.

**Rejected because:**
- Doesn't prevent invalid state combinations
- Less intuitive than named states
- Harder to extend with additional states
- No clear progression workflow

### Alternative 3: Four-State Machine

**Description:** Add a fourth state (e.g., "PENDING") before UNCLEARED.

**Rejected because:**
- Adds complexity without clear benefit
- UNCLEARED already serves "pending" purpose
- More states = more transitions to manage
- Diminishing returns on safety

### Alternative 4: Always Allow Edits

**Description:** Never lock transactions, rely on user discipline.

**Rejected because:**
- High risk of accidental modification
- Unreliable historical data
- Difficult audit trail
- Not suitable for compliance

## Related Decisions

- [ADR-004: Bulk Operations with Partial Failure](./004-bulk-operations-partial-failure.md) - Extends state machine to bulk operations
- [ADR-005: Single Transaction for Bulk Updates](./005-single-transaction-bulk-updates.md) - Database transaction strategy for state changes

## References

- [Transaction Status Feature Documentation](../TRANSACTION_STATUS.md)
- [Architecture Documentation](../ARCHITECTURE.md#transaction-status-state-machine)
- Prisma Schema: `/home/don/dev/treasurer2026/treasurer-api/prisma/schema.prisma`
- Service Implementation: `/home/don/dev/treasurer2026/treasurer-api/src/services/transactionStatusService.ts`

---

**Last Updated:** 2026-01-17
