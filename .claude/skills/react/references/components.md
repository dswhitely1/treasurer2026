# Components Reference

## Contents
- Component Architecture
- CVA Variant Pattern
- Component Organization
- Props and TypeScript
- Component Anti-Patterns

## Component Architecture

This codebase uses a feature-based organization:

```
treasurer/src/
├── components/
│   ├── ui/           # Reusable primitives (Button, Card, Input)
│   ├── layout/       # Layout components (Header, Footer, RootLayout)
│   ├── accounts/     # Account-related components
│   └── transactions/ # Transaction components
├── features/
│   └── status/       # Feature modules with components, hooks, types
└── pages/            # Route page components (PascalCase)
```

## CVA Variant Pattern

All UI components use Class Variance Authority for styling variants. See the **tailwind** skill for Tailwind patterns.

### Button Component

```typescript
// treasurer/src/components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        ghost: 'hover:bg-gray-100',
        link: 'text-blue-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-11 px-8 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => (
    <button
      className={buttonVariants({ variant, size, className })}
      ref={ref}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? <Spinner /> : children}
    </button>
  )
)
Button.displayName = 'Button'
```

### Card Component

```typescript
// treasurer/src/components/ui/Card.tsx
import { cva, type VariantProps } from 'class-variance-authority'

const cardVariants = cva('rounded-lg border bg-white shadow-sm', {
  variants: {
    padding: {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
  },
  defaultVariants: { padding: 'md' },
})

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, padding, ...props }: CardProps) {
  return <div className={cardVariants({ padding, className })} {...props} />
}
```

## Props and TypeScript

### Discriminated Union Props

```typescript
// GOOD - Type-safe conditional props
type TransactionRowProps = 
  | { mode: 'view'; transaction: Transaction }
  | { mode: 'edit'; transaction: Transaction; onSave: (t: Transaction) => void }

function TransactionRow(props: TransactionRowProps) {
  if (props.mode === 'edit') {
    // props.onSave is available here
  }
}
```

### Component Props with Children

```typescript
// GOOD - Explicit children typing
interface LayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
}

export function Layout({ children, sidebar }: LayoutProps) {
  return (
    <div className="flex">
      {sidebar && <aside>{sidebar}</aside>}
      <main>{children}</main>
    </div>
  )
}
```

## Component Anti-Patterns

### WARNING: Inline Object Props

**The Problem:**

```typescript
// BAD - New object every render
<TransactionList filters={{ status: 'CLEARED' }} />
```

**Why This Breaks:**
1. Creates new object reference on every parent render
2. Breaks `React.memo` optimization
3. Causes unnecessary child re-renders

**The Fix:**

```typescript
// GOOD - Stable reference
const CLEARED_FILTER = { status: 'CLEARED' } as const

<TransactionList filters={CLEARED_FILTER} />

// Or with useMemo for dynamic values
const filters = useMemo(() => ({ status, date }), [status, date])
<TransactionList filters={filters} />
```

### WARNING: Index as Key in Dynamic Lists

**The Problem:**

```typescript
// BAD - Index keys with dynamic lists
{transactions.map((tx, index) => (
  <TransactionRow key={index} transaction={tx} />
))}
```

**Why This Breaks:**
1. Reordering causes wrong component to receive wrong props
2. Deletions cause state to shift incorrectly
3. Editing shows stale data in wrong rows

**The Fix:**

```typescript
// GOOD - Stable unique ID
{transactions.map(tx => (
  <TransactionRow key={tx.id} transaction={tx} />
))}
```

### WARNING: Prop Drilling Past 3 Levels

**When You Might Be Tempted:**
Passing `organizationId` or `user` through many component layers.

**The Fix:**

Use Redux or Context. See the **redux** skill for state patterns.

```typescript
// GOOD - Use Redux selector
function DeepNestedComponent() {
  const orgId = useAppSelector(state => state.organization.activeOrganizationId)
  // Use orgId directly
}