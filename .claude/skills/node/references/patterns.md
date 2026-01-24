# Node.js Patterns Reference

## Contents
- ESM Module Configuration
- Graceful Shutdown Pattern
- Environment Validation
- Singleton Database Client
- Process Signal Handling
- Async Entry Point

---

## ESM Module Configuration

This project uses ES modules. The `package.json` includes `"type": "module"`.

### DO: Use .js Extension in Imports

```typescript
// GOOD - Always use .js extension for local imports
import { env } from '../config/env.js'
import { prisma } from '@/config/database.js'
import { AppError } from './errorHandler.js'
```

### DON'T: Omit File Extensions

```typescript
// BAD - Will fail at runtime with ESM
import { env } from '../config/env'
import { prisma } from '@/config/database'
```

**Why:** Node.js ESM requires explicit file extensions. TypeScript compiles `.ts` to `.js`, so imports must reference the output extension.

---

## Graceful Shutdown Pattern

Handle process termination properly to prevent data corruption and connection leaks.

### DO: Clean Up Resources on Shutdown

```typescript
// src/index.ts
process.on('SIGINT', () => {
  void (async () => {
    logger.info('Received SIGINT, shutting down gracefully')
    await prisma.$disconnect()
    logger.info('Database disconnected')
    process.exit(0)
  })()
})

process.on('SIGTERM', () => {
  void (async () => {
    logger.info('Received SIGTERM, shutting down gracefully')
    await prisma.$disconnect()
    process.exit(0)
  })()
})
```

### DON'T: Exit Without Cleanup

```typescript
// BAD - Database connections left dangling
process.on('SIGTERM', () => {
  process.exit(0)
})
```

**Why:** Kubernetes sends SIGTERM during pod termination. Without cleanup, database connections remain open, causing connection pool exhaustion.

---

## Environment Validation

Validate environment variables at startup using Zod. See the **zod** skill for schema details.

### DO: Fail Fast on Invalid Config

```typescript
// src/config/env.ts
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)  // Exit immediately
}

export const env = parsed.data
```

### DON'T: Access process.env Directly

```typescript
// BAD - No type safety, no validation
const port = process.env.PORT || 3000
const secret = process.env.JWT_SECRET  // Could be undefined!
```

**Why:** Direct `process.env` access has no type safety. Missing required variables cause runtime errors instead of startup failures.

---

## Singleton Database Client

Prevent hot reload from creating multiple Prisma instances. See the **prisma** skill for full patterns.

```typescript
// src/config/database.ts
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

---

## Async Entry Point Pattern

### DO: Use Async Main with Void

```typescript
// src/index.ts
async function main(): Promise<void> {
  try {
    await prisma.$connect()
    logger.info('Database connected successfully')
    
    app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`)
    })
  } catch (error) {
    logger.error({ error }, 'Failed to start server')
    process.exit(1)
  }
}

void main()  // void prevents unhandled promise rejection warnings
```

### DON'T: Use Top-Level Await in Entry Files

```typescript
// BAD - Can cause issues with some tooling
await prisma.$connect()
app.listen(env.PORT)
```

---

## Process Memory Monitoring

```typescript
// Health check endpoint pattern
const memory = process.memoryUsage()
const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100

if (memoryUsagePercent > 90) {
  sendError(res, 'Service not ready - high memory usage', 503)
  return
}
```

---

## Package.json Engine Enforcement

```json
{
  "engines": {
    "node": ">=20.0.0"
  },
  "packageManager": "pnpm@10.28.0"
}
```

Use with `engine-strict=true` in `.npmrc` to enforce version requirements.