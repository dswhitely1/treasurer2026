# Transaction Edit API Specification

## Overview

This document defines the backend service architecture and API contracts for transaction editing with comprehensive audit trails, optimistic locking for concurrent edit protection, and robust error handling.

## Table of Contents

1. [OpenAPI Specification](#openapi-specification)
2. [Service Layer Architecture](#service-layer-architecture)
3. [Authorization & Validation Rules](#authorization--validation-rules)
4. [Error Handling Strategy](#error-handling-strategy)
5. [Request/Response Examples](#requestresponse-examples)

---

## OpenAPI Specification

### 1. PATCH Transaction Endpoint

#### Path

```
PATCH /api/organizations/{orgId}/accounts/{accountId}/transactions/{transactionId}
```

#### OpenAPI Schema

```yaml
/api/organizations/{orgId}/accounts/{accountId}/transactions/{transactionId}:
  patch:
    tags:
      - Transactions
    summary: Update a transaction with optimistic locking
    description: |
      Updates a transaction's details including amount, date, type, splits, and vendor.
      Supports optimistic locking via version field to prevent concurrent modification conflicts.
      Automatically creates audit trail entry recording who made changes and when.

      Business Rules:
      - Cannot edit reconciled transactions (status = RECONCILED)
      - Reconciled status can only be changed via the status change endpoint
      - Must be OWNER or ADMIN of the organization
      - Split amounts must equal transaction amount
      - Transfer transactions require destination account
      - Version field is required for optimistic locking
    security:
      - bearerAuth: []
    parameters:
      - name: orgId
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Organization ID
      - name: accountId
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Account ID
      - name: transactionId
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Transaction ID
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/UpdateTransactionRequest'
          examples:
            simpleUpdate:
              summary: Simple memo and amount update
              value:
                version: 1
                memo: "Updated grocery shopping"
                amount: 125.50
            typeChange:
              summary: Change transaction type
              value:
                version: 2
                transactionType: "INCOME"
                amount: 500.00
                splits:
                  - categoryName: "Salary"
                    categoryId: "c7f3e8d1-4b6a-4c9e-8f2a-1d3e4f5a6b7c"
                    amount: 500.00
            transferUpdate:
              summary: Update transfer transaction
              value:
                version: 3
                amount: 1000.00
                destinationAccountId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                splits:
                  - categoryName: "Account Transfer"
                    categoryId: "d8e4f9a2-5c7b-4d0e-9f3a-2e4f5a6b7c8d"
                    amount: 1000.00
    responses:
      '200':
        description: Transaction updated successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateTransactionResponse'
            examples:
              success:
                value:
                  success: true
                  message: "Transaction updated successfully"
                  data:
                    transaction:
                      id: "t123e4567-e89b-12d3-a456-426614174000"
                      memo: "Updated grocery shopping"
                      amount: "125.50"
                      transactionType: "EXPENSE"
                      date: "2026-01-15T14:30:00Z"
                      feeAmount: null
                      vendorId: "v789f0123-e45b-67c8-d901-234567890abc"
                      vendorName: "Whole Foods"
                      accountId: "a456b789-c012-3def-4567-890123456789"
                      destinationAccountId: null
                      status: "CLEARED"
                      clearedAt: "2026-01-16T10:00:00Z"
                      reconciledAt: null
                      version: 2
                      createdById: "u123e4567-e89b-12d3-a456-426614174000"
                      createdByName: "John Doe"
                      createdByEmail: "john@example.com"
                      lastModifiedById: "u987f6543-a21b-09c8-d765-432109876543"
                      lastModifiedByName: "Jane Smith"
                      lastModifiedByEmail: "jane@example.com"
                      splits:
                        - id: "s123e4567-e89b-12d3-a456-426614174000"
                          amount: "75.50"
                          categoryId: "c456b789-c012-3def-4567-890123456789"
                          categoryName: "Groceries"
                        - id: "s234f5678-f90a-23e4-b567-537725285111"
                          amount: "50.00"
                          categoryId: "c567c890-d123-4ef0-5678-901234567890"
                          categoryName: "Household"
                      createdAt: "2026-01-15T14:30:00Z"
                      updatedAt: "2026-01-18T09:15:00Z"
      '400':
        description: Validation error or business rule violation
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
            examples:
              validationError:
                value:
                  success: false
                  message: "Validation failed"
                  errors:
                    splits: ["Split amounts must equal the transaction amount"]
              reconciled:
                value:
                  success: false
                  message: "Cannot modify reconciled transaction. Unreconcile the transaction first to make changes."
              missingDestination:
                value:
                  success: false
                  message: "Destination account is required for transfer transactions"
                  errors:
                    destinationAccountId: ["Destination account is required for transfers"]
      '401':
        description: Unauthorized - missing or invalid JWT token
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
            example:
              success: false
              message: "Unauthorized"
      '403':
        description: Forbidden - insufficient permissions
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
            example:
              success: false
              message: "Insufficient permissions. OWNER or ADMIN role required."
      '404':
        description: Transaction, account, or organization not found
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
            examples:
              transactionNotFound:
                value:
                  success: false
                  message: "Transaction not found"
              categoryNotFound:
                value:
                  success: false
                  message: "Category Groceries not found"
      '409':
        description: Conflict - concurrent modification detected (optimistic locking failure)
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ConcurrentModificationError'
            example:
              success: false
              message: "Concurrent modification detected. The transaction has been modified by another user."
              errorCode: "CONCURRENT_MODIFICATION"
              data:
                currentVersion: 3
                providedVersion: 1
                lastModifiedBy: "Jane Smith"
                lastModifiedAt: "2026-01-18T08:45:00Z"
                lastModifiedById: "u987f6543-a21b-09c8-d765-432109876543"
      '500':
        description: Internal server error
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
            example:
              success: false
              message: "Internal server error"
```

### 2. GET Transaction Edit History Endpoint

#### Path

```
GET /api/organizations/{orgId}/accounts/{accountId}/transactions/{transactionId}/history
```

#### OpenAPI Schema

```yaml
/api/organizations/{orgId}/accounts/{accountId}/transactions/{transactionId}/history:
  get:
    tags:
      - Transactions
    summary: Get transaction edit history audit trail
    description: |
      Retrieves the complete audit trail of all edits made to a transaction.
      Shows who made changes, when, what changed, and previous values.
      Useful for compliance, debugging, and understanding transaction lifecycle.

      Requires organization membership (any role).
    security:
      - bearerAuth: []
    parameters:
      - name: orgId
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Organization ID
      - name: accountId
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Account ID
      - name: transactionId
        in: path
        required: true
        schema:
          type: string
          format: uuid
        description: Transaction ID
      - name: limit
        in: query
        schema:
          type: integer
          minimum: 1
          maximum: 100
          default: 50
        description: Maximum number of history entries to return
      - name: offset
        in: query
        schema:
          type: integer
          minimum: 0
          default: 0
        description: Number of history entries to skip
    responses:
      '200':
        description: Transaction edit history retrieved successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TransactionHistoryResponse'
            example:
              success: true
              data:
                history:
                  - id: "h345f6789-g01a-34e5-c678-648836396222"
                    transactionId: "t123e4567-e89b-12d3-a456-426614174000"
                    editedAt: "2026-01-18T09:15:00Z"
                    editedById: "u987f6543-a21b-09c8-d765-432109876543"
                    editedByName: "Jane Smith"
                    editedByEmail: "jane@example.com"
                    version: 2
                    changes:
                      - field: "memo"
                        oldValue: "Grocery shopping"
                        newValue: "Updated grocery shopping"
                      - field: "amount"
                        oldValue: "100.50"
                        newValue: "125.50"
                      - field: "splits"
                        oldValue:
                          - categoryName: "Groceries"
                            amount: "100.50"
                        newValue:
                          - categoryName: "Groceries"
                            amount: "75.50"
                          - categoryName: "Household"
                            amount: "50.00"
                    metadata:
                      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
                      ipAddress: "192.168.1.100"
                  - id: "h234e5678-f90a-23e4-b567-537725285111"
                    transactionId: "t123e4567-e89b-12d3-a456-426614174000"
                    editedAt: "2026-01-15T14:30:00Z"
                    editedById: "u123e4567-e89b-12d3-a456-426614174000"
                    editedByName: "John Doe"
                    editedByEmail: "john@example.com"
                    version: 1
                    changes: []
                    metadata:
                      action: "CREATED"
                pagination:
                  total: 2
                  limit: 50
                  offset: 0
                  hasMore: false
      '401':
        description: Unauthorized
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
      '403':
        description: Forbidden - not a member of the organization
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
      '404':
        description: Transaction not found
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
```

### 3. Component Schemas

```yaml
components:
  schemas:
    UpdateTransactionRequest:
      type: object
      required:
        - version
      properties:
        version:
          type: integer
          description: Current version of the transaction for optimistic locking
          example: 1
        memo:
          type: string
          maxLength: 1000
          nullable: true
          description: Transaction memo/description
          example: "Updated grocery shopping"
        amount:
          type: number
          format: decimal
          minimum: 0.01
          description: Transaction amount (must be positive)
          example: 125.50
        transactionType:
          type: string
          enum: [INCOME, EXPENSE, TRANSFER]
          description: Type of transaction
          example: "EXPENSE"
        date:
          type: string
          format: date-time
          description: Transaction date (ISO 8601 format with timezone)
          example: "2026-01-15T14:30:00Z"
        applyFee:
          type: boolean
          description: Whether to apply transaction fee from account settings
          example: false
        vendorId:
          type: string
          format: uuid
          nullable: true
          description: Vendor ID (set to null to remove vendor)
          example: "v789f0123-e45b-67c8-d901-234567890abc"
        destinationAccountId:
          type: string
          format: uuid
          nullable: true
          description: Destination account ID for TRANSFER transactions
          example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        splits:
          type: array
          minItems: 1
          description: Category splits (must sum to transaction amount)
          items:
            type: object
            required:
              - categoryName
              - amount
            properties:
              categoryName:
                type: string
                minLength: 1
                maxLength: 100
                description: Category name
                example: "Groceries"
              categoryId:
                type: string
                format: uuid
                description: Category ID (optional, used for hierarchical categories)
                example: "c456b789-c012-3def-4567-890123456789"
              amount:
                type: number
                format: decimal
                minimum: 0.01
                description: Split amount
                example: 75.50

    UpdateTransactionResponse:
      type: object
      properties:
        success:
          type: boolean
          example: true
        message:
          type: string
          example: "Transaction updated successfully"
        data:
          type: object
          properties:
            transaction:
              $ref: '#/components/schemas/TransactionWithAudit'

    TransactionWithAudit:
      type: object
      properties:
        id:
          type: string
          format: uuid
        memo:
          type: string
          nullable: true
        amount:
          type: string
          format: decimal
        transactionType:
          type: string
          enum: [INCOME, EXPENSE, TRANSFER]
        date:
          type: string
          format: date-time
        feeAmount:
          type: string
          format: decimal
          nullable: true
        vendorId:
          type: string
          format: uuid
          nullable: true
        vendorName:
          type: string
          nullable: true
        accountId:
          type: string
          format: uuid
        destinationAccountId:
          type: string
          format: uuid
          nullable: true
        status:
          type: string
          enum: [UNCLEARED, CLEARED, RECONCILED]
        clearedAt:
          type: string
          format: date-time
          nullable: true
        reconciledAt:
          type: string
          format: date-time
          nullable: true
        version:
          type: integer
          description: Current version number for optimistic locking
          example: 2
        createdById:
          type: string
          format: uuid
          description: User ID who created the transaction
        createdByName:
          type: string
          description: Name of user who created the transaction
        createdByEmail:
          type: string
          format: email
          description: Email of user who created the transaction
        lastModifiedById:
          type: string
          format: uuid
          description: User ID who last modified the transaction
        lastModifiedByName:
          type: string
          description: Name of user who last modified the transaction
        lastModifiedByEmail:
          type: string
          format: email
          description: Email of user who last modified the transaction
        splits:
          type: array
          items:
            type: object
            properties:
              id:
                type: string
                format: uuid
              amount:
                type: string
                format: decimal
              categoryId:
                type: string
                format: uuid
              categoryName:
                type: string
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    TransactionHistoryResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            history:
              type: array
              items:
                $ref: '#/components/schemas/TransactionEditHistoryEntry'
            pagination:
              type: object
              properties:
                total:
                  type: integer
                limit:
                  type: integer
                offset:
                  type: integer
                hasMore:
                  type: boolean

    TransactionEditHistoryEntry:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: History entry ID
        transactionId:
          type: string
          format: uuid
          description: Transaction ID
        editedAt:
          type: string
          format: date-time
          description: When the edit was made
        editedById:
          type: string
          format: uuid
          description: User ID who made the edit
        editedByName:
          type: string
          description: Name of user who made the edit
        editedByEmail:
          type: string
          format: email
          description: Email of user who made the edit
        version:
          type: integer
          description: Transaction version after this edit
        changes:
          type: array
          description: List of field changes made in this edit
          items:
            type: object
            properties:
              field:
                type: string
                description: Field name that was changed
                example: "amount"
              oldValue:
                description: Previous value (type varies by field)
                example: "100.50"
              newValue:
                description: New value (type varies by field)
                example: "125.50"
        metadata:
          type: object
          description: Additional metadata about the edit
          properties:
            action:
              type: string
              description: Action type (CREATED, UPDATED)
              example: "UPDATED"
            userAgent:
              type: string
              description: Browser/client user agent
            ipAddress:
              type: string
              description: IP address of the client

    ErrorResponse:
      type: object
      properties:
        success:
          type: boolean
          example: false
        message:
          type: string
          description: Error message
        errors:
          type: object
          additionalProperties:
            type: array
            items:
              type: string
          description: Field-level validation errors

    ConcurrentModificationError:
      type: object
      properties:
        success:
          type: boolean
          example: false
        message:
          type: string
          example: "Concurrent modification detected. The transaction has been modified by another user."
        errorCode:
          type: string
          example: "CONCURRENT_MODIFICATION"
        data:
          type: object
          properties:
            currentVersion:
              type: integer
              description: Current version in database
              example: 3
            providedVersion:
              type: integer
              description: Version provided in request
              example: 1
            lastModifiedBy:
              type: string
              description: Name of user who last modified the transaction
              example: "Jane Smith"
            lastModifiedAt:
              type: string
              format: date-time
              description: When the last modification occurred
              example: "2026-01-18T08:45:00Z"
            lastModifiedById:
              type: string
              format: uuid
              description: User ID who last modified the transaction
```

---

## Service Layer Architecture

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Controller Layer                         │
│                   (transactionController.ts)                     │
│  - HTTP request/response handling                                │
│  - Parameter extraction                                          │
│  - Response formatting                                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Middleware Layer                            │
│  - authenticate: JWT validation, user extraction                 │
│  - requireOrgRole: OWNER/ADMIN authorization check              │
│  - validate: Zod schema validation                              │
│  - preventReconciledModification: Business rule check           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer (Business Logic)                │
│                   (transactionService.ts)                        │
│                                                                  │
│  updateTransactionWithAudit(orgId, accountId, txId, data, user) │
│  ├─ 1. Fetch transaction with current version                   │
│  ├─ 2. Verify optimistic lock (version check)                   │
│  ├─ 3. Validate business rules                                  │
│  ├─ 4. Calculate balance adjustments                            │
│  ├─ 5. Build change log (diff old vs new)                       │
│  ├─ 6. Execute database transaction:                            │
│  │    ├─ Update transaction (increment version)                 │
│  │    ├─ Update splits (delete old, create new)                 │
│  │    ├─ Adjust account balances                                │
│  │    ├─ Create audit trail entry                               │
│  │    └─ Update audit fields (lastModifiedById)                 │
│  └─ 7. Return updated transaction with audit info               │
│                                                                  │
│  getTransactionHistory(orgId, accountId, txId, pagination)      │
│  ├─ 1. Verify transaction exists and org membership             │
│  ├─ 2. Fetch edit history entries with user info                │
│  └─ 3. Return formatted history with pagination                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Access Layer                            │
│                    (Prisma Client)                               │
│  - Transaction management (ACID guarantees)                      │
│  - Optimistic locking via version field                         │
│  - Cascading operations                                          │
│  - Change tracking                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Service Layer Components

#### 1. Transaction Update Service

**File**: `src/services/transactionService.ts`

**Function**: `updateTransactionWithAudit`

**Responsibilities**:
- Optimistic locking verification
- Business rule validation (reconciled check, transfer validation, etc.)
- Change detection and diff generation
- Coordinated database transaction
- Balance recalculation
- Audit trail creation

**Core Algorithm**:

```typescript
async function updateTransactionWithAudit(
  organizationId: string,
  accountId: string,
  transactionId: string,
  input: UpdateTransactionDto,
  userId: string // From JWT auth
): Promise<TransactionInfo> {

  // Step 1: Fetch existing transaction with all relations
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, accountId, account: { organizationId } },
    include: {
      splits: { include: { category: true } },
      account: true,
      destinationAccount: true,
      createdBy: { select: { id: true, name: true, email: true } },
      lastModifiedBy: { select: { id: true, name: true, email: true } }
    }
  })

  if (!existing) throw new AppError('Transaction not found', 404)

  // Step 2: Optimistic lock check
  if (existing.version !== input.version) {
    throw new AppError('Concurrent modification detected', 409, {
      errorCode: 'CONCURRENT_MODIFICATION',
      currentVersion: existing.version,
      providedVersion: input.version,
      lastModifiedBy: existing.lastModifiedBy?.name,
      lastModifiedAt: existing.updatedAt,
      lastModifiedById: existing.lastModifiedById
    })
  }

  // Step 3: Business rule validations
  // (Already handled by preventReconciledModification middleware)
  // Additional validations for transfers, splits, etc.

  // Step 4: Build change log (diff)
  const changes = buildChangeLog(existing, input)

  // Step 5: Calculate balance adjustments
  const balanceAdjustments = calculateBalanceAdjustments(
    existing,
    input,
    existing.account.transactionFee
  )

  // Step 6: Execute database transaction
  const updated = await prisma.$transaction(async (tx) => {
    // 6a. Delete old splits if updating
    if (input.splits) {
      await tx.transactionSplit.deleteMany({
        where: { transactionId }
      })
    }

    // 6b. Update transaction with version increment
    const transaction = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        ...buildUpdateData(input),
        version: { increment: 1 },
        lastModifiedById: userId,
        updatedAt: new Date()
      },
      include: {
        splits: { include: { category: true } },
        vendor: true,
        createdBy: { select: { id: true, name: true, email: true } },
        lastModifiedBy: { select: { id: true, name: true, email: true } }
      }
    })

    // 6c. Apply balance adjustments
    await applyBalanceAdjustments(tx, balanceAdjustments)

    // 6d. Create audit trail entry
    await tx.transactionEditHistory.create({
      data: {
        transactionId,
        editedById: userId,
        version: transaction.version,
        changes: changes,
        metadata: extractMetadata(req) // IP, user agent, etc.
      }
    })

    return transaction
  })

  // Step 7: Format and return
  return formatTransactionWithAudit(updated)
}
```

#### 2. Change Detection Service

**Function**: `buildChangeLog`

Detects differences between existing and new transaction data:

```typescript
interface FieldChange {
  field: string
  oldValue: unknown
  newValue: unknown
}

function buildChangeLog(
  existing: TransactionWithRelations,
  input: UpdateTransactionDto
): FieldChange[] {
  const changes: FieldChange[] = []

  // Check simple fields
  if (input.memo !== undefined && input.memo !== existing.memo) {
    changes.push({
      field: 'memo',
      oldValue: existing.memo,
      newValue: input.memo
    })
  }

  if (input.amount !== undefined && input.amount !== existing.amount.toNumber()) {
    changes.push({
      field: 'amount',
      oldValue: existing.amount.toString(),
      newValue: input.amount.toString()
    })
  }

  // Check complex fields (splits)
  if (input.splits) {
    const oldSplits = existing.splits.map(s => ({
      categoryName: s.category.name,
      amount: s.amount.toString()
    }))
    const newSplits = input.splits.map(s => ({
      categoryName: s.categoryName,
      amount: s.amount.toString()
    }))

    if (!deepEqual(oldSplits, newSplits)) {
      changes.push({
        field: 'splits',
        oldValue: oldSplits,
        newValue: newSplits
      })
    }
  }

  // ... other fields

  return changes
}
```

#### 3. Balance Adjustment Calculator

**Function**: `calculateBalanceAdjustments`

Determines account balance changes based on transaction type changes:

```typescript
interface BalanceAdjustment {
  accountId: string
  adjustment: number
}

function calculateBalanceAdjustments(
  existing: Transaction,
  input: UpdateTransactionDto,
  accountFee: Decimal | null
): BalanceAdjustment[] {
  const oldType = existing.transactionType
  const newType = input.transactionType ?? oldType
  const oldAmount = existing.amount.toNumber()
  const newAmount = input.amount ?? oldAmount
  const oldFee = existing.feeAmount?.toNumber() ?? 0

  // Calculate new fee
  let newFee = oldFee
  if (input.applyFee !== undefined) {
    newFee = input.applyFee && accountFee ? accountFee.toNumber() : 0
  }

  const adjustments: BalanceAdjustment[] = []

  // Handle different type transitions
  if (oldType === 'TRANSFER' && newType === 'TRANSFER') {
    // TRANSFER -> TRANSFER: Complex logic for destination changes
    // ... (see existing service implementation)
  } else if (oldType === 'TRANSFER' && newType !== 'TRANSFER') {
    // TRANSFER -> INCOME/EXPENSE
    // Reverse old transfer, apply new type
    // ...
  } else if (oldType !== 'TRANSFER' && newType === 'TRANSFER') {
    // INCOME/EXPENSE -> TRANSFER
    // Reverse old type, apply new transfer
    // ...
  } else {
    // INCOME/EXPENSE -> INCOME/EXPENSE
    const oldImpact = oldType === 'INCOME' ? oldAmount - oldFee : -(oldAmount + oldFee)
    const newImpact = newType === 'INCOME' ? newAmount - newFee : -(newAmount + newFee)
    const adjustment = newImpact - oldImpact

    if (adjustment !== 0) {
      adjustments.push({
        accountId: existing.accountId,
        adjustment
      })
    }
  }

  return adjustments
}
```

#### 4. Transaction History Service

**Function**: `getTransactionHistory`

```typescript
async function getTransactionHistory(
  organizationId: string,
  accountId: string,
  transactionId: string,
  pagination: { limit: number; offset: number }
): Promise<{ history: TransactionEditHistoryEntry[]; total: number }> {

  // Verify transaction exists and user has access
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      accountId,
      account: { organizationId }
    }
  })

  if (!transaction) {
    throw new AppError('Transaction not found', 404)
  }

  // Fetch history with user info
  const [history, total] = await Promise.all([
    prisma.transactionEditHistory.findMany({
      where: { transactionId },
      include: {
        editedBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { editedAt: 'desc' },
      take: pagination.limit,
      skip: pagination.offset
    }),
    prisma.transactionEditHistory.count({
      where: { transactionId }
    })
  ])

  return {
    history: history.map(formatHistoryEntry),
    total
  }
}
```

### Database Transaction Isolation

All update operations use Prisma's `$transaction` API with default isolation level (READ COMMITTED) to ensure ACID properties:

- **Atomicity**: All or nothing - balance updates, split changes, and audit entries succeed or fail together
- **Consistency**: Version increments and balance calculations maintain data integrity
- **Isolation**: Optimistic locking prevents lost updates from concurrent modifications
- **Durability**: Committed changes are persisted

---

## Authorization & Validation Rules

### Authorization Rules

#### 1. Transaction Updates (PATCH)

| Rule | Requirement | Middleware/Service |
|------|-------------|-------------------|
| Authentication | Valid JWT token required | `authenticate` middleware |
| Organization Role | OWNER or ADMIN role required | `requireOrgRole('OWNER', 'ADMIN')` middleware |
| Organization Membership | User must be member of transaction's organization | Implicit via `requireOrgRole` |
| Account Ownership | Account must belong to organization | Service layer validation |
| Transaction Ownership | Transaction must belong to account | Service layer validation |

#### 2. Transaction History (GET)

| Rule | Requirement | Middleware/Service |
|------|-------------|-------------------|
| Authentication | Valid JWT token required | `authenticate` middleware |
| Organization Membership | User must be member of organization | `requireOrgMembership()` middleware |
| Account Ownership | Account must belong to organization | Service layer validation |
| Transaction Ownership | Transaction must belong to account | Service layer validation |

### Validation Rules

#### 1. Optimistic Locking

```typescript
// Rule: Version field is required in request
if (!input.version) {
  throw new AppError('Version field is required for optimistic locking', 400)
}

// Rule: Version must match current database version
if (existing.version !== input.version) {
  throw new ConcurrentModificationError(...)
}
```

#### 2. Reconciled Transaction Protection

```typescript
// Rule: Cannot edit reconciled transactions
// Handled by preventReconciledModification() middleware
if (existing.status === 'RECONCILED') {
  throw new AppError(
    'Cannot modify reconciled transaction. Unreconcile the transaction first to make changes.',
    400
  )
}
```

#### 3. Split Amount Validation

```typescript
// Rule: Split amounts must equal transaction amount (within 0.01 tolerance)
if (input.splits && input.amount) {
  const splitsTotal = input.splits.reduce((sum, s) => sum + s.amount, 0)
  if (Math.abs(splitsTotal - input.amount) >= 0.01) {
    throw new AppError('Split amounts must equal the transaction amount', 400, {
      errors: { splits: ['Split amounts must equal the transaction amount'] }
    })
  }
}
```

#### 4. Transfer Transaction Validation

```typescript
// Rule: TRANSFER requires destination account
if (input.transactionType === 'TRANSFER' || (existing.transactionType === 'TRANSFER' && !input.transactionType)) {
  const destinationId = input.destinationAccountId ?? existing.destinationAccountId

  if (!destinationId) {
    throw new AppError('Destination account is required for transfer transactions', 400)
  }

  // Rule: Source and destination must be different
  if (destinationId === accountId) {
    throw new AppError('Source and destination accounts must be different', 400)
  }

  // Rule: Destination account must exist and belong to org
  const destAccount = await prisma.account.findFirst({
    where: { id: destinationId, organizationId }
  })

  if (!destAccount) {
    throw new AppError('Destination account not found', 404)
  }
}

// Rule: Non-TRANSFER transactions must not have destination account
if (input.transactionType && input.transactionType !== 'TRANSFER' && input.destinationAccountId) {
  throw new AppError(
    'Destination account should only be provided for transfer transactions',
    400
  )
}
```

#### 5. Category Validation

```typescript
// Rule: Categories must exist and belong to organization
if (input.splits) {
  for (const split of input.splits) {
    if (split.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: split.categoryId, organizationId }
      })

      if (!category) {
        throw new AppError(`Category ${split.categoryName} not found`, 404)
      }
    }
  }
}
```

#### 6. Vendor Validation

```typescript
// Rule: Vendor must exist and belong to organization (if provided)
if (input.vendorId !== undefined && input.vendorId !== null) {
  const isValid = await validateVendorOwnership(input.vendorId, organizationId)
  if (!isValid) {
    throw new AppError('Vendor not found or inactive', 404)
  }
}
```

#### 7. Date Validation

```typescript
// Rule: Date must be valid ISO 8601 format with timezone
// Handled by Zod schema validation: z.string().datetime({ offset: true })
```

#### 8. Amount Validation

```typescript
// Rule: Amount must be positive
// Handled by Zod schema validation: z.number().positive()
```

---

## Error Handling Strategy

### Error Classification

#### 1. Client Errors (4xx)

**400 Bad Request** - Validation failures, business rule violations

```typescript
class ValidationError extends AppError {
  constructor(message: string, errors?: Record<string, string[]>) {
    super(message, 400, errors)
  }
}

// Examples:
// - Split amounts don't match transaction amount
// - Reconciled transaction modification attempt
// - Missing destination account for TRANSFER
// - Invalid amount or date format
```

**401 Unauthorized** - Authentication failures

```typescript
// Thrown by authenticate middleware
// - Missing JWT token
// - Invalid JWT token
// - Expired JWT token
```

**403 Forbidden** - Authorization failures

```typescript
// Thrown by requireOrgRole middleware
// - User not a member of organization
// - User role insufficient (MEMBER trying to edit)
```

**404 Not Found** - Resource not found

```typescript
// - Transaction not found
// - Account not found
// - Organization not found
// - Category not found
// - Vendor not found
```

**409 Conflict** - Concurrent modification

```typescript
class ConcurrentModificationError extends AppError {
  constructor(
    currentVersion: number,
    providedVersion: number,
    lastModifiedBy: string | null,
    lastModifiedAt: Date,
    lastModifiedById: string | null
  ) {
    super(
      'Concurrent modification detected. The transaction has been modified by another user.',
      409,
      {
        errorCode: 'CONCURRENT_MODIFICATION',
        currentVersion,
        providedVersion,
        lastModifiedBy,
        lastModifiedAt: lastModifiedAt.toISOString(),
        lastModifiedById
      }
    )
  }
}
```

#### 2. Server Errors (5xx)

**500 Internal Server Error** - Unexpected errors

```typescript
// - Database connection failures
// - Unexpected exceptions
// - Prisma errors not explicitly handled
```

### Error Response Structure

All errors follow consistent `ApiResponse` format:

```typescript
interface ApiResponse {
  success: boolean
  message: string
  errors?: Record<string, string[]>
  data?: unknown
}
```

### Error Handler Middleware

Enhanced error handler with optimistic locking support:

```typescript
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Handle AppError (including ConcurrentModificationError)
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      message: err.message,
      errors: err.errors
    }

    // Include additional data for 409 Conflict
    if (err.statusCode === 409 && err.errors) {
      response.data = {
        errorCode: err.errors.errorCode,
        currentVersion: err.errors.currentVersion,
        providedVersion: err.errors.providedVersion,
        lastModifiedBy: err.errors.lastModifiedBy,
        lastModifiedAt: err.errors.lastModifiedAt,
        lastModifiedById: err.errors.lastModifiedById
      }
      delete response.errors // Move structured data to data field
    }

    return res.status(err.statusCode).json(response)
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {}
    for (const issue of err.issues) {
      const path = issue.path.join('.')
      if (!errors[path]) errors[path] = []
      errors[path].push(issue.message)
    }
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    })
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      })
    }
  }

  // Log unexpected errors
  console.error('Unhandled error:', err)

  const message = env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message

  return res.status(500).json({
    success: false,
    message
  })
}
```

### Client-Side Error Handling Guidance

#### Handling 409 Conflict (Concurrent Modification)

When a 409 error is received, the client should:

1. Extract current transaction version from error response
2. Display user-friendly message indicating another user made changes
3. Provide options:
   - **Reload**: Fetch current transaction data and display changes
   - **Force Update**: (Optional) Allow user to overwrite with current version
   - **Cancel**: Discard local changes

Example client handling:

```typescript
try {
  await updateTransaction(txId, { version: 1, amount: 100 })
} catch (error) {
  if (error.status === 409 && error.errorCode === 'CONCURRENT_MODIFICATION') {
    // Show conflict dialog
    const choice = await showConflictDialog({
      message: `${error.lastModifiedBy} edited this transaction at ${error.lastModifiedAt}`,
      currentVersion: error.currentVersion
    })

    if (choice === 'reload') {
      // Fetch fresh data
      const fresh = await getTransaction(txId)
      // Update UI with fresh.version
    }
  }
}
```

---

## Request/Response Examples

### Example 1: Simple Amount and Memo Update

**Request**:
```http
PATCH /api/organizations/org123/accounts/acc456/transactions/tx789
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "version": 1,
  "memo": "Updated grocery shopping at Whole Foods",
  "amount": 125.50
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Transaction updated successfully",
  "data": {
    "transaction": {
      "id": "tx789",
      "memo": "Updated grocery shopping at Whole Foods",
      "amount": "125.50",
      "transactionType": "EXPENSE",
      "date": "2026-01-15T14:30:00Z",
      "feeAmount": null,
      "vendorId": "v123",
      "vendorName": "Whole Foods",
      "accountId": "acc456",
      "destinationAccountId": null,
      "status": "CLEARED",
      "clearedAt": "2026-01-16T10:00:00Z",
      "reconciledAt": null,
      "version": 2,
      "createdById": "u111",
      "createdByName": "John Doe",
      "createdByEmail": "john@example.com",
      "lastModifiedById": "u222",
      "lastModifiedByName": "Jane Smith",
      "lastModifiedByEmail": "jane@example.com",
      "splits": [
        {
          "id": "split1",
          "amount": "75.50",
          "categoryId": "cat1",
          "categoryName": "Groceries"
        },
        {
          "id": "split2",
          "amount": "50.00",
          "categoryId": "cat2",
          "categoryName": "Household"
        }
      ],
      "createdAt": "2026-01-15T14:30:00Z",
      "updatedAt": "2026-01-18T09:15:00Z"
    }
  }
}
```

### Example 2: Change Transaction Type to TRANSFER

**Request**:
```http
PATCH /api/organizations/org123/accounts/acc456/transactions/tx789
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "version": 2,
  "transactionType": "TRANSFER",
  "amount": 1000.00,
  "destinationAccountId": "acc999",
  "splits": [
    {
      "categoryName": "Account Transfer",
      "categoryId": "cat-transfer",
      "amount": 1000.00
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Transaction updated successfully",
  "data": {
    "transaction": {
      "id": "tx789",
      "memo": "Updated grocery shopping at Whole Foods",
      "amount": "1000.00",
      "transactionType": "TRANSFER",
      "date": "2026-01-15T14:30:00Z",
      "feeAmount": null,
      "vendorId": null,
      "vendorName": null,
      "accountId": "acc456",
      "destinationAccountId": "acc999",
      "status": "CLEARED",
      "clearedAt": "2026-01-16T10:00:00Z",
      "reconciledAt": null,
      "version": 3,
      "createdById": "u111",
      "createdByName": "John Doe",
      "createdByEmail": "john@example.com",
      "lastModifiedById": "u222",
      "lastModifiedByName": "Jane Smith",
      "lastModifiedByEmail": "jane@example.com",
      "splits": [
        {
          "id": "split-new",
          "amount": "1000.00",
          "categoryId": "cat-transfer",
          "categoryName": "Account Transfer"
        }
      ],
      "createdAt": "2026-01-15T14:30:00Z",
      "updatedAt": "2026-01-18T09:20:00Z"
    }
  }
}
```

### Example 3: Concurrent Modification Error

**Request**:
```http
PATCH /api/organizations/org123/accounts/acc456/transactions/tx789
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "version": 1,
  "amount": 150.00
}
```

**Response** (409 Conflict):
```json
{
  "success": false,
  "message": "Concurrent modification detected. The transaction has been modified by another user.",
  "errorCode": "CONCURRENT_MODIFICATION",
  "data": {
    "currentVersion": 3,
    "providedVersion": 1,
    "lastModifiedBy": "Jane Smith",
    "lastModifiedAt": "2026-01-18T09:20:00Z",
    "lastModifiedById": "u222"
  }
}
```

### Example 4: Reconciled Transaction Error

**Request**:
```http
PATCH /api/organizations/org123/accounts/acc456/transactions/tx999
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "version": 5,
  "amount": 200.00
}
```

**Response** (400 Bad Request):
```json
{
  "success": false,
  "message": "Cannot modify reconciled transaction. Unreconcile the transaction first to make changes."
}
```

### Example 5: Split Validation Error

**Request**:
```http
PATCH /api/organizations/org123/accounts/acc456/transactions/tx789
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "version": 3,
  "amount": 100.00,
  "splits": [
    {
      "categoryName": "Groceries",
      "categoryId": "cat1",
      "amount": 60.00
    },
    {
      "categoryName": "Household",
      "categoryId": "cat2",
      "amount": 30.00
    }
  ]
}
```

**Response** (400 Bad Request):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "splits": ["Split amounts must equal the transaction amount"]
  }
}
```

### Example 6: Get Transaction Edit History

**Request**:
```http
GET /api/organizations/org123/accounts/acc456/transactions/tx789/history?limit=10&offset=0
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "h333",
        "transactionId": "tx789",
        "editedAt": "2026-01-18T09:20:00Z",
        "editedById": "u222",
        "editedByName": "Jane Smith",
        "editedByEmail": "jane@example.com",
        "version": 3,
        "changes": [
          {
            "field": "transactionType",
            "oldValue": "EXPENSE",
            "newValue": "TRANSFER"
          },
          {
            "field": "amount",
            "oldValue": "125.50",
            "newValue": "1000.00"
          },
          {
            "field": "destinationAccountId",
            "oldValue": null,
            "newValue": "acc999"
          },
          {
            "field": "splits",
            "oldValue": [
              { "categoryName": "Groceries", "amount": "75.50" },
              { "categoryName": "Household", "amount": "50.00" }
            ],
            "newValue": [
              { "categoryName": "Account Transfer", "amount": "1000.00" }
            ]
          }
        ],
        "metadata": {
          "action": "UPDATED",
          "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
          "ipAddress": "192.168.1.100"
        }
      },
      {
        "id": "h222",
        "transactionId": "tx789",
        "editedAt": "2026-01-18T09:15:00Z",
        "editedById": "u222",
        "editedByName": "Jane Smith",
        "editedByEmail": "jane@example.com",
        "version": 2,
        "changes": [
          {
            "field": "memo",
            "oldValue": "Grocery shopping",
            "newValue": "Updated grocery shopping at Whole Foods"
          },
          {
            "field": "amount",
            "oldValue": "100.50",
            "newValue": "125.50"
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
        ],
        "metadata": {
          "action": "UPDATED",
          "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
          "ipAddress": "192.168.1.105"
        }
      },
      {
        "id": "h111",
        "transactionId": "tx789",
        "editedAt": "2026-01-15T14:30:00Z",
        "editedById": "u111",
        "editedByName": "John Doe",
        "editedByEmail": "john@example.com",
        "version": 1,
        "changes": [],
        "metadata": {
          "action": "CREATED"
        }
      }
    ],
    "pagination": {
      "total": 3,
      "limit": 10,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

---

## Summary

This specification provides a comprehensive backend architecture for transaction editing with:

1. **Optimistic Locking**: Version-based concurrent modification prevention
2. **Audit Trail**: Complete edit history with user tracking and change logs
3. **Authorization**: Role-based access control (OWNER/ADMIN for edits, any member for history)
4. **Validation**: Comprehensive business rules (no reconciled edits, split validation, transfer validation)
5. **Error Handling**: Structured error responses with client guidance for conflicts
6. **Service Architecture**: Layered design with clear separation of concerns
7. **OpenAPI Documentation**: Complete API contract for frontend integration

The design leverages existing Treasurer infrastructure (Express, Prisma, Zod, JWT) and extends it with audit capabilities while maintaining backward compatibility.
