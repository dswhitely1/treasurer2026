---
name: typescript
description: |
  Enforces TypeScript strict mode with type safety across frontend and backend.
  Use when: writing any TypeScript code, defining types/interfaces, handling type errors, configuring tsconfig, or ensuring type safety at system boundaries.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# TypeScript Skill

This project enforces TypeScript strict mode (`strict: true`, `noUncheckedIndexedAccess: true`) across both frontend (React/Vite) and backend (Express/Prisma). Type safety is maintained end-to-end: Zod schemas validate runtime data at API boundaries, Prisma generates database types, and Redux Toolkit provides typed state management. No `any` types are permitted in production code.

## Quick Start

### Strict Configuration

Both packages use strict TypeScript with `noUncheckedIndexedAccess`:

```typescript
// tsconfig.json (both packages)
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Type-Safe API Responses

```typescript
// treasurer-api/src/types/api.ts
interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string>
}

// Usage in controller
res.json({ success: true, data: transaction } satisfies ApiResponse<Transaction>)
```

### Path Aliases

Both packages use `@/*` mapping to `./src/*`:

```typescript
import { Button } from '@/components/ui/Button'
import { authService } from '@/services/authService.js' // .js extension required in backend
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| Strict mode | Catches null/undefined errors | `strict: true` in tsconfig |
| Zod inference | Runtime validation → static types | `type User = z.infer<typeof userSchema>` |
| Prisma types | Generated from schema | `import type { Transaction } from '@prisma/client'` |
| Satisfies operator | Type checking without widening | `config satisfies Config` |
| Const assertions | Narrow literal types | `as const` for enums/configs |

## Common Patterns

### Discriminated Unions for State

**When:** Managing component states (loading, error, success)

```typescript
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: T }

function TransactionList({ state }: { state: AsyncState<Transaction[]> }) {
  if (state.status === 'loading') return <Spinner />
  if (state.status === 'error') return <Error message={state.error} />
  if (state.status === 'success') return <List items={state.data} />
  return null
}
```

### Type Guards

**When:** Narrowing union types safely

```typescript
function isApiError(error: unknown): error is { message: string; statusCode: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'statusCode' in error
  )
}
```

## See Also

- [patterns](references/patterns.md)
- [types](references/types.md)
- [modules](references/modules.md)
- [errors](references/errors.md)

## Related Skills

- **zod** - Runtime validation that generates TypeScript types
- **prisma** - Type-safe database access with generated types
- **express** - Backend patterns with typed request/response
- **react** - Frontend component typing patterns
- **redux** - Typed state management with RTK

## Documentation Resources

> Fetch latest TypeScript documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "typescript"
2. **Prefer website documentation** (IDs starting with `/websites/`) over source code repositories
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/websites/typescriptlang.org` _(resolve using mcp__context7__resolve-library-id)_

**Recommended Queries:**
- "Utility types Pick Omit Partial"
- "Type inference from const"
- "Strict null checks configuration"