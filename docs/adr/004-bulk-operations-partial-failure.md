# ADR-004: Bulk Operations with Partial Failure Support

**Status:** Accepted
**Date:** 2026-01-17
**Deciders:** Development Team
**Technical Story:** Bulk transaction status changes for reconciliation

## Context

Account reconciliation often involves changing the status of many transactions at once (10-100 transactions). Users might select transactions to mark as CLEARED or RECONCILED in bulk. However, some transactions might fail validation:

- Already in target status
- Invalid state transition
- Transaction locked (RECONCILED)
- Transaction not found

We had to decide: Should one failure cause the entire operation to fail, or should we allow partial success?

## Decision

We implemented **partial success handling** for bulk operations:

1. **Validate each transaction** individually
2. **Process all valid transactions** together
3. **Return both successes and failures** in response
4. **Use HTTP 207 Multi-Status** for partial success
5. **Use database transaction** for all-or-nothing processing of valid subset

### API Response Format

**All Successful (HTTP 200):**
```json
{
  "success": true,
  "data": {
    "successful": [
      { "transactionId": "tx-1", "status": "CLEARED" },
      { "transactionId": "tx-2", "status": "CLEARED" }
    ],
    "failed": []
  },
  "message": "All transactions updated successfully"
}
```

**Partial Success (HTTP 207):**
```json
{
  "success": true,
  "data": {
    "successful": [
      { "transactionId": "tx-1", "status": "CLEARED" },
      { "transactionId": "tx-2", "status": "CLEARED" }
    ],
    "failed": [
      {
        "transactionId": "tx-3",
        "error": "Transaction is already CLEARED"
      },
      {
        "transactionId": "tx-4",
        "error": "Cannot modify reconciled transactions"
      }
    ]
  },
  "message": "Bulk operation completed with 2 successes and 2 failures"
}
```

### Implementation

```typescript
export async function bulkChangeTransactionStatus(
  organizationId: string,
  accountId: string,
  userId: string,
  input: BulkStatusChangeRequestDto
): Promise<BulkStatusChangeResult> {
  // Fetch all requested transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      id: { in: input.transactionIds },
      accountId,
    },
  })

  const successful: BulkStatusChangeResult['successful'] = []
  const failed: BulkStatusChangeResult['failed'] = []
  const validTransactions: Array<{ id: string; currentStatus: TransactionStatus }> = []

  // Validate each transaction
  for (const transactionId of input.transactionIds) {
    const transaction = transactions.find((t) => t.id === transactionId)

    if (!transaction) {
      failed.push({
        transactionId,
        error: 'Transaction not found',
      })
      continue
    }

    // Validate status transition
    if (!isValidStatusTransition(transaction.status, input.status)) {
      if (transaction.status === input.status) {
        failed.push({
          transactionId,
          error: `Transaction is already ${input.status}`,
        })
      } else if (transaction.status === 'RECONCILED') {
        failed.push({
          transactionId,
          error: 'Cannot modify reconciled transactions',
        })
      } else {
        failed.push({
          transactionId,
          error: `Invalid status transition from ${transaction.status} to ${input.status}`,
        })
      }
      continue
    }

    // Valid transaction
    validTransactions.push({
      id: transactionId,
      currentStatus: transaction.status,
    })
  }

  // Process all valid transactions in single database transaction
  if (validTransactions.length > 0) {
    try {
      await prisma.$transaction(async (tx) => {
        // Update all transactions
        for (const validTx of validTransactions) {
          await tx.transaction.update({
            where: { id: validTx.id },
            data: {
              status: input.status,
              clearedAt: input.status === 'CLEARED' ? new Date() : null,
              reconciledAt: input.status === 'RECONCILED' ? new Date() : null,
            },
          })
        }

        // Create history records
        await tx.transactionStatusHistory.createMany({
          data: validTransactions.map((validTx) => ({
            transactionId: validTx.id,
            fromStatus: validTx.currentStatus,
            toStatus: input.status,
            changedById: userId,
            changedAt: new Date(),
            notes: input.notes,
          })),
        })
      })

      // Mark as successful
      validTransactions.forEach((validTx) => {
        successful.push({
          transactionId: validTx.id,
          status: input.status,
        })
      })
    } catch (error) {
      // Database transaction failed - mark all as failed
      validTransactions.forEach((validTx) => {
        failed.push({
          transactionId: validTx.id,
          error: error instanceof Error ? error.message : 'Batch update failed',
        })
      })
    }
  }

  return { successful, failed }
}
```

### Controller Response Logic

```typescript
export const bulkChangeStatus: RequestHandler = async (req, res, next) => {
  try {
    const result = await bulkChangeTransactionStatus(/* ... */)

    // Return 207 Multi-Status if any failures
    if (result.failed.length > 0) {
      res.status(207).json({
        success: true,
        data: result,
        message: `Bulk operation completed with ${result.successful.length} successes and ${result.failed.length} failures`,
      })
      return
    }

    // All succeeded - return 200
    sendSuccess(res, result, 'All transactions updated successfully')
  } catch (error) {
    next(error)
  }
}
```

## Consequences

### Positive

**1. Better User Experience**
- Partial success better than total failure
- Users don't have to re-select valid transactions
- Clear feedback on what failed and why

**2. Efficient Workflows**
- Can select all transactions without worrying about edge cases
- System handles validation automatically
- Reduces number of API calls needed

**3. Informative Error Messages**
- Each failure includes specific error reason
- Users can address issues individually
- No need to guess what went wrong

**4. Atomic Valid Subset**
- All valid transactions processed together
- Database transaction ensures consistency
- Either all valid succeed or all valid fail

**5. Resilient to Selection Errors**
- Already-reconciled transactions don't break workflow
- Duplicate selections don't cause errors
- Missing transactions reported clearly

### Negative

**1. Complex Response Handling**
- Frontend must handle both success and failure arrays
- HTTP 207 is less common, may confuse developers
- Need special UI for displaying partial results

**Mitigation:**
- Well-documented response format
- Reusable frontend components for bulk results
- Clear examples in API documentation

**2. Potential for Silent Failures**
- Users might not notice failed transactions
- Could lead to incomplete reconciliation

**Mitigation:**
- Prominent UI display of failures
- Failure count in success message
- Option to retry failed transactions

**3. Increased Testing Complexity**
- Must test all combinations of success/failure
- Edge cases like all-fail, all-succeed, mixed
- Optimistic updates harder with partial failures

**Mitigation:**
- Comprehensive test suite
- Clear test cases for each scenario
- Documented testing strategy

**4. Database Transaction Overhead**
- Single transaction locks all rows
- Long-running transaction if many updates
- Potential for transaction timeout

**Mitigation:**
- Limit to 100 transactions per request
- Fast update operations (indexed properly)
- Transaction timeout set appropriately

### Technical Impact

**API:**
- Added HTTP 207 status code
- New response structure with successful/failed arrays
- Validation before database operation

**Frontend:**
- Need to parse and display both arrays
- Optimistic updates must handle partial rollback
- Toast notifications show success and failure counts

**Testing:**
- Added tests for all validation scenarios
- Tests for partial success cases
- Tests for total failure cases

## Alternatives Considered

### Alternative 1: All-or-Nothing Approach

**Description:** If any transaction fails validation, return 400 error and reject entire batch.

**Rejected because:**
- Poor user experience (must deselect invalid transactions)
- Inefficient (requires multiple round trips)
- Doesn't leverage server-side validation

**Example scenario:**
- User selects 50 transactions to reconcile
- 1 transaction is already reconciled
- All-or-nothing: User gets error, must find and deselect the 1 transaction
- Partial success: 49 succeed, 1 reports as failed

### Alternative 2: Best-Effort Without Reporting Failures

**Description:** Process all valid transactions, silently skip invalid ones, return only successes.

**Rejected because:**
- No visibility into failures
- Users don't know if all expected transactions were processed
- Silent failures are dangerous in financial applications

### Alternative 3: Two-Phase Process (Validate Then Execute)

**Description:**
1. First API call validates all transactions
2. Second API call performs updates on valid set

**Rejected because:**
- Two round trips (slower)
- State could change between validate and execute
- More complex frontend logic
- No real benefit over single-phase approach

### Alternative 4: Queue-Based Processing

**Description:** Add transactions to queue, process asynchronously, notify when complete.

**Rejected because:**
- Unnecessary complexity for this use case
- Synchronous updates are fast enough (< 5 seconds for 100 transactions)
- Harder to provide immediate feedback
- Future consideration if we hit performance limits

## HTTP 207 Multi-Status

### Why 207?

From RFC 4918 (WebDAV):

> The 207 (Multi-Status) status code provides status for multiple independent operations.

**Appropriate for:**
- Bulk operations where some succeed and some fail
- Each item has independent status
- Client needs detailed per-item results

**Our usage fits because:**
- Each transaction has independent validation
- Some transactions may succeed while others fail
- Client needs to know which specific transactions failed

### Client Handling

```typescript
// Frontend handling
const response = await bulkUpdateStatus(transactionIds, status)

if (response.status === 200) {
  // All succeeded
  showToast(`${response.data.successful.length} transactions updated`)
} else if (response.status === 207) {
  // Partial success
  showToast(
    `${response.data.successful.length} succeeded, ${response.data.failed.length} failed`
  )

  // Show details of failures
  response.data.failed.forEach(({ transactionId, error }) => {
    console.log(`Transaction ${transactionId} failed: ${error}`)
  })
}
```

## Related Decisions

- [ADR-001: Transaction Status State Machine](./001-transaction-status-state-machine.md) - Defines validation rules
- [ADR-005: Single Transaction for Bulk Updates](./005-single-transaction-bulk-updates.md) - Database transaction strategy
- [ADR-002: Optimistic Updates with RTK Query](./002-optimistic-updates-rtk-query.md) - Frontend handling

## References

- [RFC 4918 (WebDAV)](https://tools.ietf.org/html/rfc4918#section-11.1)
- [HTTP 207 Multi-Status](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/207)
- Service Implementation: `/home/don/dev/treasurer2026/treasurer-api/src/services/transactionStatusService.ts:bulkChangeTransactionStatus`
- Controller Implementation: `/home/don/dev/treasurer2026/treasurer-api/src/controllers/transactionStatusController.ts:bulkChangeStatus`

---

**Last Updated:** 2026-01-17
