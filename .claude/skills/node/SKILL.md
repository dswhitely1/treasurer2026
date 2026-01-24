---
name: node
description: |
  Configures Node.js 20.x runtime environment and backend server setup.
  Use when: Setting up Node.js server, configuring ESM modules, managing environment variables, handling process signals, or configuring TypeScript for Node.js.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Node Skill

This project runs Node.js 20.x with ES modules (`"type": "module"`), TypeScript strict mode, and uses `tsx` for development hot reload. The backend follows the Express factory pattern with proper graceful shutdown handling.

## Quick Start

### Environment Configuration

```typescript
// src/config/env.ts - Zod-validated environment
import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
```

### Server Entry Point

```typescript
// src/index.ts - Main entry with graceful shutdown
import { createApp } from './app.js'
import { prisma } from './config/database.js'

const app = createApp()

async function main(): Promise<void> {
  await prisma.$connect()
  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`)
  })
}

process.on('SIGTERM', () => {
  void prisma.$disconnect().then(() => process.exit(0))
})

void main()
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| ESM imports | Always use `.js` extension | `import { env } from './config/env.js'` |
| Path alias | `@/*` maps to `./src/*` | `import { prisma } from '@/config/database.js'` |
| Engines field | Enforces Node version | `"engines": { "node": ">=20.0.0" }` |
| Graceful shutdown | Handle SIGTERM/SIGINT | `process.on('SIGTERM', ...)` |

## Common Patterns

### Singleton Pattern for Database

**When:** Prevent multiple Prisma client instances in development

```typescript
// src/config/database.ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

### Factory Pattern for Express App

**When:** Enable testable app creation without side effects

```typescript
// src/app.ts
export function createApp(): Express {
  const app = express()
  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN }))
  app.use(express.json())
  // Routes...
  app.use(errorHandler)
  return app
}
```

## See Also

- [patterns](references/patterns.md)
- [types](references/types.md)
- [modules](references/modules.md)
- [errors](references/errors.md)

## Related Skills

- See the **express** skill for API routing and middleware patterns
- See the **typescript** skill for strict mode configuration
- See the **prisma** skill for database access patterns
- See the **zod** skill for runtime validation

## Documentation Resources

> Fetch latest Node.js documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "node"
2. **Prefer website documentation** (IDs starting with `/websites/`) over source code repositories
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/websites/nodejs_latest-v20_x` _(Node.js v20.x documentation)_

**Recommended Queries:**
- "ESM modules import export"
- "process signals SIGTERM SIGINT"
- "environment variables dotenv"
- "stream API pipeline"