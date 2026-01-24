# Error Handling Reference

## Contents
- AppError Class
- Centralized Error Handler
- Zod Validation Errors
- Prisma Error Mapping
- Version Conflict Errors
- Response Helpers

## AppError Class

Custom error class for application errors:

```typescript
// src/middleware/errorHandler.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public errors?: Record<string, string[]>,
    public errorId?: ErrorId
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// Usage in services
throw new AppError('Account not found', 404)
throw new AppError('Invalid status transition', 400)
throw new AppError('Email already registered', 409)

// With structured errors
throw new AppError('Validation failed', 400, {
  email: ['Invalid format'],
  password: ['Too short', 'Needs uppercase']
})

// With error ID for monitoring
throw new AppError('Account not found', 404, undefined, ERROR_IDS.TXN_ACCOUNT_NOT_FOUND)
```

## Centralized Error Handler

All errors flow through the error handler middleware:

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
        userId: req.user?.id
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
      if (!errors[path]) errors[path] = []
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

  // Unknown errors - log and return generic message
  console.error('Unhandled error:', {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    method: req.method,
    url: req.originalUrl
  })

  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  sendError(res, message, 500)
}
```

## Zod Validation Errors

Zod errors are automatically converted to structured format:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["Invalid email address"],
    "password": ["Password must be at least 8 characters"]
  }
}
```

## Version Conflict Errors

For optimistic locking conflicts:

```typescript
// src/services/transactionService.ts
export class VersionConflictError extends AppError {
  public conflictMetadata: ConflictMetadata
  public currentTransaction: TransactionInfo

  constructor(message: string, conflictMetadata: ConflictMetadata, currentTransaction: TransactionInfo) {
    super(message, 409, undefined, ERROR_IDS.TXN_VERSION_CONFLICT)
    this.name = 'VersionConflictError'
    this.conflictMetadata = conflictMetadata
    this.currentTransaction = currentTransaction
  }
}

// Controller handles specially
if (error instanceof VersionConflictError) {
  res.status(409).json({
    success: false,
    message: error.message,
    conflict: {
      currentVersion: error.conflictMetadata.currentVersion,
      lastModifiedById: error.conflictMetadata.lastModifiedById,
      lastModifiedAt: error.conflictMetadata.lastModifiedAt
    },
    currentTransaction: error.currentTransaction
  })
  return
}
```

## Response Helpers

Consistent response formatting:

```typescript
// src/utils/response.ts
export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
    message
  })
}

export function sendError(res: Response, message: string, statusCode = 400, errors?: Record<string, string[]>): void {
  res.status(statusCode).json({
    success: false,
    message,
    errors
  })
}
```

### Response Formats

**Success:**
```json
{
  "success": true,
  "data": { "transaction": { ... } },
  "message": "Transaction created successfully"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Account not found",
  "errors": null
}
```

**Partial Success (207):**
```json
{
  "success": true,
  "data": {
    "successful": [{ "transactionId": "...", "status": "CLEARED" }],
    "failed": [{ "transactionId": "...", "error": "Already reconciled" }]
  },
  "message": "Bulk operation completed with 5 successes and 1 failure"
}
```

## Anti-Patterns

### WARNING: Returning Errors Directly

**The Problem:**

```typescript
// BAD - Inconsistent error responses
export const get: RequestHandler = async (req, res) => {
  const item = await prisma.item.findFirst({ where: { id: req.params.id } })
  if (!item) {
    return res.status(404).json({ error: 'Not found' })  // Different format!
  }
}
```

**Why This Breaks:**
- Inconsistent response format (sometimes `error`, sometimes `message`)
- Clients can't rely on response structure
- Bypasses logging and monitoring

**The Fix:**

```typescript
// GOOD - Throw AppError, let handler format response
export const get: RequestHandler = async (req, res, next) => {
  try {
    const item = await prisma.item.findFirst({ where: { id: req.params.id } })
    if (!item) throw new AppError('Not found', 404)
    sendSuccess(res, { item })
  } catch (error) {
    next(error)
  }
}
```

### WARNING: Leaking Stack Traces

**The Problem:**

```typescript
// BAD - Exposing internals
catch (error) {
  res.status(500).json({ error: error.stack })  // Security risk!
}
```

**Why This Breaks:**
- Exposes internal paths, database structure, library versions
- Helps attackers understand your system

**The Fix:**

```typescript
// Already handled by errorHandler.ts
const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message