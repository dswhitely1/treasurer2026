# Treasurer API Documentation

**Version:** 0.1.0
**Last Updated:** 2026-01-17
**Base URL:** `http://localhost:3001/api` (development)

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Common Patterns](#common-patterns)
4. [Error Handling](#error-handling)
5. [API Endpoints](#api-endpoints)
   - [Health Check](#health-check)
   - [Authentication](#authentication-endpoints)
   - [Users](#users)
   - [Organizations](#organizations)
   - [Accounts](#accounts)
   - [Transactions](#transactions)
   - [Transaction Status](#transaction-status)
   - [Categories](#categories)
6. [Request Examples](#request-examples)
7. [Response Examples](#response-examples)
8. [Rate Limiting](#rate-limiting)
9. [API Versioning](#api-versioning)

---

## Quick Start

### 1. Register a New User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "John Doe"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Use Token for Authenticated Requests

```bash
# Store token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Make authenticated request
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Create Organization and Account

```bash
# Create organization
curl -X POST http://localhost:3001/api/organizations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Family Finances"}'

# Create account
curl -X POST http://localhost:3001/api/organizations/{orgId}/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Checking Account",
    "accountType": "CHECKING",
    "institution": "Bank of Example",
    "balance": 1000.00
  }'
```

---

## Authentication

### Authentication Method

The API uses **JWT (JSON Web Token)** for authentication.

### Obtaining a Token

1. **Register**: `POST /api/auth/register`
2. **Login**: `POST /api/auth/login`

Both endpoints return a JWT token in the response:

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

### Using the Token

Include the token in the `Authorization` header with the `Bearer` scheme:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiration

- Default expiration: **7 days**
- Configurable via `JWT_EXPIRES_IN` environment variable
- When a token expires, you'll receive a `401 Unauthorized` response

### Security Best Practices

1. **Store tokens securely** (localStorage, sessionStorage, or memory)
2. **Use HTTPS in production** to prevent token interception
3. **Don't share tokens** between users or applications
4. **Regenerate on password change** (future feature)

---

## Common Patterns

### Nested Resources

The API follows RESTful resource nesting to represent ownership:

```
/api/organizations/{orgId}/accounts/{accountId}/transactions/{transactionId}
```

**Benefits:**
- Clear ownership hierarchy
- Implicit authorization (must be member of organization)
- Self-documenting URLs

### Request Format

All requests use **JSON** format:

```
Content-Type: application/json
```

### Response Format

All successful responses follow this structure:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional success message"
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    // Optional validation errors
  }
}
```

### Pagination

List endpoints support pagination via query parameters:

```
GET /api/organizations/{orgId}/accounts?page=1&limit=10
```

**Parameters:**
- `page`: Page number (1-indexed, default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

### Filtering

Some endpoints support filtering via query parameters:

```
GET /api/organizations/{orgId}/accounts/{accountId}/transactions?status=CLEARED
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PATCH requests |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 207 | Multi-Status | Bulk operation with partial success |
| 400 | Bad Request | Invalid input, validation failed |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry (e.g., email already exists) |
| 500 | Internal Server Error | Server error (should be rare) |

### Error Response Format

**Validation Error (400):**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

**Authorization Error (403):**

```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

**Not Found Error (404):**

```json
{
  "success": false,
  "message": "Transaction not found"
}
```

### Common Error Scenarios

**1. Invalid Status Transition**

```json
{
  "success": false,
  "message": "Invalid status transition from RECONCILED to UNCLEARED"
}
```

**2. Modifying Reconciled Transaction**

```json
{
  "success": false,
  "message": "Cannot modify reconciled transactions"
}
```

**3. Not Organization Member**

```json
{
  "success": false,
  "message": "Not a member of this organization"
}
```

**4. Expired Token**

```json
{
  "success": false,
  "message": "Invalid token"
}
```

---

## API Endpoints

### Health Check

#### GET /health

Check if the API server is running.

**Authentication:** Not required

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-17T12:00:00.000Z"
  }
}
```

---

### Authentication Endpoints

#### POST /api/auth/register

Register a new user account.

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"  // Optional
}
```

**Validation:**
- `email`: Valid email format, unique
- `password`: Minimum 8 characters
- `name`: Optional string

**Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER",
      "createdAt": "2026-01-17T12:00:00.000Z",
      "updatedAt": "2026-01-17T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:**
- `400`: Validation failed
- `409`: Email already registered

---

#### POST /api/auth/login

Login with email and password.

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:**
- `401`: Invalid credentials

---

#### GET /api/auth/me

Get current authenticated user.

**Authentication:** Required

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "lastOrganizationId": "org-uuid",
    "createdAt": "2026-01-17T12:00:00.000Z",
    "updatedAt": "2026-01-17T12:00:00.000Z"
  }
}
```

**Errors:**
- `401`: Unauthorized (invalid token)

---

### Users

#### GET /api/users

List all users (Admin only).

**Authentication:** Required (ADMIN role)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "USER"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

**Errors:**
- `401`: Unauthorized
- `403`: Forbidden (not admin)

---

#### GET /api/users/:id

Get user by ID.

**Authentication:** Required

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  }
}
```

**Errors:**
- `404`: User not found

---

#### PATCH /api/users/:id

Update user information.

**Authentication:** Required (own user or admin)

**Request Body:**

```json
{
  "name": "Jane Doe",
  "email": "newemail@example.com"  // Optional
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "newemail@example.com",
    "name": "Jane Doe",
    "role": "USER"
  },
  "message": "User updated successfully"
}
```

**Errors:**
- `404`: User not found
- `409`: Email already in use

---

#### DELETE /api/users/:id

Delete user (Admin only).

**Authentication:** Required (ADMIN role)

**Response (204):**

No content.

**Errors:**
- `403`: Forbidden
- `404`: User not found

---

### Organizations

#### POST /api/organizations

Create a new organization.

**Authentication:** Required

**Request Body:**

```json
{
  "name": "My Organization"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "uuid",
      "name": "My Organization",
      "createdAt": "2026-01-17T12:00:00.000Z",
      "updatedAt": "2026-01-17T12:00:00.000Z"
    },
    "membership": {
      "role": "OWNER"
    }
  },
  "message": "Organization created successfully"
}
```

**Note:** User who creates organization automatically becomes OWNER.

---

#### GET /api/organizations

List user's organizations.

**Authentication:** Required

**Response (200):**

```json
{
  "success": true,
  "data": {
    "organizations": [
      {
        "id": "uuid",
        "name": "My Organization",
        "role": "OWNER",
        "createdAt": "2026-01-17T12:00:00.000Z"
      },
      {
        "id": "uuid2",
        "name": "Family Budget",
        "role": "MEMBER",
        "createdAt": "2026-01-16T12:00:00.000Z"
      }
    ]
  }
}
```

---

#### GET /api/organizations/:orgId

Get organization details.

**Authentication:** Required (must be member)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Organization",
    "createdAt": "2026-01-17T12:00:00.000Z",
    "updatedAt": "2026-01-17T12:00:00.000Z",
    "memberCount": 5,
    "accountCount": 3
  }
}
```

**Errors:**
- `403`: Not a member of organization
- `404`: Organization not found

---

#### PATCH /api/organizations/:orgId

Update organization.

**Authentication:** Required (OWNER or ADMIN role)

**Request Body:**

```json
{
  "name": "Updated Organization Name"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Updated Organization Name",
    "updatedAt": "2026-01-17T12:00:00.000Z"
  },
  "message": "Organization updated successfully"
}
```

**Errors:**
- `403`: Insufficient permissions
- `404`: Organization not found

---

#### DELETE /api/organizations/:orgId

Delete organization (OWNER only).

**Authentication:** Required (OWNER role)

**Response (204):**

No content.

**Note:** Cascades to delete all accounts, transactions, and members.

**Errors:**
- `403`: Only owners can delete organizations
- `404`: Organization not found

---

#### POST /api/organizations/:orgId/switch

Set organization as user's active organization.

**Authentication:** Required (must be member)

**Response (200):**

```json
{
  "success": true,
  "message": "Switched to organization: My Organization"
}
```

---

#### GET /api/organizations/:orgId/members

List organization members.

**Authentication:** Required (must be member)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "uuid",
        "userId": "user-uuid",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "role": "OWNER",
        "joinedAt": "2026-01-17T12:00:00.000Z"
      }
    ]
  }
}
```

---

### Accounts

#### POST /api/organizations/:orgId/accounts

Create a new account.

**Authentication:** Required (OWNER or ADMIN role)

**Request Body:**

```json
{
  "name": "Checking Account",
  "description": "Primary checking account",
  "institution": "Bank of Example",
  "accountType": "CHECKING",
  "balance": 1000.00,
  "currency": "USD",
  "transactionFee": 0.50  // Optional
}
```

**Account Types:**
- `CHECKING`
- `SAVINGS`
- `CREDIT_CARD`
- `CASH`
- `INVESTMENT`
- `OTHER`

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Checking Account",
    "description": "Primary checking account",
    "institution": "Bank of Example",
    "accountType": "CHECKING",
    "balance": "1000.0000",
    "currency": "USD",
    "transactionFee": "0.5000",
    "isActive": true,
    "organizationId": "org-uuid",
    "createdAt": "2026-01-17T12:00:00.000Z",
    "updatedAt": "2026-01-17T12:00:00.000Z"
  },
  "message": "Account created successfully"
}
```

**Errors:**
- `403`: Insufficient permissions
- `400`: Validation failed

---

#### GET /api/organizations/:orgId/accounts

List organization accounts.

**Authentication:** Required (must be member)

**Query Parameters:**
- `isActive`: Filter by active status (`true` or `false`)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "uuid",
        "name": "Checking Account",
        "accountType": "CHECKING",
        "balance": "1000.0000",
        "currency": "USD",
        "isActive": true
      }
    ]
  }
}
```

---

#### GET /api/organizations/:orgId/accounts/:accountId

Get account details.

**Authentication:** Required (must be member)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Checking Account",
    "description": "Primary checking account",
    "institution": "Bank of Example",
    "accountType": "CHECKING",
    "balance": "1000.0000",
    "currency": "USD",
    "transactionFee": "0.5000",
    "isActive": true,
    "transactionCount": 42,
    "lastTransactionDate": "2026-01-15T10:30:00.000Z"
  }
}
```

**Errors:**
- `403`: Not a member
- `404`: Account not found

---

#### PATCH /api/organizations/:orgId/accounts/:accountId

Update account.

**Authentication:** Required (OWNER or ADMIN role)

**Request Body:**

```json
{
  "name": "Updated Account Name",
  "description": "New description",
  "isActive": false
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Updated Account Name",
    "description": "New description",
    "isActive": false,
    "updatedAt": "2026-01-17T12:00:00.000Z"
  },
  "message": "Account updated successfully"
}
```

**Errors:**
- `403`: Insufficient permissions
- `404`: Account not found

---

#### DELETE /api/organizations/:orgId/accounts/:accountId

Delete account.

**Authentication:** Required (OWNER or ADMIN role)

**Response (204):**

No content.

**Note:** Cascades to delete all transactions.

**Errors:**
- `403`: Insufficient permissions
- `404`: Account not found

---

### Transactions

#### POST /api/organizations/:orgId/accounts/:accountId/transactions

Create a new transaction.

**Authentication:** Required (OWNER or ADMIN role)

**Request Body (Standard Transaction):**

```json
{
  "description": "Grocery Shopping",
  "amount": 42.50,
  "transactionType": "EXPENSE",
  "date": "2026-01-17T10:30:00.000Z",
  "feeAmount": 0.50,  // Optional
  "splits": [  // Optional
    {
      "categoryId": "cat-uuid",
      "amount": 42.50
    }
  ]
}
```

**Request Body (Transfer Transaction):**

```json
{
  "description": "Transfer to Savings",
  "amount": 500.00,
  "transactionType": "TRANSFER",
  "destinationAccountId": "dest-account-uuid",
  "date": "2026-01-17T10:30:00.000Z"
}
```

**Transaction Types:**
- `INCOME`: Money coming in
- `EXPENSE`: Money going out
- `TRANSFER`: Move between accounts

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "description": "Grocery Shopping",
    "amount": "42.5000",
    "transactionType": "EXPENSE",
    "status": "UNCLEARED",
    "date": "2026-01-17T10:30:00.000Z",
    "feeAmount": "0.5000",
    "accountId": "account-uuid",
    "splits": [
      {
        "id": "split-uuid",
        "amount": "42.5000",
        "categoryId": "cat-uuid",
        "categoryName": "Groceries"
      }
    ],
    "createdAt": "2026-01-17T12:00:00.000Z"
  },
  "message": "Transaction created successfully"
}
```

**Errors:**
- `403`: Insufficient permissions
- `400`: Validation failed
- `404`: Account or category not found

---

#### GET /api/organizations/:orgId/accounts/:accountId/transactions

List account transactions.

**Authentication:** Required (must be member)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status (`UNCLEARED`, `CLEARED`, `RECONCILED`)
- `transactionType`: Filter by type (`INCOME`, `EXPENSE`, `TRANSFER`)
- `startDate`: Filter by date range (ISO 8601)
- `endDate`: Filter by date range (ISO 8601)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "description": "Grocery Shopping",
        "amount": "42.5000",
        "transactionType": "EXPENSE",
        "status": "UNCLEARED",
        "date": "2026-01-17T10:30:00.000Z",
        "clearedAt": null,
        "reconciledAt": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 42,
      "totalPages": 5
    }
  }
}
```

---

#### GET /api/organizations/:orgId/accounts/:accountId/transactions/:transactionId

Get transaction details.

**Authentication:** Required (must be member)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "description": "Grocery Shopping",
    "amount": "42.5000",
    "transactionType": "EXPENSE",
    "status": "CLEARED",
    "date": "2026-01-17T10:30:00.000Z",
    "clearedAt": "2026-01-18T09:00:00.000Z",
    "reconciledAt": null,
    "feeAmount": "0.5000",
    "splits": [
      {
        "id": "split-uuid",
        "amount": "42.5000",
        "category": {
          "id": "cat-uuid",
          "name": "Groceries"
        }
      }
    ]
  }
}
```

**Errors:**
- `404`: Transaction not found

---

#### PATCH /api/organizations/:orgId/accounts/:accountId/transactions/:transactionId

Update transaction.

**Authentication:** Required (OWNER or ADMIN role)

**Request Body:**

```json
{
  "description": "Updated description",
  "amount": 45.00,
  "date": "2026-01-17T11:00:00.000Z"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "description": "Updated description",
    "amount": "45.0000",
    "updatedAt": "2026-01-17T12:00:00.000Z"
  },
  "message": "Transaction updated successfully"
}
```

**Errors:**
- `403`: Insufficient permissions
- `404`: Transaction not found
- `400`: Cannot modify reconciled transactions

---

#### DELETE /api/organizations/:orgId/accounts/:accountId/transactions/:transactionId

Delete transaction.

**Authentication:** Required (OWNER or ADMIN role)

**Response (204):**

No content.

**Errors:**
- `403`: Insufficient permissions
- `404`: Transaction not found
- `400`: Cannot delete reconciled transactions

---

### Transaction Status

#### PATCH /api/organizations/:orgId/accounts/:accountId/transactions/:transactionId/status

Change transaction status.

**Authentication:** Required (OWNER or ADMIN role)

**Request Body:**

```json
{
  "status": "CLEARED",
  "notes": "Appeared on bank statement"  // Optional
}
```

**Valid Status Transitions:**
- `UNCLEARED` → `CLEARED`
- `CLEARED` → `UNCLEARED`
- `CLEARED` → `RECONCILED`
- `RECONCILED` → (no transitions allowed)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "history": {
      "id": "history-uuid",
      "fromStatus": "UNCLEARED",
      "toStatus": "CLEARED",
      "changedById": "user-uuid",
      "changedByName": "John Doe",
      "changedByEmail": "john@example.com",
      "changedAt": "2026-01-17T12:00:00.000Z",
      "notes": "Appeared on bank statement"
    }
  },
  "message": "Transaction status updated successfully"
}
```

**Errors:**
- `400`: Invalid status transition
- `400`: Transaction is already {status}
- `400`: Cannot modify reconciled transactions
- `403`: Insufficient permissions
- `404`: Transaction not found

---

#### GET /api/organizations/:orgId/accounts/:accountId/transactions/:transactionId/status/history

Get transaction status history.

**Authentication:** Required (must be member)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "history-uuid-2",
        "fromStatus": "CLEARED",
        "toStatus": "RECONCILED",
        "changedById": "user-uuid",
        "changedByName": "John Doe",
        "changedByEmail": "john@example.com",
        "changedAt": "2026-01-18T10:00:00.000Z",
        "notes": "Month-end reconciliation"
      },
      {
        "id": "history-uuid-1",
        "fromStatus": "UNCLEARED",
        "toStatus": "CLEARED",
        "changedById": "user-uuid",
        "changedByName": "John Doe",
        "changedByEmail": "john@example.com",
        "changedAt": "2026-01-17T12:00:00.000Z",
        "notes": "Appeared on bank statement"
      }
    ]
  }
}
```

**Note:** History is ordered by `changedAt` descending (most recent first).

---

#### POST /api/organizations/:orgId/accounts/:accountId/transactions/status/bulk

Bulk change transaction status.

**Authentication:** Required (OWNER or ADMIN role)

**Request Body:**

```json
{
  "transactionIds": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ],
  "status": "CLEARED",
  "notes": "Bank statement 2026-01-15"  // Optional
}
```

**Limits:**
- Minimum: 1 transaction
- Maximum: 100 transactions per request

**Response (200 - All Successful):**

```json
{
  "success": true,
  "data": {
    "successful": [
      { "transactionId": "uuid-1", "status": "CLEARED" },
      { "transactionId": "uuid-2", "status": "CLEARED" },
      { "transactionId": "uuid-3", "status": "CLEARED" }
    ],
    "failed": []
  },
  "message": "All transactions updated successfully"
}
```

**Response (207 - Partial Success):**

```json
{
  "success": true,
  "data": {
    "successful": [
      { "transactionId": "uuid-1", "status": "CLEARED" },
      { "transactionId": "uuid-2", "status": "CLEARED" }
    ],
    "failed": [
      {
        "transactionId": "uuid-3",
        "error": "Transaction is already CLEARED"
      }
    ]
  },
  "message": "Bulk operation completed with 2 successes and 1 failure"
}
```

**HTTP Status Codes:**
- `200`: All transactions updated successfully
- `207`: Partial success (some failed)
- `400`: Validation error (e.g., too many transactions)
- `403`: Insufficient permissions
- `404`: Account not found

**Note:** This endpoint processes all valid transactions even if some fail. See [ADR-004](./adr/004-bulk-operations-partial-failure.md) for details.

---

#### GET /api/organizations/:orgId/accounts/:accountId/transactions/status/summary

Get reconciliation summary for account.

**Authentication:** Required (must be member)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "summary": {
      "accountId": "account-uuid",
      "accountName": "Checking Account",
      "uncleared": {
        "count": 5,
        "total": "250.00"
      },
      "cleared": {
        "count": 10,
        "total": "500.50"
      },
      "reconciled": {
        "count": 100,
        "total": "5000.00"
      },
      "overall": {
        "count": 115,
        "total": "5750.50"
      }
    }
  }
}
```

**Use Case:** Display account reconciliation status before starting reconciliation workflow.

---

### Categories

#### POST /api/organizations/:orgId/categories

Create a new category.

**Authentication:** Required (OWNER or ADMIN role)

**Request Body:**

```json
{
  "name": "Groceries"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Groceries",
    "organizationId": "org-uuid",
    "createdAt": "2026-01-17T12:00:00.000Z",
    "updatedAt": "2026-01-17T12:00:00.000Z"
  },
  "message": "Category created successfully"
}
```

**Errors:**
- `409`: Category name already exists in organization

---

#### GET /api/organizations/:orgId/categories

List organization categories.

**Authentication:** Required (must be member)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "uuid",
        "name": "Groceries",
        "transactionCount": 42
      },
      {
        "id": "uuid-2",
        "name": "Utilities",
        "transactionCount": 12
      }
    ]
  }
}
```

---

#### GET /api/organizations/:orgId/categories/:categoryId

Get category details.

**Authentication:** Required (must be member)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Groceries",
    "organizationId": "org-uuid",
    "transactionCount": 42,
    "totalAmount": "1250.50"
  }
}
```

---

#### PATCH /api/organizations/:orgId/categories/:categoryId

Update category.

**Authentication:** Required (OWNER or ADMIN role)

**Request Body:**

```json
{
  "name": "Food & Groceries"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Food & Groceries",
    "updatedAt": "2026-01-17T12:00:00.000Z"
  },
  "message": "Category updated successfully"
}
```

---

#### DELETE /api/organizations/:orgId/categories/:categoryId

Delete category.

**Authentication:** Required (OWNER or ADMIN role)

**Response (204):**

No content.

**Note:** Cannot delete category if it has associated transaction splits.

---

## Request Examples

### Using cURL

#### Register and Login

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'

# Save token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Create Organization and Account

```bash
# Create organization
curl -X POST http://localhost:3001/api/organizations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Finances"}'

# Save organization ID
ORG_ID="org-uuid-here"

# Create account
curl -X POST http://localhost:3001/api/organizations/$ORG_ID/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Checking",
    "accountType": "CHECKING",
    "balance": 1000
  }'

# Save account ID
ACCOUNT_ID="account-uuid-here"
```

#### Create and Manage Transactions

```bash
# Create transaction
curl -X POST http://localhost:3001/api/organizations/$ORG_ID/accounts/$ACCOUNT_ID/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Grocery Shopping",
    "amount": 42.50,
    "transactionType": "EXPENSE",
    "date": "2026-01-17T10:30:00.000Z"
  }'

# List transactions
curl -X GET "http://localhost:3001/api/organizations/$ORG_ID/accounts/$ACCOUNT_ID/transactions?status=UNCLEARED" \
  -H "Authorization: Bearer $TOKEN"

# Change status
curl -X PATCH http://localhost:3001/api/organizations/$ORG_ID/accounts/$ACCOUNT_ID/transactions/$TX_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CLEARED",
    "notes": "Appeared on statement"
  }'
```

#### Bulk Status Change

```bash
curl -X POST http://localhost:3001/api/organizations/$ORG_ID/accounts/$ACCOUNT_ID/transactions/status/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionIds": ["tx-1", "tx-2", "tx-3"],
    "status": "RECONCILED",
    "notes": "Month-end reconciliation 2026-01"
  }'
```

### Using JavaScript/TypeScript

```typescript
// API client setup
const API_BASE_URL = 'http://localhost:3001/api'

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token')

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message)
  }

  return response.json()
}

// Register
const registerData = await apiRequest('/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    name: 'John Doe',
  }),
})

// Store token
localStorage.setItem('token', registerData.data.token)

// Create organization
const orgData = await apiRequest('/organizations', {
  method: 'POST',
  body: JSON.stringify({ name: 'My Finances' }),
})

// Get transactions
const txData = await apiRequest(
  `/organizations/${orgId}/accounts/${accountId}/transactions?status=CLEARED`
)

// Bulk status change
const bulkData = await apiRequest(
  `/organizations/${orgId}/accounts/${accountId}/transactions/status/bulk`,
  {
    method: 'POST',
    body: JSON.stringify({
      transactionIds: ['tx-1', 'tx-2', 'tx-3'],
      status: 'RECONCILED',
    }),
  }
)
```

---

## Response Examples

### Successful Responses

#### Simple Success (200)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Checking Account"
  }
}
```

#### Success with Message (200)

```json
{
  "success": true,
  "data": {
    "transaction": { ... }
  },
  "message": "Transaction updated successfully"
}
```

#### Created (201)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "New Organization"
  },
  "message": "Organization created successfully"
}
```

#### No Content (204)

No response body. Used for DELETE operations.

#### Multi-Status (207)

```json
{
  "success": true,
  "data": {
    "successful": [...],
    "failed": [...]
  },
  "message": "Bulk operation completed with 10 successes and 2 failures"
}
```

### Error Responses

#### Bad Request (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

#### Unauthorized (401)

```json
{
  "success": false,
  "message": "Invalid token"
}
```

#### Forbidden (403)

```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

#### Not Found (404)

```json
{
  "success": false,
  "message": "Transaction not found"
}
```

#### Conflict (409)

```json
{
  "success": false,
  "message": "Email already registered"
}
```

---

## Rate Limiting

**Current Status:** Not implemented in MVP

**Future Implementation:**

- Rate limiting will be added in future versions
- Expected limits: 100 requests per 15-minute window per IP
- Authenticated users may have higher limits
- Headers will include rate limit information:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

---

## API Versioning

**Current Version:** 0.1.0 (MVP)

**Versioning Strategy:**

The API currently does not include a version in the URL path. Future versions will use:

```
/api/v1/organizations
/api/v2/organizations
```

**Breaking Changes:**

Breaking changes will be communicated via:
1. Version bump in API documentation
2. Deprecation notices in response headers
3. Minimum 6-month deprecation period

**Non-Breaking Changes:**

- Adding new endpoints
- Adding optional request parameters
- Adding new response fields
- These changes will not require version bump

---

## Interactive API Documentation

**Swagger UI** is available when the API server is running:

```
http://localhost:3001/api-docs
```

The interactive documentation allows you to:
- Explore all available endpoints
- Test API calls directly from the browser
- View request/response schemas
- Try authentication flows

---

## Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md) - System architecture overview
- [Transaction Status Feature](./TRANSACTION_STATUS.md) - Status management deep dive
- [Development Guide](./DEVELOPMENT.md) - Setup and development workflow
- [ADR Documents](./adr/) - Architecture decision records

---

**Document Metadata:**
- **Version:** 0.1.0
- **Last Updated:** 2026-01-17
- **Maintainers:** Development Team
- **Review Cycle:** Updated with each API change
