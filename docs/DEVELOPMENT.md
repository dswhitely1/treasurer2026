# Treasurer Development Guide

**Version:** 0.1.0
**Last Updated:** 2026-01-17

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Getting Started](#getting-started)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Running Tests](#running-tests)
6. [Code Style](#code-style)
7. [Debugging](#debugging)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)
10. [Contributing](#contributing)

---

## Prerequisites

### Required Software

- **Node.js**: >= 20.0.0 (LTS recommended)
- **pnpm**: 10.28.0 or higher
- **Docker**: Latest stable (for Docker development)
- **Docker Compose**: v2.0+ (usually bundled with Docker)
- **Git**: Latest stable
- **PostgreSQL**: 16+ (if running locally without Docker)

### Recommended Tools

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Prisma
  - TypeScript
  - Tailwind CSS IntelliSense
- **Postman** or **Insomnia** for API testing
- **Prisma Studio** for database visualization

### Installing pnpm

```bash
# Via npm
npm install -g pnpm@10.28.0

# Via Homebrew (macOS)
brew install pnpm

# Verify installation
pnpm --version
```

---

## Getting Started

### Option 1: Docker Development (Recommended)

**Fastest way to get started with zero configuration:**

```bash
# Clone repository
git clone <repository-url>
cd treasurer2026

# Start all services (postgres, api, client)
docker compose up --build

# Services will be available at:
# - Frontend: http://localhost:3000
# - API: http://localhost:3001
# - API Docs: http://localhost:3001/api-docs
# - PostgreSQL: localhost:5432
```

**Features:**
- Hot reload enabled for both frontend and backend
- Database automatically initialized
- No need to install dependencies locally
- Consistent environment across team

**Useful Commands:**

```bash
# Run in background
docker compose up -d --build

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f api
docker compose logs -f client

# Stop services
docker compose down

# Stop and remove database (fresh start)
docker compose down -v

# Restart specific service
docker compose restart api
```

### Option 2: Local Development

**For development without Docker:**

#### 1. Install Dependencies

```bash
# Install backend dependencies
cd treasurer-api
pnpm install

# Install frontend dependencies
cd ../treasurer
pnpm install
```

#### 2. Setup Database

```bash
# Start PostgreSQL (via Docker)
docker run --name treasurer-postgres \
  -e POSTGRES_USER=treasurer \
  -e POSTGRES_PASSWORD=treasurer \
  -e POSTGRES_DB=treasurer_db \
  -p 5432:5432 \
  -d postgres:16-alpine

# Or install PostgreSQL locally and create database
createdb treasurer_db
```

#### 3. Configure Environment

**Backend (`treasurer-api/.env`):**

```env
DATABASE_URL="postgresql://treasurer:treasurer@localhost:5432/treasurer_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-min-32-characters-long"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:3000"
PORT=3001
NODE_ENV="development"
```

**Frontend (`treasurer/.env`):**

```env
VITE_API_URL="http://localhost:3001/api"
VITE_APP_TITLE="Treasurer"
```

#### 4. Run Database Migrations

```bash
cd treasurer-api
pnpm db:generate  # Generate Prisma client
pnpm db:migrate   # Run migrations
```

#### 5. Start Development Servers

```bash
# Terminal 1: Backend
cd treasurer-api
pnpm dev

# Terminal 2: Frontend
cd treasurer
pnpm dev
```

---

## Project Structure

```
treasurer2026/
├── treasurer/              # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── ui/       # Base UI primitives (Button, Card, etc.)
│   │   │   └── layout/   # Layout components (Header, Footer)
│   │   ├── features/     # Feature modules
│   │   │   └── status/  # Transaction status feature
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities and helpers
│   │   ├── pages/        # Route page components
│   │   ├── store/        # Redux store and slices
│   │   │   └── features/ # Redux slice modules
│   │   └── types/        # TypeScript type definitions
│   ├── tests/            # Test files
│   ├── public/           # Static assets
│   ├── package.json
│   ├── vite.config.ts    # Vite configuration
│   ├── tsconfig.json     # TypeScript configuration
│   └── tailwind.config.js
│
├── treasurer-api/         # Backend Express API
│   ├── src/
│   │   ├── config/       # Configuration (env, DB, OpenAPI)
│   │   ├── controllers/  # HTTP request handlers
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # Route definitions
│   │   ├── schemas/      # Zod validation schemas
│   │   ├── services/     # Business logic layer
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # Utility functions
│   ├── prisma/          # Database schema and migrations
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── tests/           # Test files
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                 # Documentation
├── docker-compose.yml    # Docker development environment
└── CLAUDE.md            # Project instructions for Claude AI
```

---

## Development Workflow

### Daily Development

**1. Pull Latest Changes**

```bash
git pull origin main
cd treasurer-api && pnpm install
cd ../treasurer && pnpm install
```

**2. Check Database Status**

```bash
cd treasurer-api
pnpm db:generate   # Regenerate if schema changed
pnpm db:migrate    # Apply new migrations
```

**3. Start Development**

```bash
# Docker
docker compose up

# Local
# Terminal 1: API
cd treasurer-api && pnpm dev

# Terminal 2: Frontend
cd treasurer && pnpm dev
```

**4. Make Changes**

- Edit code files
- Save files (hot reload automatically updates)
- Check browser/console for updates

**5. Run Tests**

```bash
# Backend tests
cd treasurer-api && pnpm test

# Frontend tests
cd treasurer && pnpm test

# Watch mode (automatically re-run on changes)
pnpm test -- --watch
```

**6. Lint and Format**

```bash
# Backend
cd treasurer-api
pnpm lint          # Check for issues
pnpm lint:fix      # Auto-fix issues

# Frontend
cd treasurer
pnpm lint
pnpm lint:fix
pnpm format        # Run Prettier
```

**7. Commit Changes**

```bash
git add .
git commit -m "feat: add transaction filtering"
git push origin feature-branch
```

### Creating a New Feature

**1. Create Feature Branch**

```bash
git checkout -b feature/transaction-categories
```

**2. Backend Development**

```bash
cd treasurer-api

# Create schema (if needed)
# Edit prisma/schema.prisma
pnpm db:migrate dev --name add-categories

# Create service
touch src/services/categoryService.ts

# Create controller
touch src/controllers/categoryController.ts

# Create routes
touch src/routes/categories.ts

# Add validation schemas
touch src/schemas/category.ts

# Write tests
touch src/tests/categoryService.test.ts

# Run tests
pnpm test
```

**3. Frontend Development**

```bash
cd treasurer

# Create Redux slice (if needed)
touch src/store/features/categorySlice.ts

# Create page component
touch src/pages/CategoriesPage.tsx

# Create feature components
mkdir src/features/categories
touch src/features/categories/CategoryList.tsx
touch src/features/categories/CategoryForm.tsx

# Add route
# Edit src/App.tsx

# Write tests
touch src/store/features/__tests__/categorySlice.test.ts

# Run tests
pnpm test
```

**4. Test Integration**

```bash
# Start both servers
docker compose up

# Test in browser
# http://localhost:3000

# Test API directly
curl http://localhost:3001/api/categories
```

**5. Create Pull Request**

```bash
git add .
git commit -m "feat: add category management"
git push origin feature/transaction-categories

# Create PR on GitHub/GitLab
```

---

## Running Tests

### Backend Tests (Vitest)

```bash
cd treasurer-api

# Run all tests
pnpm test

# Run in watch mode
pnpm test -- --watch

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test -- src/services/transactionStatusService.test.ts

# Run tests matching pattern
pnpm test -- --grep "status transition"
```

**Test Structure:**

```typescript
// treasurer-api/src/tests/example.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  })

  afterEach(() => {
    // Cleanup after each test
  })

  it('should do something', () => {
    expect(result).toBe(expected)
  })
})
```

### Frontend Tests (Vitest + Testing Library)

```bash
cd treasurer

# Run all tests
pnpm test

# Run in watch mode
pnpm test -- --watch

# Run with coverage
pnpm test:coverage

# Run tests with UI
pnpm test:ui

# Run specific test
pnpm test -- src/store/features/__tests__/statusSlice.test.ts
```

**Test Structure:**

```typescript
// treasurer/src/components/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from '../ui/Button'

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

### Running Single Test

```bash
# Backend
cd treasurer-api
pnpm test -- path/to/test.test.ts

# Frontend
cd treasurer
pnpm test -- path/to/test.test.ts
```

---

## Code Style

### TypeScript

**Rules:**
- Strict mode enabled
- No `any` types (use `unknown` if necessary)
- Explicit return types for functions
- Use interfaces for object shapes
- Use type aliases for unions/complex types

**Example:**

```typescript
// ❌ Bad
function processData(data: any) {
  return data.map(item => item.value)
}

// ✅ Good
interface DataItem {
  id: string
  value: number
}

function processData(data: DataItem[]): number[] {
  return data.map((item) => item.value)
}
```

### ESLint

**Configuration:**
- Zero warnings policy
- Auto-fix on save (recommended)

```bash
# Check linting
pnpm lint

# Fix automatically
pnpm lint:fix
```

### Prettier

**Configuration:**
- Single quotes
- Trailing commas
- 2-space indentation
- Tailwind CSS class sorting

```bash
# Format code
pnpm format

# Check formatting
pnpm format:check
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, etc.

**Examples:**

```
feat(status): add bulk transaction reconciliation
fix(auth): prevent token expiration edge case
docs(api): update transaction endpoint examples
test(status): add state machine transition tests
```

---

## Debugging

### Backend Debugging

**VS Code Launch Configuration:**

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev"],
      "cwd": "${workspaceFolder}/treasurer-api",
      "console": "integratedTerminal"
    }
  ]
}
```

**Console Logging:**

```typescript
console.log('Debug value:', value)
console.error('Error occurred:', error)
```

**Prisma Query Logging:**

```typescript
// config/database.ts
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],  // Log all queries
})
```

### Frontend Debugging

**React DevTools:**
- Install browser extension
- Inspect component tree
- View props and state

**Redux DevTools:**
- Install browser extension
- Inspect Redux state
- Time-travel debugging

**Console Logging:**

```typescript
console.log('Component rendered with props:', props)
console.log('Redux state:', useSelector(state => state))
```

**Debugging RTK Query:**

```typescript
// Check query status
const { data, error, isLoading } = useGetTransactionsQuery(args)
console.log('Query state:', { data, error, isLoading })
```

---

## Common Tasks

### Adding a Database Migration

```bash
cd treasurer-api

# Edit prisma/schema.prisma
# Add new field or model

# Create migration
pnpm db:migrate dev --name add-transaction-fee

# Apply migration
# (automatically applied in dev mode)

# Regenerate Prisma client
pnpm db:generate
```

### Adding a New API Endpoint

**1. Create Schema (validation)**

```typescript
// src/schemas/example.ts
import { z } from 'zod'

export const createExampleSchema = z.object({
  name: z.string().min(1),
  value: z.number().positive(),
})

export type CreateExampleDto = z.infer<typeof createExampleSchema>
```

**2. Create Service (business logic)**

```typescript
// src/services/exampleService.ts
import { prisma } from '../config/database.js'
import { AppError } from '../middleware/errorHandler.js'

export async function createExample(data: CreateExampleDto) {
  const example = await prisma.example.create({ data })
  return example
}
```

**3. Create Controller (HTTP handler)**

```typescript
// src/controllers/exampleController.ts
import type { RequestHandler } from 'express'
import { createExample } from '../services/exampleService.js'
import { sendSuccess } from '../utils/response.js'

export const create: RequestHandler = async (req, res, next) => {
  try {
    const result = await createExample(req.body)
    sendSuccess(res, result, 'Example created', 201)
  } catch (error) {
    next(error)
  }
}
```

**4. Create Route**

```typescript
// src/routes/examples.ts
import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { createExampleSchema } from '../schemas/example.js'
import * as controller from '../controllers/exampleController.js'

const router = Router()

router.post(
  '/',
  authenticate,
  validate({ body: createExampleSchema }),
  controller.create
)

export default router
```

**5. Register Route**

```typescript
// src/index.ts
import exampleRoutes from './routes/examples.js'

app.use('/api/examples', exampleRoutes)
```

### Adding a React Component

```typescript
// src/components/ui/Alert.tsx
import { cva, type VariantProps } from 'class-variance-authority'

const alertVariants = cva(
  'rounded-md p-4 border',
  {
    variants: {
      variant: {
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        success: 'bg-green-50 border-green-200 text-green-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        error: 'bg-red-50 border-red-200 text-red-800',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
)

export interface AlertProps extends VariantProps<typeof alertVariants> {
  children: React.ReactNode
}

export function Alert({ variant, children }: AlertProps) {
  return (
    <div className={alertVariants({ variant })}>
      {children}
    </div>
  )
}
```

### Adding a Redux Slice

```typescript
// src/store/features/exampleSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index'

interface ExampleState {
  items: string[]
  isLoading: boolean
}

const initialState: ExampleState = {
  items: [],
  isLoading: false,
}

const exampleSlice = createSlice({
  name: 'example',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<string>) => {
      state.items.push(action.payload)
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
  },
})

export const { addItem, setLoading } = exampleSlice.actions
export const selectItems = (state: RootState) => state.example.items
export default exampleSlice.reducer
```

---

## Troubleshooting

### Common Issues

**1. "Cannot find module" errors**

```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install

# Regenerate Prisma client
cd treasurer-api
pnpm db:generate
```

**2. Port already in use**

```bash
# Find and kill process using port 3001
lsof -ti:3001 | xargs kill -9

# Or use different port
PORT=3002 pnpm dev
```

**3. Database connection errors**

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
docker restart treasurer-postgres

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

**4. Migration conflicts**

```bash
# Reset database (WARNING: deletes all data)
cd treasurer-api
pnpm db:push --force-reset

# Or create new migration
pnpm db:migrate dev --name fix-conflict
```

**5. Hot reload not working**

```bash
# Docker: Check volume mounts
docker compose down
docker compose up --build

# Local: Restart dev server
# Kill process and restart
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines.

**Quick Checklist:**

- [ ] Create feature branch from `main`
- [ ] Write tests for new features
- [ ] Ensure all tests pass (`pnpm test`)
- [ ] Lint code (`pnpm lint`)
- [ ] Format code (`pnpm format`)
- [ ] Update documentation if needed
- [ ] Create pull request with clear description
- [ ] Request review from team member

---

## Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Vite Documentation](https://vitejs.dev/)

---

**Document Metadata:**
- **Version:** 0.1.0
- **Last Updated:** 2026-01-17
- **Maintainers:** Development Team
