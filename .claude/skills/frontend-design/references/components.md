# Components Reference

## Contents
- CVA Pattern
- Button Variants
- Form Inputs
- Cards and Containers
- Data Display Components
- Component Composition

---

## CVA Pattern

All UI components use Class Variance Authority for type-safe variants.

```typescript
// treasurer/src/components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base styles applied to all variants
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-500',
        destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
        ghost: 'hover:bg-gray-100 focus-visible:ring-gray-500',
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

export function Button({ className, variant, size, isLoading, children, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} disabled={isLoading} {...props}>
      {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
      {children}
    </button>
  )
}
```

---

## Form Inputs

```typescript
// treasurer/src/components/ui/Input.tsx
const inputVariants = cva(
  'flex w-full rounded-md border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      state: {
        default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
        error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
)
```

### Form Field Pattern

```tsx
// Consistent field structure
<div className="space-y-2">
  <label htmlFor="amount" className="text-sm font-medium text-gray-700">
    Amount
  </label>
  <Input
    id="amount"
    type="number"
    state={errors.amount ? 'error' : 'default'}
    className="font-mono" // For monetary input
  />
  {errors.amount && (
    <p className="text-sm text-red-600">{errors.amount.message}</p>
  )}
</div>
```

---

## Cards and Containers

```tsx
// Standard card
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">Title</h3>
  {children}
</div>

// Elevated card (modals, dropdowns)
<div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
  {children}
</div>

// Interactive card (clickable)
<button className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-left hover:border-blue-500 hover:shadow-md transition-all">
  {children}
</button>
```

---

## Data Display Components

### Status Badge

```tsx
const statusBadgeVariants = cva(
  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
  {
    variants: {
      status: {
        UNCLEARED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        CLEARED: 'bg-blue-100 text-blue-800 border-blue-200',
        RECONCILED: 'bg-green-100 text-green-800 border-green-200',
      },
    },
  }
)

function StatusBadge({ status }: { status: TransactionStatus }) {
  return <span className={statusBadgeVariants({ status })}>{status}</span>
}
```

### Amount Display

```tsx
// Always right-align, always monospace
function Amount({ value, type }: { value: number; type: 'INCOME' | 'EXPENSE' }) {
  const isNegative = type === 'EXPENSE'
  return (
    <span className={cn(
      'font-mono tabular-nums text-sm',
      isNegative ? 'text-red-600' : 'text-green-600'
    )}>
      {isNegative ? '-' : '+'}${Math.abs(value).toFixed(2)}
    </span>
  )
}
```

---

## WARNING: Inconsistent Component APIs

**The Problem:**

```tsx
// BAD - Inconsistent prop naming across components
<Button color="primary" />
<Input variant="error" />
<Badge type="success" />
```

**The Fix:**

```tsx
// GOOD - Consistent variant prop across all components
<Button variant="primary" />
<Input variant="error" />  // Use 'state' for validation states
<Badge variant="success" />