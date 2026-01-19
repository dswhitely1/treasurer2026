# Transaction Edit API Quick Reference

## Endpoints

### Update Transaction
```http
PATCH /api/organizations/{orgId}/accounts/{accountId}/transactions/{transactionId}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "version": 1,                    // REQUIRED: Current version for optimistic locking
  "memo": "Updated memo",          // Optional
  "amount": 125.50,                // Optional
  "transactionType": "EXPENSE",    // Optional: INCOME, EXPENSE, TRANSFER
  "date": "2026-01-15T14:30:00Z",  // Optional: ISO 8601 with timezone
  "vendorId": "uuid",              // Optional: null to remove
  "destinationAccountId": "uuid",  // Optional: Required for TRANSFER
  "applyFee": false,               // Optional
  "splits": [                      // Optional: Must sum to amount
    {
      "categoryName": "Groceries",
      "categoryId": "uuid",        // Optional: Use for hierarchical categories
      "amount": 75.50
    }
  ]
}
```

### Get Transaction History
```http
GET /api/organizations/{orgId}/accounts/{accountId}/transactions/{transactionId}/history?limit=50&offset=0
Authorization: Bearer {jwt_token}
```

## Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Transaction updated |
| 400 | Validation error | Check `errors` field |
| 401 | Unauthorized | Re-authenticate |
| 403 | Forbidden | Need OWNER/ADMIN role |
| 404 | Not found | Transaction/category/vendor missing |
| 409 | Conflict | Reload transaction, retry with new version |
| 500 | Server error | Contact support |

## Common Error Scenarios

### Concurrent Modification (409)
```json
{
  "success": false,
  "errorCode": "CONCURRENT_MODIFICATION",
  "message": "Concurrent modification detected. The transaction has been modified by another user.",
  "data": {
    "currentVersion": 3,
    "providedVersion": 1,
    "lastModifiedBy": "Jane Smith",
    "lastModifiedAt": "2026-01-18T09:20:00Z"
  }
}
```
**Fix**: Fetch transaction again, get current version, retry.

### Reconciled Transaction (400)
```json
{
  "success": false,
  "message": "Cannot modify reconciled transaction. Unreconcile the transaction first to make changes."
}
```
**Fix**: Change status from RECONCILED to CLEARED, then edit.

### Split Amount Mismatch (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "splits": ["Split amounts must equal the transaction amount"]
  }
}
```
**Fix**: Ensure splits sum to transaction amount (±0.01 tolerance).

### Missing Destination (400)
```json
{
  "success": false,
  "message": "Destination account is required for transfer transactions",
  "errors": {
    "destinationAccountId": ["Destination account is required for transfers"]
  }
}
```
**Fix**: Provide `destinationAccountId` for TRANSFER transactions.

## Business Rules Checklist

- [ ] Version field is required (optimistic locking)
- [ ] Cannot edit RECONCILED transactions (unreconcile first)
- [ ] Split amounts must equal transaction amount (±0.01)
- [ ] TRANSFER requires destinationAccountId
- [ ] TRANSFER: source ≠ destination
- [ ] Non-TRANSFER: must not have destinationAccountId
- [ ] Categories must exist and belong to organization
- [ ] Vendor must exist and belong to organization (if provided)
- [ ] Amount must be positive
- [ ] Date must be ISO 8601 with timezone

## Authorization Requirements

| Action | Required Role | Notes |
|--------|---------------|-------|
| Edit transaction | OWNER or ADMIN | Organization-scoped |
| View history | Any member | Read-only access |
| Create transaction | OWNER or ADMIN | Existing behavior |
| Delete transaction | OWNER or ADMIN | Existing behavior |

## Database Fields

### Transaction Audit Fields
- `version` (Integer): Optimistic locking version, starts at 1, increments on each update
- `createdById` (UUID): User who created the transaction
- `lastModifiedById` (UUID, nullable): User who last modified the transaction

### History Entry Fields
- `id` (UUID): History entry ID
- `transactionId` (UUID): Transaction reference
- `editedById` (UUID): User who made the edit
- `editedAt` (Timestamp): When the edit occurred
- `version` (Integer): Transaction version after this edit
- `changes` (JSONB): Array of field changes
- `metadata` (JSONB, nullable): IP, user agent, etc.

## Example Workflows

### Workflow 1: Simple Edit
```
1. GET transaction → {id: "tx123", version: 1, amount: "100.50"}
2. User edits amount to 125.50
3. PATCH transaction → {version: 1, amount: 125.50}
4. Success → {version: 2, amount: "125.50"}
```

### Workflow 2: Concurrent Edit Conflict
```
User A:
1. GET transaction → {id: "tx123", version: 1, amount: "100.50"}
2. Edit amount to 125.50

User B:
1. GET transaction → {id: "tx123", version: 1, amount: "100.50"}
2. Edit amount to 150.00
3. PATCH transaction → {version: 1, amount: 150.00}
4. Success → {version: 2, amount: "150.00"}

User A (continues):
3. PATCH transaction → {version: 1, amount: 125.50}
4. 409 Conflict → {currentVersion: 2, lastModifiedBy: "User B"}
5. GET transaction → {version: 2, amount: "150.00"}
6. Review changes, decide to retry
7. PATCH transaction → {version: 2, amount: 125.50}
8. Success → {version: 3, amount: "125.50"}
```

### Workflow 3: Change Transaction Type
```
1. GET transaction → {id: "tx123", version: 1, type: "EXPENSE", amount: "100.50"}
2. User changes type to TRANSFER
3. PATCH transaction → {
     version: 1,
     transactionType: "TRANSFER",
     destinationAccountId: "acc456",
     splits: [{categoryName: "Transfer", amount: 100.50}]
   }
4. Success → {version: 2, type: "TRANSFER", destinationAccountId: "acc456"}
5. Backend automatically:
   - Reverses EXPENSE impact on source account
   - Applies TRANSFER impact (subtract from source, add to destination)
```

### Workflow 4: View Edit History
```
1. GET /transactions/tx123/history?limit=10&offset=0
2. Response:
   {
     "history": [
       {
         "editedAt": "2026-01-18T10:00:00Z",
         "editedByName": "Jane Smith",
         "version": 3,
         "changes": [
           {"field": "amount", "oldValue": "150.00", "newValue": "125.50"}
         ]
       },
       {
         "editedAt": "2026-01-18T09:00:00Z",
         "editedByName": "User B",
         "version": 2,
         "changes": [
           {"field": "amount", "oldValue": "100.50", "newValue": "150.00"}
         ]
       },
       {
         "editedAt": "2026-01-15T14:30:00Z",
         "editedByName": "John Doe",
         "version": 1,
         "changes": []  // Initial creation
       }
     ],
     "pagination": {
       "total": 3,
       "hasMore": false
     }
   }
```

## Client-Side Implementation Tips

### 1. Track Version in State
```typescript
interface Transaction {
  id: string
  version: number  // Always include in state
  // ... other fields
}
```

### 2. Include Version in PATCH
```typescript
async function updateTransaction(id: string, updates: Partial<Transaction>) {
  const response = await fetch(`/api/.../transactions/${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: transaction.version,  // REQUIRED
      ...updates
    })
  })

  if (response.status === 409) {
    // Handle conflict
    const error = await response.json()
    showConflictDialog(error.data)
  }

  return response.json()
}
```

### 3. Handle 409 Conflicts
```typescript
function showConflictDialog(conflictData: ConflictData) {
  const message = `${conflictData.lastModifiedBy} edited this transaction at ${conflictData.lastModifiedAt}. Your version is outdated.`

  const choice = confirm(`${message}\n\nClick OK to reload the latest version, or Cancel to discard your changes.`)

  if (choice) {
    // Reload transaction
    fetchTransaction(transactionId).then(updated => {
      // Update UI with new data
      // User can retry edit with updated.version
    })
  } else {
    // Discard changes
    closeEditForm()
  }
}
```

### 4. Display Audit Info
```typescript
function TransactionDetails({ transaction }) {
  return (
    <div>
      <p>Amount: {transaction.amount}</p>
      <p>Created by: {transaction.createdByName} on {transaction.createdAt}</p>
      {transaction.lastModifiedByName && (
        <p>Last edited by: {transaction.lastModifiedByName} on {transaction.updatedAt}</p>
      )}
      <button onClick={() => viewHistory(transaction.id)}>View Edit History</button>
    </div>
  )
}
```

### 5. Validate Before Sending
```typescript
function validateTransactionUpdate(transaction: Transaction, updates: Partial<Transaction>) {
  const errors: string[] = []

  // Check splits sum if both amount and splits provided
  if (updates.amount && updates.splits) {
    const sum = updates.splits.reduce((s, split) => s + split.amount, 0)
    if (Math.abs(sum - updates.amount) >= 0.01) {
      errors.push('Split amounts must equal transaction amount')
    }
  }

  // Check TRANSFER has destination
  if (updates.transactionType === 'TRANSFER' && !updates.destinationAccountId) {
    errors.push('Destination account is required for transfers')
  }

  // Check non-TRANSFER doesn't have destination
  if (updates.transactionType && updates.transactionType !== 'TRANSFER' && updates.destinationAccountId) {
    errors.push('Destination account should only be provided for transfers')
  }

  return errors
}
```

## Performance Tips

### 1. Lazy Load History
Only fetch edit history when user explicitly requests it (clicks "View History" button).

### 2. Optimistic UI Updates
Update UI immediately, revert on error:
```typescript
// Optimistically update UI
setTransaction(updatedTransaction)

try {
  const result = await updateTransaction(id, updates)
  // Success: UI already updated
} catch (error) {
  // Revert UI to original state
  setTransaction(originalTransaction)
  showError(error)
}
```

### 3. Debounce Auto-Save
If implementing auto-save, debounce to avoid excessive API calls:
```typescript
const debouncedSave = useMemo(
  () => debounce((updates) => updateTransaction(id, updates), 1000),
  [id]
)

// Call on every change
onChange(updates => debouncedSave(updates))
```

### 4. Cache User Info
Cache creator/editor names to avoid repeated lookups:
```typescript
const userCache = new Map<string, { name: string, email: string }>()

function getUserInfo(userId: string) {
  if (userCache.has(userId)) {
    return userCache.get(userId)
  }
  // Fetch and cache
  const user = await fetchUser(userId)
  userCache.set(userId, user)
  return user
}
```

## Testing Checklist

### Unit Tests
- [ ] Zod schema validation (version required, amount positive, etc.)
- [ ] Split sum validation
- [ ] Transfer validation (destination required, source ≠ destination)

### Integration Tests
- [ ] Optimistic locking: concurrent edits return 409
- [ ] Balance accuracy after edit
- [ ] Audit trail created correctly
- [ ] Authorization: MEMBER cannot edit, OWNER/ADMIN can

### E2E Tests
- [ ] Happy path: edit transaction successfully
- [ ] Conflict resolution: handle 409, reload, retry
- [ ] Reconciled protection: cannot edit RECONCILED transaction
- [ ] History viewing: see complete audit trail

### Edge Cases
- [ ] Edit non-existent transaction (404)
- [ ] Edit with invalid version (409)
- [ ] Edit reconciled transaction (400)
- [ ] Change EXPENSE to TRANSFER without destinationAccountId (400)
- [ ] Splits don't sum to amount (400)
- [ ] Category doesn't exist (404)
- [ ] Vendor doesn't exist (404)

## Monitoring & Observability

### Metrics to Track
- **Conflict rate**: % of updates resulting in 409 errors
- **Edit frequency**: Average edits per transaction
- **Response times**: P50, P95, P99 for PATCH requests
- **Error rates**: % of requests by status code

### Logging
Log all edit operations:
```typescript
logger.info('Transaction updated', {
  transactionId,
  userId,
  oldVersion: existing.version,
  newVersion: updated.version,
  changes: changeCount
})
```

### Alerts
- Alert if conflict rate > 5% (may indicate UX issue)
- Alert if error rate > 1%
- Alert if P95 response time > 100ms

## Summary

This quick reference provides:
- API endpoint specifications
- Common error scenarios and fixes
- Business rule checklist
- Example workflows
- Client-side implementation tips
- Testing checklist
- Monitoring guidance

For detailed specifications, see:
- `transaction-edit-api-spec.md` - Complete OpenAPI spec
- `transaction-edit-architecture.md` - Architecture diagrams
- `transaction-edit-database-schema.md` - Database schema
- `transaction-edit-implementation-summary.md` - Full implementation guide
