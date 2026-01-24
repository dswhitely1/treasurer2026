---
name: react
description: |
  Manages React 18 hooks, components, and patterns for building the UI layer.
  Use when: Creating or modifying frontend components, managing component state, 
  implementing React hooks, building forms, or optimizing rendering performance.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# React Skill

React 18 frontend with TypeScript strict mode, Redux Toolkit for state management, and RTK Query for server state. Components use Class Variance Authority (CVA) for variant-based styling with Tailwind CSS. All pages are PascalCase, hooks use `use` prefix, and the codebase enforces zero ESLint warnings.

## Quick Start

### Component with Variants

```typescript
// treasurer/src/components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-11 px-8 text-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export type ButtonProps = VariantProps<typeof buttonVariants> & 
  React.ButtonHTMLAttributes<HTMLButtonElement>
```

### Custom Hook Pattern

```typescript
// treasurer/src/hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  
  return debouncedValue
}
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| CVA Variants | Component styling | `buttonVariants({ variant: 'primary' })` |
| RTK Query | Server state | `useGetTransactionsQuery({ orgId })` |
| Redux Slices | Client state | `dispatch(toggleStatusFilter('cleared'))` |
| Typed Hooks | Store access | `useAppDispatch()`, `useAppSelector()` |
| Path Aliases | Imports | `@/components/ui/Button` |

## Common Patterns

### Typed Redux Hooks

```typescript
// treasurer/src/store/hooks.ts
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'
import type { RootState, AppDispatch } from './index'

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
```

### Memoized Selectors

```typescript
// treasurer/src/store/features/statusSlice.ts
export const selectActiveStatusFilters = createSelector(
  [selectStatusFilter],
  (filter): TransactionStatus[] => {
    const active: TransactionStatus[] = []
    if (filter.uncleared) active.push('UNCLEARED')
    if (filter.cleared) active.push('CLEARED')
    if (filter.reconciled) active.push('RECONCILED')
    return active
  }
)
```

## See Also

- [hooks](references/hooks.md) - Custom hooks and hook patterns
- [components](references/components.md) - Component architecture with CVA
- [data-fetching](references/data-fetching.md) - RTK Query patterns
- [state](references/state.md) - Redux Toolkit state management
- [forms](references/forms.md) - React Hook Form with Zod
- [performance](references/performance.md) - Memoization and optimization

## Related Skills

- See the **redux** skill for Redux Toolkit patterns and RTK Query
- See the **typescript** skill for strict mode and type patterns
- See the **tailwind** skill for utility-first styling with CVA
- See the **zod** skill for form validation schemas
- See the **vitest** skill for component testing

## Documentation Resources

> Fetch latest React documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "react"
2. Prefer website documentation (IDs starting with `/websites/`) over source code
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/facebook/react` _(resolve using mcp__context7__resolve-library-id)_

**Recommended Queries:**
- "React hooks useState useEffect useCallback useMemo"
- "React 18 concurrent features"
- "React TypeScript patterns"