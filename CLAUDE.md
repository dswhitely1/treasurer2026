# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Treasurer is a full-stack financial management application with a pnpm monorepo structure:
- `treasurer/` - React 18 frontend with Redux, Vite, and Tailwind CSS
- `treasurer-api/` - Express REST API with Prisma ORM and PostgreSQL

## Docker Development (Recommended)

```bash
docker compose up --build      # Start all services (postgres, api, client)
docker compose up -d --build   # Start in background
docker compose logs -f         # View logs
docker compose down            # Stop services
docker compose down -v         # Stop and reset database
```

**Access points:**
- Frontend: http://localhost:3000
- API: http://localhost:3001
- API docs: http://localhost:3001/api-docs

Hot reload is enabled via volume mounts for `src/` directories.

## Local Commands (without Docker)

### Frontend (`treasurer/`)

```bash
pnpm dev              # Start dev server (http://localhost:3000)
pnpm test             # Run Vitest tests
pnpm test:ui          # Tests with UI dashboard
pnpm build            # Production build
pnpm lint             # ESLint (zero-warning policy)
pnpm type-check       # TypeScript checking
```

### Backend (`treasurer-api/`)

```bash
pnpm dev              # Start dev server with hot reload
pnpm test             # Run Vitest tests
pnpm build            # TypeScript compile
pnpm lint             # ESLint
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema to database
pnpm db:studio        # Open Prisma Studio
```

### Running a Single Test

```bash
# Frontend
cd treasurer && pnpm test -- path/to/test.test.ts

# Backend
cd treasurer-api && pnpm test -- path/to/test.test.ts
```

## Architecture

### Frontend Structure

```
treasurer/src/
├── components/
│   ├── ui/           # Reusable UI (Button, Card with variants pattern)
│   └── layout/       # Layout components (Header, Footer, RootLayout)
├── pages/            # Route pages
├── store/            # Redux Toolkit
│   └── features/     # Redux slices (auth, organization, account, transaction)
├── hooks/            # Custom hooks (useLocalStorage, useDebounce)
├── lib/              # Utilities
│   └── api.ts        # Typed fetch client with ApiError class
└── types/            # TypeScript definitions
```

**Key patterns:**
- UI components use a variants pattern for flexible styling
- `@/*` path alias maps to `./src/`
- React Router v6 with outlet-based layouts
- Organization-scoped routes: `/org/:orgId/dashboard`, `/org/:orgId/accounts`, `/org/:orgId/transactions`

### Backend Structure

```
treasurer-api/src/
├── config/           # Environment (Zod-validated), database, OpenAPI
├── controllers/      # HTTP request handlers
├── middleware/       # Auth (JWT), validation (Zod), error handling
├── routes/           # Express route definitions
├── schemas/          # Zod validation schemas
├── services/         # Business logic layer
├── types/            # TypeScript definitions
└── utils/            # Response formatting
```

**Key patterns:**
- Services layer for business logic, controllers for HTTP handling
- Centralized error handling with AppError class
- JWT Bearer tokens with role-based access (USER, ADMIN)
- Zod schemas for request/response validation
- bcryptjs with 12 salt rounds for passwords

### Database

PostgreSQL with Prisma ORM. Schema at `treasurer-api/prisma/schema.prisma`.

**Core entities:**
- `User` - System users with global role (USER/ADMIN)
- `Organization` - Multi-tenant containers for financial data
- `OrganizationMember` - User membership with org-level roles (OWNER/ADMIN/MEMBER)
- `Account` - Financial accounts (checking, savings, credit, etc.) with optional transaction fees
- `Transaction` - Financial transactions with type (INCOME/EXPENSE/TRANSFER)
- `TransactionSplit` - Category allocations within a transaction
- `Category` - Organization-scoped transaction categories

## API Endpoints

### Core
- `GET /health` - Health check
- `POST /api/auth/register` - Registration
- `POST /api/auth/login` - Login (returns JWT)
- `GET /api/auth/me` - Current user (authenticated)

### Organizations (all authenticated)
- `POST /api/organizations` - Create organization
- `GET /api/organizations` - List user's organizations
- `GET/PATCH/DELETE /api/organizations/:orgId` - Organization CRUD
- `POST /api/organizations/:orgId/switch` - Set as user's active organization
- Member management at `/api/organizations/:orgId/members`

### Accounts (nested under organizations)
- `POST/GET /api/organizations/:orgId/accounts` - Create/List accounts
- `GET/PATCH/DELETE /api/organizations/:orgId/accounts/:accountId` - Account CRUD

### Transactions (nested under accounts)
- `POST/GET /api/organizations/:orgId/accounts/:accountId/transactions` - Create/List transactions
- `GET/PATCH/DELETE .../transactions/:transactionId` - Transaction CRUD

### Categories
- CRUD at `/api/organizations/:orgId/categories`

### Users (admin)
- `GET /api/users` - List users (admin only)
- `GET/PATCH/DELETE /api/users/:id` - User CRUD

Interactive docs at `/api-docs` when server running.

## Authorization

**Organization-scoped middleware:**
- `requireOrgMembership()` - User must be a member of the organization
- `requireOrgRole('OWNER', 'ADMIN')` - User must have specified role(s)

Routes use nested structure where `:orgId` is validated and org membership checked via middleware.

## Environment Setup

Copy `.env.example` to `.env` in each project:

**Frontend:** `VITE_API_URL=http://localhost:3001/api`

**Backend:** `DATABASE_URL`, `JWT_SECRET` (min 32 chars), `JWT_EXPIRES_IN`, `CORS_ORIGIN`

## Code Quality

- TypeScript strict mode with no implicit `any`
- ESLint with zero warnings policy in both projects
- Prettier with single quotes, trailing commas, Tailwind plugin
