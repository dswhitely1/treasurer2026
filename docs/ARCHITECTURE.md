# Treasurer Architecture Documentation

**Version:** 0.1.0 | **Last Updated:** 2026-01-17 | **Status:** Living Document

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Principles](#architecture-principles)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Schema](#database-schema)
7. [Authentication & Authorization](#authentication--authorization)
8. [State Management](#state-management)
9. [API Design Patterns](#api-design-patterns)
10. [Data Flow](#data-flow)
11. [Key Design Decisions](#key-design-decisions)
12. [Performance Considerations](#performance-considerations)
13. [Security Model](#security-model)
14. [Testing Strategy](#testing-strategy)

---

## Executive Summary

Treasurer is a full-stack financial management application with organization-based multi-tenancy. Key highlights:

- **Multi-tenant architecture** with organization-based data isolation
- **Role-based access control** at system and organization levels
- **State machine pattern** for transaction status (UNCLEARED → CLEARED → RECONCILED)
- **Optimistic UI updates** with rollback on failure
- **Type-safe** end-to-end with TypeScript, Zod, and Prisma
- **370+ tests** across frontend and backend

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Redux Toolkit, RTK Query, Tailwind CSS |
| Backend | Express, TypeScript, Prisma, PostgreSQL |
| Testing | Vitest, Playwright |
| Build | Vite (frontend), tsc (backend), Docker Compose |

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                           │
│  React App (Port 3000) ──── Redux/RTK Query ──── Components │
└────────────────────────────────┬────────────────────────────┘
                                 │ HTTPS/JSON
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│               Express API Server (Port 3001)                 │
│  Routes → Middleware → Controllers → Services → Prisma      │
└────────────────────────────────┬────────────────────────────┘
                                 │ SQL
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database (Port 5432)                 │
└─────────────────────────────────────────────────────────────┘
```

**External Dependencies:** PostgreSQL, JWT (jsonwebtoken), bcrypt

**API Boundaries:** REST API with JSON, OpenAPI 3.0 spec, CORS-enabled

---

## Architecture Principles

1. **Separation of Concerns**: Frontend handles UI/interactions, backend handles business logic/validation, database handles persistence
2. **Type Safety**: TypeScript strict mode, Zod runtime validation, Prisma type-safe queries, no `any` types
3. **Single Source of Truth**: Database for persisted data, Redux store for client state
4. **Fail Fast**: Validate at API boundary, centralized error handling, explicit error types
5. **Progressive Enhancement**: Optimistic updates, rollback mechanisms, loading states
6. **Security by Default**: Auth required for protected routes, multi-layer authorization, prepared statements

---

## Frontend Architecture

### Technology Stack
- **React 18** with hooks
- **Redux Toolkit** + **RTK Query** for state and data fetching
- **React Router v6** for routing
- **Tailwind CSS** + **CVA** for styling
- **Vite** for builds

### Component Architecture

Components use CVA (Class Variance Authority) for variants:

```typescript
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium',
  {
    variants: {
      variant: { primary: '...', secondary: '...', destructive: '...' },
      size: { sm: '...', md: '...', lg: '...' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)
```

### Routing Strategy

Organization-scoped routes: `/org/:orgId/dashboard`, `/org/:orgId/accounts/:accountId`

Public routes: `/`, `/login`, `/register`

Route protection: Private routes require auth, org routes validate membership, role-based access for admin features.

### State Management Split

- **RTK Query**: Server data (CRUD operations, caching, optimistic updates)
- **Redux slices**: Client state (UI state, filters, selections, workflows)
- **useState**: Component-only temporary state

---

## Backend Architecture

### Layered Architecture

```
HTTP Layer (Routes → Middleware → Controllers)
                    ↓
Business Logic Layer (Services)
                    ↓
Data Access Layer (Prisma Client)
                    ↓
              PostgreSQL
```

### Request Flow

1. HTTP Request → Route matching
2. Middleware: logging (morgan), security (helmet, cors), auth, validation (Zod)
3. Controller: extracts params, calls service, formats response
4. Service: business logic, data validation, database operations
5. Database: query execution via Prisma
6. Response: 200/201 with data or 4xx/5xx with error

### Service Layer Pattern

Controllers handle HTTP concerns; services handle business logic. This enables:
- Testability without HTTP layer
- Reusability across controllers
- Transaction management for complex operations

### Error Handling

```typescript
export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500) {
    super(message)
  }
}

// Usage
throw new AppError('Transaction not found', 404)
throw new AppError('Invalid status transition', 400)
```

Centralized error handler catches AppError, Prisma errors (P2002 → 409), and unknown errors.

---

## Database Schema

### Entity Relationships

```
User ─1:N─ OrganizationMember ─N:1─ Organization
                                          │
                              ┌───────────┴───────────┐
                              ↓                       ↓
                          Account                 Category
                              │                       │
                              ↓                       ↓
                        Transaction ◀─1:N─ TransactionSplit
                              │
                              ↓
                  TransactionStatusHistory
```

### Core Entities

**User**: UUID, email (unique), password (bcrypt), name, role (USER|ADMIN), lastOrganizationId

**Organization**: UUID, name - multi-tenant container for financial data

**OrganizationMember**: Junction with role (OWNER|ADMIN|MEMBER), unique [userId, organizationId]

**Account**: Financial account with type (CHECKING, SAVINGS, etc.), balance (Decimal 19,4), currency, isActive

**Transaction**: Description, amount (Decimal 19,4), type (INCOME|EXPENSE|TRANSFER), date, status (UNCLEARED|CLEARED|RECONCILED), clearedAt, reconciledAt

**TransactionStatusHistory**: Immutable audit trail - transactionId, fromStatus, toStatus, changedById, notes

**TransactionSplit**: Category allocation for transactions

**Category**: Organization-scoped, unique [organizationId, name]

### Key Indexes

```prisma
@@index([accountId, status])        // Filter by account and status
@@index([accountId, status, date])  // Reconciliation queries
@@index([transactionId])            // History lookups
```

---

## Authentication & Authorization

### Authentication Flow

1. Register/Login: Validate input (Zod) → Hash password (bcrypt, 12 rounds) → Create user → Generate JWT
2. Subsequent requests: Extract Bearer token → Verify JWT → Lookup user → Attach to req.user

### JWT Structure

```typescript
{ id: 'user-uuid', email: '...', role: 'USER', iat: ..., exp: ... }
```

Configuration: JWT_SECRET (min 32 chars), JWT_EXPIRES_IN (default 7d)

### Authorization Layers

1. **authenticate**: JWT verification, user lookup
2. **requireOrgMembership**: Validates user is member of organization
3. **requireOrgRole**: Validates user has required role (OWNER, ADMIN, MEMBER)

### Authorization Matrix

| Resource | MEMBER | ADMIN | OWNER |
|----------|--------|-------|-------|
| Read accounts/transactions | ✅ | ✅ | ✅ |
| Create/Update/Delete | ❌ | ✅ | ✅ |
| Change status | ❌ | ✅ | ✅ |
| Delete organization | ❌ | ❌ | ✅ |

---

## State Management

### Redux Store Structure

```typescript
{
  auth: { user, token, isAuthenticated, loading, error },
  organization: { organizations, activeOrganizationId, loading, error },
  status: {
    statusFilter: { uncleared, cleared, reconciled },
    selectedIds, isSelectAllMode, excludedIds,
    reconciliation: { isActive, statementBalance, statementDate },
    pendingChanges: { [id]: { previousStatus, newStatus, timestamp } }
  },
  api: { /* RTK Query cache */ }
}
```

### RTK Query Pattern

```typescript
getTransactions: builder.query({
  query: ({ orgId, accountId }) => `/organizations/${orgId}/accounts/${accountId}/transactions`,
  providesTags: (result) => result
    ? [...result.data.map(({ id }) => ({ type: 'Transaction', id })), { type: 'Transaction', id: 'LIST' }]
    : [{ type: 'Transaction', id: 'LIST' }],
}),

updateTransactionStatus: builder.mutation({
  // Optimistic update with rollback
  async onQueryStarted({ transactionId, status }, { dispatch, queryFulfilled }) {
    const patchResult = dispatch(api.util.updateQueryData(...))
    try { await queryFulfilled } catch { patchResult.undo() }
  },
})
```

### Selectors

Memoized selectors with `createSelector` prevent unnecessary re-renders. Factory selectors for component-specific computations.

---

## API Design Patterns

### RESTful Resource Nesting

```
/api/organizations/:orgId/accounts/:accountId/transactions/:transactionId
```

Benefits: Clear ownership, implicit authorization, self-documenting URLs

### Response Format

```json
// Success
{ "success": true, "data": { ... }, "message": "..." }

// Error
{ "success": false, "message": "...", "errors": { "field": "..." } }
```

### Validation Strategy

Three layers: TypeScript (compile-time), Zod (runtime API boundary), Database constraints

### Pagination

```json
{ "data": { "items": [...], "pagination": { "page": 1, "limit": 10, "total": 50, "totalPages": 5 } } }
```

### Bulk Operations

Support partial success with 207 Multi-Status when some operations fail:

```json
{ "successful": [...], "failed": [{ "transactionId": "...", "error": "..." }] }
```

---

## Data Flow

### Transaction Status Change

1. User clicks "Mark as Cleared"
2. RTK Query mutation dispatched → Optimistic cache update
3. HTTP PATCH to server
4. Server validates (Zod, authorization, state transition)
5. Service updates DB in transaction (update status + create history)
6. Response returns → Cache confirmed or rolled back

### Reconciliation Workflow

1. Select account → Fetch summary (counts by status)
2. Enter statement balance/date
3. Filter CLEARED transactions
4. Select transactions (individual, all, or all with exclusions)
5. Bulk status change to RECONCILED
6. Server processes in single DB transaction
7. UI updates with results

---

## Key Design Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| **Monorepo** | Clear separation, independent deployment | Some type duplication |
| **TypeScript** | Type safety, better DX | Build complexity |
| **Prisma** | Type-safe DB, migrations | Complex queries need raw SQL |
| **JWT** | Stateless, scalable | Can't revoke before expiry |
| **RTK Query** | Caching, optimistic updates | Learning curve |
| **Org-based multi-tenancy** | Team support, role-based access | Complex authorization |
| **Status state machine** | Prevents invalid states, audit trail | Less flexible |
| **Partial bulk failure** | Better UX, clear feedback | Complex error handling |

---

## Performance Considerations

### Database
- Strategic indexes on frequently queried columns
- Prisma connection pooling
- Pagination for all list endpoints

### Frontend
- Code splitting with lazy loading
- Memoization (createSelector, React.memo)
- RTK Query caching with tag invalidation
- Optimistic updates for instant feedback

### Bulk Operations
- Single database transaction for all updates
- Batch history record creation

---

## Security Model

### Defense in Depth

1. **Network**: HTTPS in production
2. **Headers**: Helmet.js security headers
3. **Auth**: JWT with expiration
4. **Authz**: Multi-layer (auth → org membership → role)
5. **Validation**: Zod at API boundary
6. **Encoding**: JSON serialization prevents XSS
7. **Database**: Prisma prepared statements prevent SQL injection

### Password Security
- bcrypt with 12 salt rounds
- Never logged or exposed in responses

### JWT Security
- Min 32-char secret
- 7-day default expiration
- User lookup on every request
- Excludes sensitive data

### CORS
- Configured for specific frontend origin only

---

## Testing Strategy

### Distribution
- **Backend**: 138 tests (services, API endpoints, middleware)
- **Frontend**: 232 tests (components, hooks, slices)

### Tools
- **Vitest**: Fast test runner
- **Supertest**: HTTP endpoint testing
- **Testing Library**: React component testing
- **MSW**: API mocking

### Database Strategy
- Separate test database
- Reset between test suites
- Seed with known data

### CI/CD
```bash
pnpm test           # Run all tests
pnpm test:coverage  # With coverage
pnpm lint           # Lint check
```

---

## Conclusion

Key takeaways:

1. **Clean Architecture**: Clear layers with defined responsibilities
2. **Type Safety**: TypeScript + Zod + Prisma eliminate entire classes of errors
3. **Multi-Tenancy**: Organization-based scoping enables team features
4. **State Management**: Redux for client state, RTK Query for server state
5. **Security**: Multiple layers of defense
6. **Testing**: 370+ tests ensure reliability
7. **Performance**: Strategic caching, indexing, and optimization

---

**Maintainers:** Development Team | **Review Cycle:** Quarterly or on major changes
