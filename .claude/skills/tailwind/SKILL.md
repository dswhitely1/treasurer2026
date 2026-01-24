---
name: tailwind
description: |
  Applies utility-first Tailwind CSS styling with CVA component variants.
  Use when: styling React components, creating reusable UI primitives, implementing responsive layouts, or building component variant systems.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Tailwind Skill

This project uses Tailwind CSS 3.x with Class Variance Authority (CVA) for component variants. The frontend in `treasurer/` follows a utility-first approach with reusable UI primitives in `src/components/ui/`. Prettier plugin ensures consistent class ordering.

## Quick Start

### Basic Component Styling

```tsx
// treasurer/src/components/ui/Card.tsx
export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('rounded-lg border bg-white p-6 shadow-sm', className)}>
      {children}
    </div>
  )
}
```

### CVA Variants Pattern

```tsx
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
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export type ButtonProps = VariantProps<typeof buttonVariants> & {
  children: React.ReactNode
  className?: string
}
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| Utility-first | Compose styles inline | `className="flex items-center gap-2"` |
| CVA variants | Type-safe component variants | `variant: { primary: '...', secondary: '...' }` |
| cn() helper | Merge classes conditionally | `cn('base-class', isActive && 'active-class')` |
| Responsive | Mobile-first breakpoints | `md:flex lg:grid-cols-3` |
| Dark mode | Class-based dark mode | `dark:bg-gray-800 dark:text-white` |

## Common Patterns

### Conditional Classes with cn()

```tsx
import { cn } from '@/lib/utils'

function StatusBadge({ status }: { status: 'UNCLEARED' | 'CLEARED' | 'RECONCILED' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-1 text-xs font-medium',
        status === 'UNCLEARED' && 'bg-yellow-100 text-yellow-800',
        status === 'CLEARED' && 'bg-blue-100 text-blue-800',
        status === 'RECONCILED' && 'bg-green-100 text-green-800'
      )}
    >
      {status}
    </span>
  )
}
```

### Responsive Layout

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  {accounts.map((account) => (
    <AccountCard key={account.id} account={account} />
  ))}
</div>
```

## See Also

- [patterns](references/patterns.md) - CVA variants, utility patterns, form styling
- [workflows](references/workflows.md) - Component creation, debugging, class ordering

## Related Skills

- **react** - Component architecture that Tailwind styles
- **typescript** - Type-safe CVA variant props
- **vitest** - Testing styled components
- **frontend-design** - Design system patterns

## Documentation Resources

> Fetch latest Tailwind documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "tailwind"
2. Prefer website documentation (IDs starting with `/websites/`) over source code
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/tailwindlabs/tailwindcss` _(resolve using mcp__context7__resolve-library-id)_

**Recommended Queries:**
- "tailwind utility classes"
- "tailwind responsive design"
- "tailwind dark mode"
- "tailwind custom configuration"