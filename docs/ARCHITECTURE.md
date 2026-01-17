# Treasurer Architecture Documentation

**Version:** 0.1.0
**Last Updated:** 2026-01-17
**Status:** Living Document

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Principles](#architecture-principles)
4. [System Architecture](#system-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Architecture](#backend-architecture)
7. [Database Schema](#database-schema)
8. [Authentication & Authorization](#authentication--authorization)
9. [State Management](#state-management)
10. [API Design Patterns](#api-design-patterns)
11. [Data Flow](#data-flow)
12. [Key Design Decisions](#key-design-decisions)
13. [Performance Considerations](#performance-considerations)
14. [Security Model](#security-model)
15. [Testing Strategy](#testing-strategy)

---

## Executive Summary

Treasurer is a modern full-stack financial management application built with a clear separation between frontend and backend concerns. The system uses a monorepo structure with two main packages: a React-based frontend and an Express-based REST API backend.

**Key Architectural Highlights:**

- **Multi-tenant architecture** with organization-based data isolation
- **Role-based access control** at both system and organization levels
- **State machine pattern** for transaction status management
- **Optimistic UI updates** for enhanced user experience
- **Service-oriented backend** with clear separation of concerns
- **Type-safe** end-to-end with TypeScript
- **Test-driven** with 370+ tests across frontend and backend

**Technology Stack:**

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18, TypeScript | UI framework |
| State Management | Redux Toolkit, RTK Query | Client state & API caching |
| Styling | Tailwind CSS, CVA | Component styling |
| Backend | Express, TypeScript | REST API server |
| ORM | Prisma | Database access layer |
| Database | PostgreSQL | Data persistence |
| Testing | Vitest | Unit & integration testing |
| Build | Vite (frontend), tsc (backend) | Build tooling |
| Dev Environment | Docker Compose | Local development |

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Browser                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              React Application (Port 3000)                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │   Pages/     │  │    Redux     │  │  Components  │    │  │
│  │  │   Routes     │  │    Store     │  │  (UI Layer)  │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  │         │                  │                  │            │  │
│  │         └──────────────────┴──────────────────┘            │  │
│  │                           │                                 │  │
│  │                    RTK Query (API Client)                   │  │
│  └───────────────────────────┬─────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTPS/JSON
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express API Server (Port 3001)                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │   Routes    │─▶│ Controllers │─▶│  Services   │       │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │  │
│  │         │                                    │             │  │
│  │  ┌─────────────┐                    ┌───────▼───────┐     │  │
│  │  │ Middleware  │                    │     Prisma    │     │  │
│  │  │ (Auth, etc) │                    │      ORM      │     │  │
│  │  └─────────────┘                    └───────┬───────┘     │  │
│  └────────────────────────────────────────────┬──────────────┘  │
└────────────────────────────────────────────────┬─────────────────┘
                                                 │ SQL
                                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                 PostgreSQL Database (Port 5432)                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Users │ Organizations │ Accounts │ Transactions │ ...    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### System Boundaries

**External Dependencies:**
- PostgreSQL database server
- JWT for stateless authentication
- bcrypt for password hashing

**API Boundaries:**
- REST API with JSON payloads
- OpenAPI 3.0 specification
- CORS-enabled for frontend access

---

## Architecture Principles

### 1. Separation of Concerns

Each layer has clear responsibilities:

- **Frontend**: User interface, user interactions, client-side state
- **Backend API**: Business logic, data validation, authorization
- **Database**: Data persistence, integrity, relationships

### 2. Type Safety

- TypeScript used throughout (strict mode)
- Zod for runtime validation and schema definition
- Prisma for type-safe database access
- No `any` types allowed in production code

### 3. Single Source of Truth

- Database is the source of truth for persisted data
- Redux store is the source of truth for client state
- Environment variables for configuration

### 4. Fail Fast

- Validate inputs at API boundary (Zod schemas)
- Use middleware for cross-cutting concerns
- Centralized error handling
- Explicit error types and status codes

### 5. Progressive Enhancement

- Optimistic UI updates for perceived performance
- Rollback mechanisms for failed operations
- Loading states and error boundaries

### 6. Security by Default

- Authentication required for all protected routes
- Authorization checks at multiple layers
- Input sanitization and validation
- Prepared statements (via Prisma) prevent SQL injection

---

## System Architecture

### Monorepo Structure

```
treasurer2026/
├── treasurer/              # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── features/      # Feature modules (status management)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and helpers
│   │   ├── pages/         # Route page components
│   │   ├── store/         # Redux store and slices
│   │   └── types/         # TypeScript type definitions
│   ├── tests/             # Test files
│   └── package.json
│
├── treasurer-api/         # Backend Express API
│   ├── src/
│   │   ├── config/        # Configuration (env, DB, OpenAPI)
│   │   ├── controllers/   # HTTP request handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # Route definitions
│   │   ├── schemas/       # Zod validation schemas
│   │   ├── services/      # Business logic layer
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   ├── prisma/           # Database schema and migrations
│   └── package.json
│
├── docs/                 # Documentation (this file)
├── docker-compose.yml    # Docker development environment
└── CLAUDE.md            # Project instructions
```

### Communication Patterns

1. **Client-Server**: REST API with JSON
2. **Database Access**: Prisma ORM with connection pooling
3. **State Updates**: Redux actions → API calls → Store updates
4. **Real-time**: Not implemented (future: WebSockets for notifications)

---

## Frontend Architecture

### Technology Stack

- **React 18**: Component-based UI with hooks
- **TypeScript**: Type safety and developer experience
- **Redux Toolkit**: State management with less boilerplate
- **RTK Query**: Data fetching and caching
- **React Router v6**: Client-side routing
- **Tailwind CSS**: Utility-first styling
- **Class Variance Authority**: Component variants pattern
- **Vite**: Fast build tool and dev server

### Directory Structure

```
src/
├── components/
│   ├── ui/                 # Reusable UI primitives
│   │   ├── Button.tsx      # Button with variants (primary, secondary, etc.)
│   │   ├── Card.tsx        # Card container component
│   │   ├── Input.tsx       # Form input component
│   │   └── ...
│   └── layout/             # Layout components
│       ├── Header.tsx      # App header with navigation
│       ├── Footer.tsx      # App footer
│       └── RootLayout.tsx  # Root layout wrapper
│
├── features/               # Feature modules
│   └── status/            # Transaction status feature
│       ├── components/    # Feature-specific components
│       ├── hooks/         # Feature-specific hooks
│       └── types.ts       # Feature-specific types
│
├── hooks/                 # Shared custom hooks
│   ├── useLocalStorage.ts # Persist state to localStorage
│   └── useDebounce.ts     # Debounce input values
│
├── lib/                   # Utilities and helpers
│   └── api.ts            # API client with error handling
│
├── pages/                 # Route page components
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── ReconciliationPage.tsx
│   └── ...
│
├── store/                 # Redux store
│   ├── index.ts          # Store configuration
│   ├── hooks.ts          # Typed useDispatch/useSelector
│   └── features/         # Redux slices
│       ├── authSlice.ts
│       ├── organizationSlice.ts
│       ├── accountSlice.ts
│       ├── transactionSlice.ts
│       └── statusSlice.ts
│
└── types/                # Global TypeScript types
    └── index.ts
```

### Component Architecture

**Pattern: Component Variants with CVA**

```typescript
// components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-11 px-8 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export type ButtonProps = VariantProps<typeof buttonVariants> & {
  // ... other props
}
```

### Routing Strategy

**Organization-Scoped Routes:**

```typescript
// Routes are nested under organization ID
/org/:orgId/dashboard
/org/:orgId/accounts
/org/:orgId/accounts/:accountId
/org/:orgId/transactions
/org/:orgId/reconciliation/:accountId

// Public routes
/
/login
/register
```

**Route Protection:**
- Private routes require authentication
- Organization routes validate membership
- Role-based access for admin features

### State Management Pattern

**Redux Slice Structure:**

```typescript
// Slice responsibilities
authSlice        → User authentication state, current user
organizationSlice → Organization list, active organization
accountSlice     → Account CRUD operations (deprecated, moved to RTK Query)
transactionSlice → Transaction CRUD operations (deprecated, moved to RTK Query)
statusSlice      → Status filters, bulk selection, reconciliation workflow
```

**RTK Query API Slices:**

```typescript
// API endpoints organized by resource
api/
├── auth.ts          // Authentication endpoints
├── organizations.ts // Organization CRUD
├── accounts.ts      // Account CRUD
├── transactions.ts  // Transaction CRUD
└── status.ts        // Status management endpoints
```

**Why This Split?**

- RTK Query for **server data** (CRUD operations, caching)
- Redux slices for **client state** (UI state, filters, selections)
- See [ADR-002](./adr/002-optimistic-updates-rtk-query.md) for details

---

## Backend Architecture

### Technology Stack

- **Express**: Web framework for REST API
- **TypeScript**: Type safety on the backend
- **Prisma ORM**: Database access with migrations
- **PostgreSQL**: Relational database
- **Zod**: Schema validation and parsing
- **JWT**: Stateless authentication
- **bcryptjs**: Password hashing
- **Helmet**: Security headers
- **Morgan**: HTTP request logging
- **Swagger UI**: Interactive API documentation

### Layered Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      HTTP Layer                          │
│  Routes → Middleware → Controllers                       │
│  (Express routing, validation, request handling)         │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│                   Business Logic Layer                   │
│  Services (transactionStatusService, etc.)               │
│  (Business rules, state machines, aggregations)          │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│                   Data Access Layer                      │
│  Prisma Client                                           │
│  (Type-safe queries, transactions, migrations)           │
└────────────────────────┬─────────────────────────────────┘
                         │
                   PostgreSQL
```

### Request Flow

```
1. HTTP Request
   ↓
2. Route Matching (routes/)
   ↓
3. Middleware Pipeline
   │
   ├── Logging (morgan)
   ├── Security (helmet, cors)
   ├── Authentication (authenticate)
   ├── Authorization (requireOrgRole)
   └── Validation (validate with Zod)
   ↓
4. Controller (controllers/)
   │  - Extract params/body
   │  - Call service layer
   │  - Format response
   ↓
5. Service (services/)
   │  - Business logic
   │  - Data validation
   │  - Database operations
   ↓
6. Database (Prisma)
   │  - Query execution
   │  - Transaction management
   ↓
7. Response
   │  - Success: 200/201 with data
   │  - Error: 4xx/5xx with message
```

### Directory Structure

```
src/
├── config/
│   ├── env.ts             # Environment validation (Zod)
│   ├── database.ts        # Prisma client singleton
│   └── openapi.ts         # OpenAPI specification
│
├── controllers/           # HTTP request handlers
│   ├── authController.ts
│   ├── organizationController.ts
│   ├── accountController.ts
│   ├── transactionController.ts
│   └── transactionStatusController.ts
│
├── middleware/
│   ├── auth.ts            # JWT authentication
│   ├── organization.ts    # Org membership/role checks
│   ├── validate.ts        # Zod validation middleware
│   ├── errorHandler.ts    # Centralized error handling
│   └── transactionProtection.ts  # Prevent editing reconciled txns
│
├── routes/                # Express route definitions
│   ├── auth.ts
│   ├── organizations.ts
│   ├── accounts.ts
│   ├── transactions.ts
│   └── transactionStatus.ts
│
├── schemas/               # Zod validation schemas
│   ├── auth.ts
│   ├── organization.ts
│   ├── account.ts
│   ├── transaction.ts
│   └── transactionStatus.ts
│
├── services/              # Business logic layer
│   ├── authService.ts
│   ├── organizationService.ts
│   ├── accountService.ts
│   ├── transactionService.ts
│   └── transactionStatusService.ts
│
├── types/                 # TypeScript type definitions
│   └── express.d.ts      # Extend Express types
│
├── utils/
│   └── response.ts       # Standard response formatting
│
└── index.ts              # App entry point
```

### Service Layer Pattern

**Why a Service Layer?**

1. **Separation of Concerns**: Controllers handle HTTP, services handle business logic
2. **Testability**: Services can be tested without HTTP layer
3. **Reusability**: Services can be called from multiple controllers
4. **Transaction Management**: Complex operations span multiple database calls

**Example Service:**

```typescript
// services/transactionStatusService.ts
export async function changeTransactionStatus(
  organizationId: string,
  accountId: string,
  transactionId: string,
  userId: string,
  input: StatusChangeRequestDto
): Promise<StatusHistoryInfo> {
  // 1. Verify ownership
  const account = await prisma.account.findFirst({
    where: { id: accountId, organizationId },
  })
  if (!account) throw new AppError('Account not found', 404)

  // 2. Get transaction
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, accountId },
  })
  if (!transaction) throw new AppError('Transaction not found', 404)

  // 3. Validate state transition
  if (!isValidStatusTransition(transaction.status, input.status)) {
    throw new AppError('Invalid status transition', 400)
  }

  // 4. Update in database transaction
  const result = await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: transactionId },
      data: { status: input.status, clearedAt: new Date() },
    })

    return tx.transactionStatusHistory.create({
      data: {
        transactionId,
        fromStatus: transaction.status,
        toStatus: input.status,
        changedById: userId,
        notes: input.notes,
      },
      include: { changedBy: true },
    })
  })

  return formatStatusHistory(result)
}
```

### Error Handling Strategy

**Centralized Error Handler:**

```typescript
// middleware/errorHandler.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500
  ) {
    super(message)
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    })
  }

  // Handle Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
    })
  }

  // Unknown error
  console.error(err)
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  })
}
```

**Usage in Services:**

```typescript
throw new AppError('Transaction not found', 404)
throw new AppError('Invalid status transition', 400)
throw new AppError('Unauthorized', 401)
```

---

## Database Schema

### Entity-Relationship Overview

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ 1:N
       ▼
┌─────────────────────┐
│ OrganizationMember │ ─────┐
└─────────────────────┘      │ N:1
                             ▼
                     ┌───────────────┐
                     │ Organization  │
                     └───────┬───────┘
                             │ 1:N
              ┌──────────────┴──────────────┐
              ▼                             ▼
       ┌──────────┐                  ┌──────────┐
       │ Account  │                  │ Category │
       └────┬─────┘                  └────┬─────┘
            │ 1:N                         │ 1:N
            ▼                             ▼
       ┌──────────────┐          ┌───────────────────┐
       │ Transaction  │◀─────────│ TransactionSplit  │
       └──────┬───────┘   1:N    └───────────────────┘
              │ 1:N
              ▼
    ┌──────────────────────────┐
    │ TransactionStatusHistory │
    └──────────────────────────┘
```

### Core Entities

#### User

Global user account with system-level role.

```prisma
model User {
  id                 String   @id @default(uuid())
  email              String   @unique
  password           String   // bcrypt hash
  name               String?
  role               Role     @default(USER)  // USER | ADMIN
  lastOrganizationId String?  // Last active org
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

**Design Decisions:**
- UUID primary keys for security (unpredictable)
- Email as unique identifier for login
- Optional name (not required for signup)
- System role separate from organization roles

#### Organization

Multi-tenant container for financial data.

```prisma
model Organization {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Design Decisions:**
- Simple structure for MVP
- Can be extended with billing, settings, etc.
- All financial data scoped to organization

#### OrganizationMember

Junction table with role-based access.

```prisma
model OrganizationMember {
  id             String           @id @default(uuid())
  userId         String
  organizationId String
  role           OrganizationRole @default(MEMBER)  // OWNER | ADMIN | MEMBER
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  @@unique([userId, organizationId])  // User can be member only once per org
}
```

**Design Decisions:**
- Three-tier role hierarchy
- OWNER: Full control including deletion
- ADMIN: Manage data but can't delete org
- MEMBER: Read-only access
- Unique constraint prevents duplicate memberships

#### Account

Financial account (bank account, credit card, etc.).

```prisma
model Account {
  id             String      @id @default(uuid())
  name           String
  description    String?
  institution    String?
  accountType    AccountType @default(CHECKING)
  balance        Decimal     @default(0) @db.Decimal(19, 4)
  currency       String      @default("USD")
  isActive       Boolean     @default(true)
  transactionFee Decimal?    @db.Decimal(19, 4)  // Optional per-transaction fee
  organizationId String
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
}

enum AccountType {
  CHECKING
  SAVINGS
  CREDIT_CARD
  CASH
  INVESTMENT
  OTHER
}
```

**Design Decisions:**
- Decimal type for accurate financial calculations (4 decimal places)
- Soft delete via `isActive` flag
- Optional transaction fee for some account types
- Balance is computed field (could be calculated from transactions)

#### Transaction

Financial transaction with status tracking.

```prisma
model Transaction {
  id                   String            @id @default(uuid())
  description          String
  amount               Decimal           @db.Decimal(19, 4)
  transactionType      TransactionType   @default(EXPENSE)
  date                 DateTime          @default(now())
  feeAmount            Decimal?          @db.Decimal(19, 4)
  status               TransactionStatus @default(UNCLEARED)
  clearedAt            DateTime?
  reconciledAt         DateTime?
  accountId            String
  destinationAccountId String?  // For transfers
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@index([accountId, status, date])  // Optimized for common queries
}

enum TransactionType {
  INCOME
  EXPENSE
  TRANSFER
}

enum TransactionStatus {
  UNCLEARED  // Just created
  CLEARED    // Appeared on statement
  RECONCILED // Verified and locked
}
```

**Design Decisions:**
- Three status states (see [ADR-001](./adr/001-transaction-status-state-machine.md))
- Timestamp fields for status changes (audit trail)
- Support for transfers via destinationAccountId
- Composite index for efficient filtering by account + status + date
- Optional fee tracking

#### TransactionStatusHistory

Audit trail for status changes.

```prisma
model TransactionStatusHistory {
  id            String             @id @default(uuid())
  transactionId String
  fromStatus    TransactionStatus?  // Null for initial creation
  toStatus      TransactionStatus
  changedById   String
  changedAt     DateTime           @default(now())
  notes         String?

  @@index([transactionId])
  @@index([changedAt])
}
```

**Design Decisions:**
- Immutable history (never updated/deleted)
- Tracks who made the change
- Optional notes for context
- Indexed for fast lookup by transaction and date

#### TransactionSplit

Category allocation for transactions.

```prisma
model TransactionSplit {
  id            String   @id @default(uuid())
  amount        Decimal  @db.Decimal(19, 4)
  transactionId String
  categoryId    String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**Design Decisions:**
- Allows splitting single transaction across multiple categories
- Sum of split amounts should equal transaction amount (enforced in business logic)
- Simplifies budgeting and reporting by category

#### Category

Organization-scoped categorization.

```prisma
model Category {
  id             String   @id @default(uuid())
  name           String
  organizationId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([organizationId, name])  // Unique names within org
}
```

**Design Decisions:**
- Simple flat structure (no subcategories in MVP)
- Scoped to organization for multi-tenancy
- Unique names within organization

### Database Indexes

**Strategic Indexing for Performance:**

```prisma
// Transaction queries often filter by account and status
@@index([accountId, status])

// Reconciliation queries need date range filtering
@@index([accountId, status, date])

// History lookups by transaction
@@index([transactionId])

// Audit queries by date
@@index([changedAt])

// Organization membership lookups
@@index([organizationId])
@@index([userId, organizationId])
```

---

## Authentication & Authorization

### Authentication Flow

```
┌─────────┐                           ┌─────────┐
│ Client  │                           │  Server │
└────┬────┘                           └────┬────┘
     │                                     │
     │  POST /api/auth/register            │
     │  { email, password, name }          │
     ├────────────────────────────────────▶│
     │                                     │
     │                     ┌───────────────┴─────────────┐
     │                     │ 1. Validate input (Zod)     │
     │                     │ 2. Hash password (bcrypt)   │
     │                     │ 3. Create user in DB        │
     │                     │ 4. Generate JWT token       │
     │                     └───────────────┬─────────────┘
     │                                     │
     │  { user, token }                    │
     │◀────────────────────────────────────┤
     │                                     │
     │  Store token in memory/localStorage │
     │                                     │
     │                                     │
     │  GET /api/auth/me                   │
     │  Authorization: Bearer <token>      │
     ├────────────────────────────────────▶│
     │                                     │
     │                     ┌───────────────┴─────────────┐
     │                     │ 1. Extract token from header│
     │                     │ 2. Verify JWT signature     │
     │                     │ 3. Decode user ID           │
     │                     │ 4. Lookup user in DB        │
     │                     │ 5. Attach to req.user       │
     │                     └───────────────┬─────────────┘
     │                                     │
     │  { user }                           │
     │◀────────────────────────────────────┤
     │                                     │
```

### JWT Structure

```typescript
// JWT Payload
{
  id: 'user-uuid',        // User ID
  email: 'user@example.com',
  role: 'USER',           // System role (USER | ADMIN)
  iat: 1234567890,        // Issued at timestamp
  exp: 1234567890         // Expiration timestamp
}

// Environment Configuration
JWT_SECRET=<min-32-char-secret>
JWT_EXPIRES_IN=7d
```

### Authorization Layers

#### 1. Authentication Middleware

```typescript
// middleware/auth.ts
export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) throw new AppError('No token provided', 401)

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    })

    if (!user) throw new AppError('User not found', 401)

    req.user = user  // Attach to request
    next()
  } catch (error) {
    next(new AppError('Invalid token', 401))
  }
}
```

#### 2. Organization Membership Middleware

```typescript
// middleware/organization.ts
export const requireOrgMembership = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { orgId } = req.params
    const userId = req.user!.id

    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: orgId },
      },
    })

    if (!member) {
      throw new AppError('Not a member of this organization', 403)
    }

    req.organizationMember = member  // Attach to request
    next()
  }
}
```

#### 3. Role-Based Authorization

```typescript
export const requireOrgRole = (...allowedRoles: OrganizationRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // First ensure membership
    await requireOrgMembership()(req, res, () => {})

    const member = req.organizationMember!

    if (!allowedRoles.includes(member.role)) {
      throw new AppError('Insufficient permissions', 403)
    }

    next()
  }
}

// Usage in routes
router.patch(
  '/:transactionId/status',
  authenticate,
  requireOrgRole('OWNER', 'ADMIN'),  // Only OWNER and ADMIN
  changeStatus
)
```

### Authorization Matrix

| Resource | Operation | PUBLIC | USER (Authenticated) | MEMBER | ADMIN | OWNER |
|----------|-----------|--------|---------------------|--------|-------|-------|
| Auth | Register/Login | ✅ | ✅ | ✅ | ✅ | ✅ |
| Users | List all | ❌ | ❌ (ADMIN only) | ❌ | ❌ | ❌ |
| Organizations | Create | ❌ | ✅ | ✅ | ✅ | ✅ |
| Organizations | Read own | ❌ | ❌ | ✅ | ✅ | ✅ |
| Organizations | Update | ❌ | ❌ | ❌ | ✅ | ✅ |
| Organizations | Delete | ❌ | ❌ | ❌ | ❌ | ✅ |
| Accounts | Read | ❌ | ❌ | ✅ | ✅ | ✅ |
| Accounts | Create/Update | ❌ | ❌ | ❌ | ✅ | ✅ |
| Accounts | Delete | ❌ | ❌ | ❌ | ✅ | ✅ |
| Transactions | Read | ❌ | ❌ | ✅ | ✅ | ✅ |
| Transactions | Create/Update | ❌ | ❌ | ❌ | ✅ | ✅ |
| Transactions | Delete | ❌ | ❌ | ❌ | ✅ | ✅ |
| Status | Read history | ❌ | ❌ | ✅ | ✅ | ✅ |
| Status | Change status | ❌ | ❌ | ❌ | ✅ | ✅ |
| Status | Bulk operations | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## State Management

### Redux Store Structure

```typescript
{
  auth: {
    user: User | null,
    token: string | null,
    isAuthenticated: boolean,
    loading: boolean,
    error: string | null,
  },

  organization: {
    organizations: Organization[],
    activeOrganizationId: string | null,
    loading: boolean,
    error: string | null,
  },

  status: {
    // Status filtering
    statusFilter: {
      uncleared: boolean,
      cleared: boolean,
      reconciled: boolean,
    },

    // Bulk selection
    selectedIds: string[],
    isSelectAllMode: boolean,
    excludedIds: string[],

    // Reconciliation workflow
    reconciliation: {
      isActive: boolean,
      statementBalance: number | null,
      statementDate: string | null,
    },

    // Optimistic update tracking
    pendingChanges: {
      [transactionId]: {
        previousStatus: TransactionStatus,
        newStatus: TransactionStatus,
        timestamp: number,
      },
    },
  },

  api: {
    // RTK Query cache
    // Automatically managed by RTK Query
    queries: { ... },
    mutations: { ... },
  },
}
```

### State Management Patterns

#### 1. Server State (RTK Query)

For data that lives on the server:

```typescript
// store/api/transactions.ts
export const transactionsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTransactions: builder.query({
      query: ({ orgId, accountId }) =>
        `/organizations/${orgId}/accounts/${accountId}/transactions`,
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Transaction', id } as const)),
              { type: 'Transaction', id: 'LIST' },
            ]
          : [{ type: 'Transaction', id: 'LIST' }],
    }),

    updateTransactionStatus: builder.mutation({
      query: ({ orgId, accountId, transactionId, ...body }) => ({
        url: `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { transactionId }) => [
        { type: 'Transaction', id: transactionId },
      ],
      // Optimistic update
      async onQueryStarted({ transactionId, status }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          transactionsApi.util.updateQueryData(
            'getTransactions',
            { orgId, accountId },
            (draft) => {
              const transaction = draft.data.find((t) => t.id === transactionId)
              if (transaction) {
                transaction.status = status
              }
            }
          )
        )

        try {
          await queryFulfilled
        } catch {
          patchResult.undo()  // Rollback on error
        }
      },
    }),
  }),
})
```

**Benefits:**
- Automatic caching and invalidation
- Optimistic updates with rollback
- Loading states managed automatically
- Reduces boilerplate

#### 2. Client State (Redux Slices)

For UI state that doesn't persist:

```typescript
// store/features/statusSlice.ts
const statusSlice = createSlice({
  name: 'status',
  initialState,
  reducers: {
    toggleStatusFilter: (state, action: PayloadAction<keyof StatusFilterState>) => {
      const key = action.payload
      state.statusFilter[key] = !state.statusFilter[key]
    },

    toggleSelection: (state, action: PayloadAction<string>) => {
      const id = action.payload
      if (state.isSelectAllMode) {
        // Toggle exclusion
        const index = state.excludedIds.indexOf(id)
        if (index === -1) {
          state.excludedIds.push(id)
        } else {
          state.excludedIds.splice(index, 1)
        }
      } else {
        // Toggle inclusion
        const index = state.selectedIds.indexOf(id)
        if (index === -1) {
          state.selectedIds.push(id)
        } else {
          state.selectedIds.splice(index, 1)
        }
      }
    },

    startReconciliation: (state) => {
      state.reconciliation.isActive = true
    },
  },
})
```

**When to Use:**
- Filter selections
- Bulk operation selections
- Modal open/close states
- Form draft states
- Workflow progress (reconciliation)

#### 3. Local State (useState)

For component-specific state:

```typescript
function TransactionRow({ transaction }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Local state doesn't need global access
}
```

**When to Use:**
- Component-only state
- Temporary UI state
- Form inputs (unless using react-hook-form)

### Selectors and Memoization

```typescript
// Memoized selectors prevent unnecessary re-renders
export const selectActiveStatusFilters = createSelector(
  [selectStatusFilter],
  (filter): TransactionStatus[] => {
    const active: TransactionStatus[] = []
    if (filter.uncleared) active.push('UNCLEARED')
    if (filter.cleared) active.push('CLEARED')
    if (filter.reconciled) active.push('RECONCILED')
    return active
  }
)

// Factory selectors for component-specific selections
export const makeSelectIsSelected = () =>
  createSelector(
    [selectSelectedIds, selectIsSelectAllMode, selectExcludedIds, (_, id) => id],
    (selectedIds, isSelectAllMode, excludedIds, id): boolean => {
      if (isSelectAllMode) {
        return !excludedIds.includes(id)
      }
      return selectedIds.includes(id)
    }
  )

// Usage in component
const selectIsSelected = useMemo(makeSelectIsSelected, [])
const isSelected = useSelector((state) => selectIsSelected(state, transaction.id))
```

---

## API Design Patterns

### RESTful Resource Nesting

**Pattern:** Nest resources to reflect ownership hierarchy

```
/api/organizations/:orgId/accounts/:accountId/transactions/:transactionId
```

**Benefits:**
- Clear ownership hierarchy
- Implicit authorization (must have access to parent)
- Self-documenting URLs

### Request/Response Format

**Successful Response:**

```json
{
  "success": true,
  "data": {
    "transaction": { ... },
    "history": [ ... ]
  },
  "message": "Transaction updated successfully"
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Invalid status transition",
  "errors": {
    "status": "Cannot transition from RECONCILED to UNCLEARED"
  }
}
```

### Validation Strategy

**Three Layers of Validation:**

1. **TypeScript** (compile-time)
2. **Zod** (runtime, API boundary)
3. **Database constraints** (data integrity)

```typescript
// Schema definition
const statusChangeRequestSchema = z.object({
  status: z.enum(['UNCLEARED', 'CLEARED', 'RECONCILED']),
  notes: z.string().max(500).optional(),
})

// Middleware usage
router.patch(
  '/:transactionId/status',
  validate({ body: statusChangeRequestSchema }),  // Validates before controller
  changeStatus
)
```

### Pagination Pattern

```typescript
// Query parameters
GET /api/organizations/:orgId/accounts?page=1&limit=10

// Response
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

### Bulk Operations Pattern

**Partial Success Support:**

```typescript
// Request
POST /api/organizations/:orgId/accounts/:accountId/transactions/status/bulk
{
  "transactionIds": ["id1", "id2", "id3"],
  "status": "CLEARED"
}

// Response (207 Multi-Status if any failures)
{
  "success": true,
  "data": {
    "successful": [
      { "transactionId": "id1", "status": "CLEARED" },
      { "transactionId": "id2", "status": "CLEARED" }
    ],
    "failed": [
      { "transactionId": "id3", "error": "Transaction is already CLEARED" }
    ]
  },
  "message": "Bulk operation completed with 2 successes and 1 failure"
}
```

**Why 207 Multi-Status?**
- Indicates partial success
- Client can handle failures individually
- See [ADR-004](./adr/004-bulk-operations-partial-failure.md)

---

## Data Flow

### Transaction Status Change Flow

```
┌──────────┐
│   User   │
└────┬─────┘
     │ 1. Clicks "Mark as Cleared"
     ▼
┌────────────────────┐
│  React Component   │
│  (TransactionRow)  │
└────────┬───────────┘
         │ 2. Dispatch RTK Query mutation
         ▼
┌─────────────────────┐
│  RTK Query Slice    │
│  (optimistic update)│
└────────┬────────────┘
         │ 3. Update cache immediately
         │ 4. Send HTTP PATCH request
         ▼
┌─────────────────────┐
│   Express Server    │
│   (API endpoint)    │
└────────┬────────────┘
         │ 5. Validate request (Zod)
         │ 6. Check authorization
         ▼
┌──────────────────────┐
│  Status Service      │
│  (business logic)    │
└────────┬─────────────┘
         │ 7. Validate state transition
         │ 8. Update transaction + create history
         │    (in database transaction)
         ▼
┌──────────────────────┐
│   PostgreSQL         │
│   (data persistence) │
└────────┬─────────────┘
         │ 9. Commit transaction
         ▼
┌──────────────────────┐
│   Express Server     │
│   (response)         │
└────────┬─────────────┘
         │ 10. Return success response
         ▼
┌──────────────────────┐
│   RTK Query Slice    │
│   (confirm update)   │
└────────┬─────────────┘
         │ 11. Invalidate cache tags
         │ 12. Refetch if needed
         ▼
┌──────────────────────┐
│   React Component    │
│   (UI updates)       │
└──────────────────────┘

// If error occurs at any step:
// RTK Query rolls back optimistic update
```

### Reconciliation Workflow

```
1. User navigates to Reconciliation page
   ↓
2. Select account to reconcile
   ↓
3. Fetch reconciliation summary (GET /status/summary)
   ├─ Uncleared count & total
   ├─ Cleared count & total
   └─ Reconciled count & total
   ↓
4. User enters statement balance & date
   ↓
5. Filter to show CLEARED transactions
   ↓
6. User selects transactions to reconcile
   ├─ Individual selection
   ├─ Select all
   └─ Select all with exclusions
   ↓
7. Review selection count
   ↓
8. Click "Reconcile Selected"
   ↓
9. Bulk status change (POST /status/bulk)
   {
     transactionIds: [...],
     status: "RECONCILED",
     notes: "Bank statement 2026-01-15"
   }
   ↓
10. Server processes in single DB transaction
    ├─ Update all transaction statuses
    └─ Create history records
    ↓
11. Response with successful/failed
    ↓
12. UI shows results
    ├─ Success toast
    └─ Clear selections
    ↓
13. Refresh summary
```

---

## Key Design Decisions

### 1. Monorepo Structure

**Decision:** Use separate `treasurer/` and `treasurer-api/` folders in monorepo

**Rationale:**
- Clear separation between frontend and backend
- Independent deployment possible
- Shared types via API contracts (not shared code)

**Trade-offs:**
- Some duplication of types
- More complex build setup
- Better separation of concerns

### 2. TypeScript Everywhere

**Decision:** Use TypeScript for both frontend and backend

**Rationale:**
- Type safety prevents runtime errors
- Better developer experience (autocomplete, refactoring)
- Self-documenting code

**Trade-offs:**
- Steeper learning curve
- More build configuration
- Worth it for error prevention

### 3. Prisma ORM

**Decision:** Use Prisma instead of raw SQL or other ORMs

**Rationale:**
- Type-safe database access
- Great developer experience
- Built-in migrations
- Schema as single source of truth

**Trade-offs:**
- Some advanced queries require raw SQL
- Migration process can be complex
- Excellent for this use case

### 4. JWT for Authentication

**Decision:** Use JWT tokens instead of sessions

**Rationale:**
- Stateless (no session storage needed)
- Works well with microservices
- Easy to scale horizontally

**Trade-offs:**
- Can't revoke tokens before expiry
- Token size larger than session ID
- Good fit for this architecture

### 5. Redux Toolkit + RTK Query

**Decision:** Use RTK Query for API calls instead of custom thunks

**Rationale:**
- Automatic caching and invalidation
- Optimistic updates built-in
- Less boilerplate than traditional Redux
- Excellent developer experience

**Trade-offs:**
- Learning curve for RTK Query patterns
- Cache invalidation can be complex
- Best-in-class for React + Redux apps

### 6. Organization-Based Multi-Tenancy

**Decision:** Use organization scoping instead of user-only data

**Rationale:**
- Supports team/family financial management
- Role-based access within organizations
- Scales to business use cases

**Trade-offs:**
- More complex authorization
- Additional join tables needed
- Future-proofing for team features

### 7. Transaction Status State Machine

**Decision:** Use strict state machine (UNCLEARED → CLEARED → RECONCILED)

**Rationale:**
- Prevents invalid states
- Clear reconciliation workflow
- Audit trail with history
- See [ADR-001](./adr/001-transaction-status-state-machine.md)

**Trade-offs:**
- Less flexible than free-form status
- Need to support edge cases
- Right choice for financial accuracy

### 8. Bulk Operations with Partial Failure

**Decision:** Support partial success in bulk operations

**Rationale:**
- Better UX (don't fail entire batch for one error)
- Clear feedback on what succeeded/failed
- See [ADR-004](./adr/004-bulk-operations-partial-failure.md)

**Trade-offs:**
- More complex error handling
- Need 207 Multi-Status HTTP code
- Correct approach for bulk operations

---

## Performance Considerations

### Database Query Optimization

**1. Strategic Indexes**

```prisma
// Common query: Get transactions by account and status
@@index([accountId, status])

// Reconciliation queries with date filtering
@@index([accountId, status, date])
```

**2. Connection Pooling**

Prisma automatically manages connection pool:

```typescript
// config/database.ts
export const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  // Connection pool configuration
})
```

**3. Pagination**

All list endpoints support pagination:

```typescript
const transactions = await prisma.transaction.findMany({
  where: { accountId },
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { date: 'desc' },
})
```

### Frontend Performance

**1. Code Splitting**

```typescript
// Lazy load pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ReconciliationPage = lazy(() => import('./pages/ReconciliationPage'))
```

**2. Memoization**

```typescript
// Memoize expensive selectors
export const selectFilteredTransactions = createSelector(
  [selectAllTransactions, selectStatusFilter],
  (transactions, filter) => {
    return transactions.filter(/* ... */)
  }
)

// Memoize components
const TransactionRow = memo(({ transaction }) => {
  // ...
})
```

**3. RTK Query Caching**

```typescript
// Automatic caching with tag-based invalidation
export const transactionsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTransactions: builder.query({
      query: ({ orgId, accountId }) => /* ... */,
      providesTags: (result) => [
        { type: 'Transaction', id: 'LIST' },
        ...result.map(t => ({ type: 'Transaction', id: t.id }))
      ],
      // Cache for 60 seconds
      keepUnusedDataFor: 60,
    }),
  }),
})
```

**4. Optimistic Updates**

```typescript
// Update UI immediately, rollback on error
async onQueryStarted({ transactionId, status }, { dispatch, queryFulfilled }) {
  const patchResult = dispatch(
    transactionsApi.util.updateQueryData(/* ... */)
  )

  try {
    await queryFulfilled
  } catch {
    patchResult.undo()  // Instant rollback
  }
}
```

### Bulk Operation Optimization

**Single Database Transaction:**

```typescript
// Process all updates in one transaction
await prisma.$transaction(async (tx) => {
  // Update all transactions
  for (const validTx of validTransactions) {
    await tx.transaction.update({ /* ... */ })
  }

  // Create all history records in batch
  await tx.transactionStatusHistory.createMany({
    data: validTransactions.map(/* ... */)
  })
})
```

**See [ADR-005](./adr/005-single-transaction-bulk-updates.md) for details.**

---

## Security Model

### Defense in Depth

**Multiple Layers:**

1. **Network**: HTTPS only in production
2. **Headers**: Helmet.js for security headers
3. **Authentication**: JWT with expiration
4. **Authorization**: Multi-layer (auth → org membership → role)
5. **Input Validation**: Zod schemas at API boundary
6. **Output Encoding**: JSON serialization prevents XSS
7. **Database**: Prepared statements (Prisma) prevent SQL injection

### Password Security

```typescript
// Registration
const hashedPassword = await bcrypt.hash(password, 12)  // 12 rounds

// Login
const isValid = await bcrypt.compare(password, user.password)
```

**Configuration:**
- 12 salt rounds (2^12 iterations)
- Passwords never logged or exposed in API responses

### JWT Security

**Best Practices:**
- Secret key minimum 32 characters
- Token expiration (7 days default)
- Token verification on every request
- User lookup to ensure still exists

**Excluded from JWT:**
- Password hash
- Sensitive personal data
- Included: User ID, email, role

### SQL Injection Prevention

Prisma uses prepared statements automatically:

```typescript
// Safe - parameterized query
await prisma.transaction.findMany({
  where: { accountId: accountId },  // Parameterized
})

// Never do this (but Prisma doesn't allow it anyway)
await prisma.$queryRaw`SELECT * FROM transactions WHERE id = ${id}`  // ❌
```

### CORS Configuration

```typescript
// Only allow requests from frontend
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}))
```

### Rate Limiting

**Not currently implemented**, but recommended for production:

```typescript
// Future enhancement
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // Limit each IP to 100 requests per window
})

app.use('/api/', limiter)
```

---

## Testing Strategy

### Test Distribution

**Backend Tests: 138**
- Unit tests: Services, utilities
- Integration tests: API endpoints with test database
- Coverage: Controllers, services, middleware

**Frontend Tests: 232**
- Unit tests: Components, hooks, slices
- Integration tests: Feature workflows
- Coverage: Redux slices, selectors, components

### Testing Tools

- **Vitest**: Test runner (fast, Vite-native)
- **Supertest**: HTTP endpoint testing
- **Testing Library**: React component testing
- **MSW**: API mocking for frontend tests

### Backend Testing Pattern

```typescript
// Example: Service test
describe('transactionStatusService', () => {
  it('should change status from UNCLEARED to CLEARED', async () => {
    const result = await changeTransactionStatus(
      orgId,
      accountId,
      transactionId,
      userId,
      { status: 'CLEARED' }
    )

    expect(result.toStatus).toBe('CLEARED')
    expect(result.fromStatus).toBe('UNCLEARED')
  })

  it('should reject invalid transition', async () => {
    await expect(
      changeTransactionStatus(/* ... */, { status: 'UNCLEARED' })
    ).rejects.toThrow('Cannot modify reconciled transactions')
  })
})

// Example: API endpoint test
describe('PATCH /status', () => {
  it('should return 200 and update status', async () => {
    const response = await request(app)
      .patch(`/api/organizations/${orgId}/accounts/${accountId}/transactions/${txId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CLEARED' })
      .expect(200)

    expect(response.body.data.history.toStatus).toBe('CLEARED')
  })
})
```

### Frontend Testing Pattern

```typescript
// Example: Redux slice test
describe('statusSlice', () => {
  it('should toggle status filter', () => {
    const state = statusReducer(
      initialState,
      toggleStatusFilter('uncleared')
    )

    expect(state.statusFilter.uncleared).toBe(false)
  })
})

// Example: Component test
describe('<TransactionRow />', () => {
  it('should render transaction details', () => {
    render(<TransactionRow transaction={mockTransaction} />)

    expect(screen.getByText('Grocery Store')).toBeInTheDocument()
    expect(screen.getByText('$42.50')).toBeInTheDocument()
  })

  it('should show CLEARED badge', () => {
    render(<TransactionRow transaction={{ ...mockTransaction, status: 'CLEARED' }} />)

    expect(screen.getByText('CLEARED')).toBeInTheDocument()
  })
})
```

### Test Database Strategy

**Backend:**
- Use separate test database
- Reset between test suites
- Seed with known data

```typescript
// Setup/teardown
beforeAll(async () => {
  await prisma.$connect()
})

afterEach(async () => {
  await prisma.transaction.deleteMany()
  await prisma.account.deleteMany()
  // ...
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

### CI/CD Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Lint check
pnpm lint
```

---

## Conclusion

This architecture document provides a comprehensive overview of the Treasurer application's technical design. The system is built on solid foundations with clear separation of concerns, type safety throughout, and a focus on maintainability and security.

**Key Takeaways:**

1. **Clean Architecture**: Clear layers with defined responsibilities
2. **Type Safety**: TypeScript + Zod + Prisma eliminate entire classes of errors
3. **Multi-Tenancy**: Organization-based scoping enables team features
4. **State Management**: Redux for client state, RTK Query for server state
5. **Security**: Multiple layers of defense (auth → authz → validation)
6. **Testing**: 370+ tests ensure reliability
7. **Performance**: Strategic caching, indexing, and optimization

**For More Information:**

- [API Documentation](./API.md) - Detailed API reference
- [Transaction Status Feature](./TRANSACTION_STATUS.md) - Status management deep dive
- [Development Guide](./DEVELOPMENT.md) - Setup and workflow
- [ADR Directory](./adr/) - Architecture decision records

---

**Document Metadata:**
- **Version:** 0.1.0
- **Last Updated:** 2026-01-17
- **Maintainers:** Development Team
- **Review Cycle:** Quarterly or on major architecture changes
