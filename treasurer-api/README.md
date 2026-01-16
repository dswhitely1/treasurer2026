# Treasurer API

A production-ready Node.js REST API built with Express, TypeScript, Prisma, and JWT authentication.

## Features

- **Express** with TypeScript for type-safe API development
- **Prisma ORM** for database management (PostgreSQL)
- **JWT Authentication** with role-based access control
- **Zod** for runtime request validation
- **OpenAPI/Swagger** documentation at `/api-docs`
- **Vitest** for unit and integration testing
- **ESLint** with strict TypeScript rules

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm
- PostgreSQL database

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment file and configure
cp .env.example .env

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) | - |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm test` | Run tests |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | TypeScript type checking |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Prisma Studio |

## API Endpoints

### Health
- `GET /health` - Health check

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires auth)

### Users
- `GET /api/users` - List users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

## Project Structure

```
treasurer-api/
├── src/
│   ├── config/          # Configuration (env, database, openapi)
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Express middleware
│   ├── routes/          # Route definitions
│   ├── schemas/         # Zod validation schemas
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── app.ts           # Express app setup
│   └── index.ts         # Entry point
├── prisma/
│   └── schema.prisma    # Database schema
├── tests/               # Test files
└── package.json
```

## API Documentation

Interactive API documentation is available at `/api-docs` when the server is running.
