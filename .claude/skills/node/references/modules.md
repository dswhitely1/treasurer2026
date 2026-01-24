# Node.js Modules Reference

## Contents
- ESM Import/Export
- Path Aliases
- Built-in Modules
- External Dependencies
- Module Resolution

---

## ESM Import/Export Patterns

### Named Exports (Preferred)

```typescript
// src/services/authService.ts
export async function registerUser(input: RegisterInput) { ... }
export async function loginUser(input: LoginInput) { ... }
export async function getCurrentUserWithOrgs(userId: string) { ... }

// Import
import { registerUser, loginUser } from '@/services/authService.js'
```

### Default Exports (Routers)

```typescript
// src/routes/organizations.ts
const router = Router()
// ... routes
export default router

// Import
import organizationRouter from './routes/organizations.js'
```

---

## Path Aliases Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Usage

```typescript
// Instead of relative paths
import { prisma } from '../../../config/database.js'

// Use alias
import { prisma } from '@/config/database.js'
```

**Note:** `tsx` handles path resolution automatically in development. For production builds, configure your bundler or use `tsconfig-paths`.

---

## Built-in Node.js Modules Used

| Module | Usage | Example |
|--------|-------|---------|
| `process` | Env vars, signals, exit | `process.env`, `process.exit(1)` |
| `globalThis` | Singleton storage | Database client singleton |
| `Date` | Timestamps | `new Date().toISOString()` |

### Process Module Patterns

```typescript
// Environment access (via validated env)
import { env } from '@/config/env.js'

// Process signals
process.on('SIGTERM', handler)
process.on('SIGINT', handler)

// Exit codes
process.exit(0)  // Success
process.exit(1)  // Failure

// Runtime info
process.version      // Node version
process.uptime()     // Seconds running
process.memoryUsage() // Memory stats
```

---

## External Dependencies

### Core Runtime Dependencies

| Package | Purpose | Pattern |
|---------|---------|---------|
| `express` | HTTP server | Factory pattern, see **express** skill |
| `@prisma/client` | Database ORM | Singleton, see **prisma** skill |
| `zod` | Validation | Schema parsing, see **zod** skill |
| `dotenv` | Env loading | Single `dotenv.config()` call |
| `jsonwebtoken` | Auth tokens | JWT sign/verify |
| `bcryptjs` | Password hashing | `hash()`, `compare()` |
| `pino` | Structured logging | Logger singleton |

### Security Dependencies

| Package | Purpose | Usage |
|---------|---------|-------|
| `helmet` | Security headers | `app.use(helmet())` |
| `cors` | CORS handling | `app.use(cors({ origin }))` |
| `express-rate-limit` | Rate limiting | Per-route or global |

---

## Module Organization Pattern

```
src/
├── config/         # Environment, database, OpenAPI
│   ├── env.ts      # Validated environment
│   ├── database.ts # Prisma singleton
│   └── openapi.ts  # API spec
├── middleware/     # Express middleware
├── routes/         # Route definitions
├── controllers/    # Request handlers
├── services/       # Business logic
├── schemas/        # Zod schemas
├── types/          # TypeScript types
└── utils/          # Shared utilities
```

### Import Order Convention

```typescript
// 1. Node built-ins (if any)
import { readFile } from 'node:fs/promises'

// 2. External packages
import express from 'express'
import { z } from 'zod'

// 3. Internal absolute imports
import { prisma } from '@/config/database.js'
import { AppError } from '@/middleware/errorHandler.js'

// 4. Types
import type { Request, Response } from 'express'
import type { User } from '@prisma/client'
```

---

## WARNING: Circular Dependencies

**The Problem:**

```typescript
// middleware/auth.ts
import { userService } from '@/services/userService.js'

// services/userService.ts
import { authenticate } from '@/middleware/auth.js'  // Circular!
```

**The Fix:**

Structure dependencies to flow one direction: routes → controllers → services → database