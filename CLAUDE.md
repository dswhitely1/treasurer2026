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
│   └── features/     # Redux slices
├── hooks/            # Custom hooks (useLocalStorage, useDebounce)
├── lib/              # Utilities
│   └── api.ts        # Typed fetch client with ApiError class
└── types/            # TypeScript definitions
```

**Key patterns:**
- UI components use a variants pattern for flexible styling
- `@/*` path alias maps to `./src/`
- React Router v6 with outlet-based layouts

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

## API Endpoints

- `GET /health` - Health check
- `POST /api/auth/register` - Registration
- `POST /api/auth/login` - Login (returns JWT)
- `GET /api/auth/me` - Current user (authenticated)
- `GET /api/users` - List users (admin only)
- `GET/PATCH/DELETE /api/users/:id` - User CRUD

Interactive docs at `/api-docs` when server running.

## Environment Setup

Copy `.env.example` to `.env` in each project:

**Frontend:** `VITE_API_URL=http://localhost:3001/api`

**Backend:** `DATABASE_URL`, `JWT_SECRET` (min 32 chars), `JWT_EXPIRES_IN`, `CORS_ORIGIN`

## Code Quality

- TypeScript strict mode with no implicit `any`
- ESLint with zero warnings policy in both projects
- Prettier with single quotes, trailing commas, Tailwind plugin
