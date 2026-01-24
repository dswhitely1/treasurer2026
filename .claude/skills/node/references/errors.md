# Node.js Error Handling Reference

## Contents
- AppError Class Pattern
- Centralized Error Handler
- Process-Level Error Handling
- Prisma Error Mapping
- Zod Validation Errors

---

## AppError Class Pattern

Custom error class for throwing application-specific errors with HTTP status codes.

```typescript
// src/middleware/errorHandler.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public errors?: Record<string, string[]>,
    public errorId?: ErrorId,
  ) {
    super(message)
    this.name = 'AppError'
  }
}
```

### Usage in Services

```typescript
// src/services/authService.ts
if (existingUser) {
  throw new AppError('Email already registered', 409)
}

if (!isValidPassword) {
  throw new AppError('Invalid credentials', 401)
}

// With field-level errors
throw new AppError('Validation failed', 400, {
  email: ['Email format is invalid'],
  password: ['Password must be at least 8 characters'],
})
```

---

## Centralized Error Handler

Express error middleware that handles all error types uniformly.

```typescript
// src/middleware/errorHandler.ts
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Application errors
  if (err instanceof AppError) {
    if (err.errorId) {
      console.error(`[${err.errorId}] ${err.message}`, {
        errorId: err.errorId,
        statusCode: err.statusCode,
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id,
      })
    }
    sendError(res, err.message, err.statusCode, err.errors)
    return
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {}
    for (const issue of err.issues) {
      const path = issue.path.join('.')
      errors[path] = errors[path] ?? []
      errors[path].push(issue.message)
    }
    sendError(res, 'Validation failed', 400, errors)
    return
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      sendError(res, 'A record with this value already exists', 409)
      return
    }
    if (err.code === 'P2025') {
      sendError(res, 'Record not found', 404)
      return
    }
  }

  // Unknown errors - hide details in production
  console.error('Unhandled error:', { ... })
  const message = env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message
  sendError(res, message, 500)
}
```

---

## Process-Level Error Handling

### Uncaught Exceptions and Rejections

```typescript
// Optional: Add to src/index.ts for production
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception - shutting down')
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection')
  // Don't exit - let the app continue
})
```

### Startup Error Handling

```typescript
async function main(): Promise<void> {
  try {
    await prisma.$connect()
    logger.info('Database connected successfully')
    
    app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`)
    })
  } catch (error) {
    logger.error({ error }, 'Failed to start server')
    process.exit(1)  // Exit on startup failure
  }
}
```

---

## WARNING: Silent Error Swallowing

**The Problem:**

```typescript
// BAD - Errors disappear
try {
  await riskyOperation()
} catch {
  // Nothing happens
}
```

**Why This Breaks:**
1. Bugs go undetected
2. Data corruption can occur silently
3. Debugging becomes impossible

**The Fix:**

```typescript
// GOOD - Log and handle appropriately
try {
  await riskyOperation()
} catch (error) {
  logger.error({ error }, 'Operation failed')
  throw new AppError('Operation failed', 500)
}
```

---

## Common HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 400 | Bad Request | Invalid input, validation failure |
| 401 | Unauthorized | Missing/invalid authentication |
| 403 | Forbidden | Valid auth, insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry, version conflict |
| 422 | Unprocessable | Valid syntax, semantic errors |
| 500 | Server Error | Unexpected failures |
| 503 | Unavailable | DB down, overloaded |

---

## Error ID Pattern for Tracking

```typescript
// src/constants/errorIds.ts
export type ErrorId = 
  | 'AUTH_001'  // Invalid credentials
  | 'AUTH_002'  // Token expired
  | 'TXN_001'   // Invalid status transition
  | 'TXN_002'   // Transaction locked

// Usage
throw new AppError('Invalid status transition', 400, undefined, 'TXN_001')
```

Enables searching logs for specific error patterns and integration with error tracking services (Sentry, DataDog).