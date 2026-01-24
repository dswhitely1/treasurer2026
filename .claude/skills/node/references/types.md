# Node.js Types Reference

## Contents
- Express Type Augmentation
- API Response Types
- JWT Payload Types
- Common Type Patterns
- Generic Type Utilities

---

## Express Type Augmentation

Extend Express Request interface to include custom properties like authenticated user.

```typescript
// src/types/express.d.ts
import { User } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, 'id' | 'email' | 'role'>
    }
  }
}

export {}  // Required for module augmentation
```

**Why:** TypeScript needs this augmentation to recognize `req.user` without type errors.

---

## API Response Types

Standardized response shapes for consistent API contracts.

```typescript
// src/types/index.ts
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T | undefined
  message?: string | undefined
  errors?: Record<string, string[]> | undefined
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

### Usage in Controllers

```typescript
// src/utils/response.ts - Type-safe response helpers
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
  } satisfies ApiResponse<T>)
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: Record<string, string[]>
): void {
  res.status(statusCode).json({
    success: false,
    message,
    errors,
  } satisfies ApiResponse)
}
```

---

## JWT Payload Types

```typescript
// src/types/index.ts
export interface JwtPayload {
  userId: string
  email: string
  role: string
}

// Usage in auth middleware
const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload
req.user = {
  id: decoded.userId,
  email: decoded.email,
  role: decoded.role as 'USER' | 'ADMIN',
}
```

---

## Organization Role Types

```typescript
export type OrganizationRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface OrganizationSummary {
  id: string
  name: string
  role: OrganizationRole
}

export interface OrganizationMemberInfo {
  id: string
  userId: string
  email: string
  name: string | null
  role: OrganizationRole
  joinedAt: string  // ISO date string
}
```

---

## Common Type Patterns

### Pick for Selective Fields

```typescript
// Select only needed User fields
type AuthenticatedUser = Pick<User, 'id' | 'email' | 'role'>

// In express.d.ts
interface Request {
  user?: Pick<User, 'id' | 'email' | 'role'>
}
```

### Satisfies for Type Checking

```typescript
// Ensure object matches type without widening
const response = {
  success: true,
  data: users,
} satisfies ApiResponse<User[]>
```

### Branded Types for IDs

```typescript
// Prevent ID type mixing
type UserId = string & { readonly __brand: 'UserId' }
type AccountId = string & { readonly __brand: 'AccountId' }

// Usage prevents accidentally passing wrong ID type
function getAccount(accountId: AccountId): Promise<Account>
```

---

## WARNING: Avoid `any` Type

**The Problem:**

```typescript
// BAD - Defeats TypeScript's purpose
const data: any = req.body
const user = data.user  // No type checking
```

**The Fix:**

```typescript
// GOOD - Validate with Zod, get proper types
const validated = userSchema.parse(req.body)
const user = validated.user  // Fully typed
```

See the **zod** skill for validation patterns.