# TypeScript Modules Reference

## Contents
- ESM Configuration
- Import Patterns
- Path Aliases
- Type-Only Imports
- Module Augmentation

---

## ESM Configuration

### Backend ESM Setup

The backend uses ES modules with explicit `.js` extensions:

```json
// treasurer-api/package.json
{
  "type": "module"
}
```

```json
// treasurer-api/tsconfig.json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022"
  }
}
```

### WARNING: Missing .js Extensions

**The Problem:**

```typescript
// BAD - Will fail at runtime with ERR_MODULE_NOT_FOUND
import { env } from '../config/env'
import { prisma } from '../config/database'
```

**Why This Breaks:**
1. Node.js ESM requires explicit file extensions
2. TypeScript compiles to `.js` but doesn't add extensions
3. Runtime error: `Cannot find module '../config/env'`

**The Fix:**

```typescript
// GOOD - Include .js extension for ESM
import { env } from '../config/env.js'
import { prisma } from '../config/database.js'
import { AppError } from '../middleware/errorHandler.js'
```

### Frontend Module Setup

Vite handles module resolution automatically:

```json
// treasurer/tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

```typescript
// Frontend - no .js extension needed (Vite resolves)
import { Button } from '@/components/ui/Button'
import { useDebounce } from '@/hooks/useDebounce'
```

---

## Import Patterns

### Import Order Convention

Follow this order in all files:

```typescript
// 1. External packages
import express from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

// 2. Internal absolute imports (path aliases)
import { env } from '@/config/env.js'
import { authService } from '@/services/authService.js'

// 3. Relative imports
import { validate } from '../middleware/validate.js'

// 4. Type-only imports (last)
import type { Request, Response } from 'express'
import type { User } from '@prisma/client'
```

### Barrel Exports

```typescript
// treasurer/src/components/ui/index.ts
export { Button } from './Button'
export { Card } from './Card'
export { Input } from './Input'

// Usage
import { Button, Card, Input } from '@/components/ui'
```

**WARNING:** Avoid deep barrel exports in large projects—they can hurt tree-shaking and bundle size.

---

## Path Aliases

### Configuration

```json
// tsconfig.json (both packages)
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Vite Configuration (Frontend)

```typescript
// treasurer/vite.config.ts
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

### Usage Examples

```typescript
// Frontend
import { Button } from '@/components/ui/Button'
import { useAppDispatch } from '@/store/hooks'
import type { Transaction } from '@/types'

// Backend (remember .js extension!)
import { prisma } from '@/config/database.js'
import { authService } from '@/services/authService.js'
import type { AuthenticatedRequest } from '@/types/express.js'
```

---

## Type-Only Imports

### When to Use type Import

```typescript
// GOOD - type import for types only (removed at compile time)
import type { Request, Response, NextFunction } from 'express'
import type { User, Transaction } from '@prisma/client'

// GOOD - Mixed import when you need both values and types
import { z, type ZodError } from 'zod'

// BAD - Regular import for types wastes bundle space
import { Request, Response } from 'express' // Imports the entire express module
```

### Enforcing Type Imports

```json
// tsconfig.json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true
  }
}
```

This enforces explicit `type` keyword for type-only imports.

---

## Module Augmentation

### Extending Express Types

```typescript
// treasurer-api/src/types/express.d.ts
import type { User, OrganizationMember } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      user?: User
      organizationMember?: OrganizationMember
    }
  }
}

// Must export something to make it a module
export {}
```

### Extending Window (Frontend)

```typescript
// treasurer/src/types/global.d.ts
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: () => unknown
  }
}

export {}
```

### Adding Custom Environment Variables

```typescript
// treasurer/src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

---

## Validation Workflow

Copy this checklist when adding new modules:

- [ ] Add path alias if needed in tsconfig.json
- [ ] Update vite.config.ts alias (frontend only)
- [ ] Use `.js` extension for backend imports
- [ ] Use `type` keyword for type-only imports
- [ ] Run `pnpm type-check` to verify