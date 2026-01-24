# Treasurer

A full-stack financial management application for tracking accounts, transactions, and reconciliation workflows. Built for organizations that need multi-user access with role-based permissions.

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18, TypeScript | Component-based UI with strict mode |
| State | Redux Toolkit, RTK Query | Client state and API caching |
| Styling | Tailwind CSS 3.x | Utility-first styling |
| Forms | React Hook Form + Zod | Type-safe form validation |
| Animation | Framer Motion | UI transitions and effects |
| Backend | Express 4.x, TypeScript | REST API server |
| ORM | Prisma 5.x | Type-safe database access |
| Database | PostgreSQL 16 | Data persistence |
| Testing | Vitest, Playwright | Unit/integration and E2E |
| Build | Vite 5.x (frontend), tsx (backend) | Fast builds with HMR |

## Quick Start

```bash
# Prerequisites: Node 20+, pnpm 10+, Docker

# Using Docker (recommended)
docker compose up --build           # Start all services
docker compose up -d --build        # Start in background
docker compose logs -f              # View logs
docker compose down                 # Stop services
docker compose down -v              # Stop and reset database

# Access points
# Frontend: http://localhost:3000
# API: http://localhost:3001
# API docs: http://localhost:3001/api-docs
```

### Local Development (without Docker)

```bash
# Install dependencies
pnpm install

# Start PostgreSQL locally, then:

# Backend
cd treasurer-api
cp .env.example .env               # Configure DATABASE_URL, JWT_SECRET
pnpm db:migrate                    # Run migrations
pnpm dev                           # Start API (port 3001)

# Frontend (new terminal)
cd treasurer
cp .env.example .env
pnpm dev                           # Start client (port 3000)
```

## Project Structure

```
treasurer2026/
├── treasurer/                 # React frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   ├── ui/          # Reusable primitives (Button, Card, Input)
│   │   │   ├── layout/      # Layout components (Header, Footer, RootLayout)
│   │   │   ├── accounts/    # Account-related components
│   │   │   ├── transactions/ # Transaction components and edit forms
│   │   │   ├── categories/  # Category management (hierarchical)
│   │   │   ├── vendors/     # Vendor management
│   │   │   ├── auth/        # ProtectedRoute, RequireOrganization
│   │   │   └── export/      # Export functionality
│   │   ├── pages/           # Route page components
│   │   ├── store/           # Redux store
│   │   │   └── features/    # Redux slices (auth, organization, account, etc.)
│   │   ├── features/        # Feature modules
│   │   │   └── status/      # Transaction status feature (hooks, components, API)
│   │   ├── hooks/           # Custom hooks (useLocalStorage, useDebounce)
│   │   ├── lib/             # Utilities and API client
│   │   │   ├── api.ts       # Base fetch client with ApiError class
│   │   │   ├── api/         # Domain-specific API modules
│   │   │   └── validations/ # Zod validation schemas
│   │   └── types/           # TypeScript definitions
│   ├── e2e/                 # Playwright E2E tests
│   └── tests/               # Unit test files
│
├── treasurer-api/            # Express backend
│   ├── src/
│   │   ├── config/          # Environment (Zod-validated), database, OpenAPI
│   │   ├── controllers/     # HTTP request handlers
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── routes/          # Express route definitions
│   │   ├── schemas/         # Zod validation schemas
│   │   ├── services/        # Business logic layer
│   │   ├── types/           # TypeScript definitions
│   │   ├── utils/           # Response formatting, logging
│   │   └── constants/       # Error IDs for tracking
│   ├── prisma/              # Database schema and migrations
│   └── tests/               # Test files
│       ├── routes/          # API endpoint tests
│       ├── services/        # Service layer tests
│       ├── middleware/      # Middleware tests
│       ├── integration/     # Cross-module integration tests
│       └── helpers/         # Test utilities and factories
│
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md      # System architecture (comprehensive)
│   └── plans/               # Feature implementation plans
│
└── .claude/                  # Claude Code configuration
    ├── skills/              # Skill definitions
    └── agents/              # Agent configurations
```

## Available Commands

### Frontend (`treasurer/`)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with HMR (port 3000) |
| `pnpm build` | Production build |
| `pnpm test` | Run Vitest tests |
| `pnpm test:ui` | Tests with UI dashboard |
| `pnpm test:coverage` | Run with coverage report |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm test:e2e:ui` | E2E with Playwright UI |
| `pnpm lint` | ESLint (zero-warning policy) |
| `pnpm type-check` | TypeScript checking |

### Backend (`treasurer-api/`)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with hot reload (port 3001) |
| `pnpm build` | TypeScript compile to dist/ |
| `pnpm start` | Run compiled code |
| `pnpm test` | Run Vitest tests |
| `pnpm test:coverage` | Run with coverage |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Prisma Studio |

### Running Single Tests

```bash
# Frontend
cd treasurer && pnpm test -- path/to/test.test.ts

# Backend
cd treasurer-api && pnpm test -- path/to/test.test.ts
```

## Architecture Overview

Treasurer uses a multi-tenant architecture with organization-based data isolation. Users belong to organizations via memberships with specific roles (OWNER, ADMIN, MEMBER).

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  React Client   │────▶│  Express API    │────▶│   PostgreSQL    │
│  (Port 3000)    │     │  (Port 3001)    │     │   (Port 5432)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Key Architectural Patterns

- **Service Layer**: Controllers handle HTTP, services contain business logic
- **Centralized Error Handling**: `AppError` class with status codes and error IDs
- **Transaction Status State Machine**: UNCLEARED → CLEARED → RECONCILED
- **Optimistic Locking**: Version-based concurrency control for transactions
- **Edit History**: Full audit trail with field-level change tracking
- **Type Safety**: TypeScript strict mode, Zod validation, Prisma types

### Database Entities

| Entity | Purpose |
|--------|---------|
| User | System users with global role (USER/ADMIN) |
| Organization | Multi-tenant containers for financial data |
| OrganizationMember | User membership with org-level roles |
| Account | Financial accounts (checking, savings, credit, etc.) |
| Transaction | Financial transactions with status tracking |
| TransactionSplit | Category allocations within transactions |
| TransactionStatusHistory | Audit trail for status changes |
| TransactionEditHistory | Full edit audit with previous state snapshots |
| Category | Hierarchical organization-scoped categories |
| Vendor | Transaction payees/merchants |

## API Endpoints

All endpoints under `/api`. Interactive docs at `/api-docs`.

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - Login (returns JWT)
- `GET /auth/me` - Current user with organizations

### Organizations (authenticated)
- `POST/GET /organizations` - Create/List organizations
- `GET/PATCH/DELETE /organizations/:orgId` - Organization CRUD
- `POST /organizations/:orgId/switch` - Set active organization
- `/organizations/:orgId/members` - Member management

### Accounts (nested under organizations)
- `POST/GET /organizations/:orgId/accounts` - Create/List accounts
- `GET/PATCH/DELETE /organizations/:orgId/accounts/:accountId` - Account CRUD

### Transactions (nested under accounts)
- `POST/GET .../accounts/:accountId/transactions` - Create/List transactions
- `GET/PATCH/DELETE .../transactions/:transactionId` - Transaction CRUD
- `PATCH .../transactions/:transactionId/status` - Status change
- `POST .../transactions/status/bulk` - Bulk status change
- `GET .../transactions/:transactionId/edit-history` - Edit audit trail

### Categories & Vendors
- CRUD at `/organizations/:orgId/categories` (hierarchical support)
- CRUD at `/organizations/:orgId/vendors`

### Export
- `GET /organizations/:orgId/accounts/:accountId/transactions/export` - Excel export

## Authorization

### Middleware Chain
1. `authenticate` - JWT token validation
2. `requireOrgMembership()` - User must be organization member
3. `requireOrgRole('OWNER', 'ADMIN')` - Role-based access

### Organization Roles
| Role | Permissions |
|------|-------------|
| OWNER | Full control including deletion |
| ADMIN | Manage data, invite members |
| MEMBER | Read-only access |

## Environment Variables

### Backend (`treasurer-api/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Min 32 characters |
| `JWT_EXPIRES_IN` | No | Token expiry (default: 7d) |
| `CORS_ORIGIN` | No | Allowed origin (default: localhost:3000) |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | development/production |

### Frontend (`treasurer/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | API base URL |
| `VITE_APP_TITLE` | No | Application title |

## Code Conventions

### File Naming
- **Component files**: PascalCase (`Button.tsx`, `TransactionCard.tsx`)
- **Hook files**: camelCase with `use` prefix (`useLocalStorage.ts`)
- **Slice files**: camelCase with `Slice` suffix (`authSlice.ts`)
- **Service files**: camelCase with `Service` suffix (`transactionService.ts`)
- **Controller files**: camelCase with `Controller` suffix (`authController.ts`)
- **Test files**: Same name with `.test.ts` suffix

### Code Naming
- **Components**: PascalCase (`export function Button()`)
- **Functions**: camelCase (`function handleClick()`)
- **Variables**: camelCase (`const userData`, `let isLoading`)
- **Types/Interfaces**: PascalCase (`interface ButtonProps`, `type TransactionInfo`)
- **Constants**: SCREAMING_SNAKE (`const TOKEN_KEY`, `const ERROR_IDS`)
- **Enums**: PascalCase names, SCREAMING_SNAKE values

### Import Order
1. External packages (react, express, @reduxjs/toolkit)
2. Internal absolute imports (`@/components`, `@/lib`)
3. Relative imports (`./utils`, `../types`)
4. Types (with `type` keyword)

### Path Aliases
- Frontend: `@/*` maps to `./src/*`
- Backend: Use relative imports with `.js` extension (ESM requirement)

## Testing

### Backend Tests
- **Location**: `treasurer-api/tests/`
- **Pattern**: Supertest for HTTP, test database with cleanup
- **Factories**: `tests/helpers/testFactories.ts` for consistent test data
- **Setup**: `tests/setup.ts` handles database cleanup between tests

### Frontend Tests
- **Unit tests**: `treasurer/src/**/__tests__/*.test.ts`
- **Store tests**: `treasurer/tests/store/`
- **Pattern**: React Testing Library, MSW for mocking

### E2E Tests
- **Location**: `treasurer/e2e/`
- **Framework**: Playwright
- **Fixtures**: `e2e/fixtures/` for auth and transaction setup
- **Commands**: `pnpm test:e2e`, `pnpm test:e2e:ui`

## Key Patterns

### Optimistic Locking
Transactions use version-based optimistic locking. Updates require matching version number; conflicts return 409 with current server state and conflict metadata.

### Error Handling
- Backend: `AppError` class with statusCode, errors object, and errorId
- Frontend: `ApiError` class with conflict data support for 409 responses
- Zod validation errors return structured field-level errors

### Transaction Status State Machine
```
UNCLEARED → CLEARED → RECONCILED
                ↓
          (can reverse to CLEARED)
```
Reconciled transactions are protected from edits.

### Edit History
All transaction modifications tracked in `TransactionEditHistory`:
- Edit types: CREATE, UPDATE, DELETE, RESTORE, SPLIT_CHANGE
- Field changes with old/new values
- Previous state snapshot for rollback support

## Code Quality

- TypeScript strict mode with `noUncheckedIndexedAccess`
- ESLint zero-warning policy in both projects
- Prettier with single quotes, trailing commas
- Tailwind CSS plugin for Prettier
- Pre-commit hooks via Husky and lint-staged

## Additional Resources

- @docs/ARCHITECTURE.md - Detailed architecture documentation
- @treasurer-api/prisma/schema.prisma - Database schema
- @treasurer/e2e/README.md - E2E testing guide
- Interactive API docs: http://localhost:3001/api-docs (when running)


## Skill Usage Guide

When working on tasks involving these technologies, invoke the corresponding skill:

| Skill | Invoke When |
|-------|-------------|
| playwright | Creates end-to-end tests for critical user flows and workflows |
| prisma | Manages Prisma ORM for type-safe database access and migrations |
| redux | Handles Redux Toolkit state management and RTK Query for API caching |
| postgresql | Designs and optimizes PostgreSQL database schemas with Prisma ORM |
