# Tailwind Patterns Reference

## Contents
- CVA Component Variants
- Utility Class Patterns
- Form Styling
- Layout Patterns
- Anti-Patterns

---

## CVA Component Variants

### Button with Multiple Variants

```tsx
// treasurer/src/components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  // Base classes applied to ALL variants
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400',
        destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        ghost: 'hover:bg-gray-100 text-gray-700',
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
      {isLoading && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
```

### Input Component with States

```tsx
// treasurer/src/components/ui/Input.tsx
import { cva } from 'class-variance-authority'

const inputVariants = cva(
  'flex w-full rounded-md border bg-white px-3 py-2 text-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0',
  {
    variants: {
      state: {
        default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
        error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
        success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
)
```

---

## Utility Class Patterns

### Flexbox Centering

```tsx
// GOOD - Clear intent
<div className="flex items-center justify-center">
  <span>Centered content</span>
</div>

// GOOD - Inline flex with gap
<div className="inline-flex items-center gap-2">
  <Icon />
  <span>Label</span>
</div>
```

### Grid Layouts

```tsx
// Responsive grid - 1 col mobile, 2 cols tablet, 3 cols desktop
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  {items.map((item) => <Card key={item.id} {...item} />)}
</div>

// Fixed sidebar layout
<div className="grid grid-cols-[250px_1fr] gap-6">
  <aside>Sidebar</aside>
  <main>Content</main>
</div>
```

### Spacing Patterns

```tsx
// GOOD - Consistent spacing scale
<div className="space-y-4">
  <Section />
  <Section />
</div>

// GOOD - Gap for flex/grid
<div className="flex gap-4">
  <Button>Save</Button>
  <Button variant="secondary">Cancel</Button>
</div>
```

---

## Form Styling

### Form Field Pattern

```tsx
function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

// Usage
<FormField label="Email" error={errors.email?.message}>
  <Input type="email" state={errors.email ? 'error' : 'default'} {...register('email')} />
</FormField>
```

### Form Layout

```tsx
<form className="space-y-6">
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <FormField label="First Name">
      <Input {...register('firstName')} />
    </FormField>
    <FormField label="Last Name">
      <Input {...register('lastName')} />
    </FormField>
  </div>
  
  <FormField label="Email">
    <Input type="email" {...register('email')} />
  </FormField>
  
  <div className="flex justify-end gap-3">
    <Button variant="secondary" type="button">Cancel</Button>
    <Button type="submit">Save</Button>
  </div>
</form>
```

---

## Layout Patterns

### Page Layout

```tsx
// treasurer/src/components/layout/RootLayout.tsx
function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header className="sticky top-0 z-50 border-b bg-white" />
      <main className="flex-1">{children}</main>
      <Footer className="border-t bg-gray-50" />
    </div>
  )
}
```

### Container Pattern

```tsx
// Centered content with max-width
<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
  {children}
</div>
```

---

## Anti-Patterns

### WARNING: Inline Style Objects

**The Problem:**

```tsx
// BAD - Defeats Tailwind's purpose
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
```

**Why This Breaks:**
1. Loses Tailwind's responsive utilities
2. No design system consistency
3. Larger bundle size than utility classes

**The Fix:**

```tsx
// GOOD - Utility classes
<div className="flex items-center gap-2">
```

### WARNING: Arbitrary Values Overuse

**The Problem:**

```tsx
// BAD - Magic numbers everywhere
<div className="mt-[13px] w-[247px] h-[89px] p-[7px]">
```

**Why This Breaks:**
1. Inconsistent spacing breaks visual rhythm
2. Hard to maintain across components
3. Ignores Tailwind's spacing scale

**The Fix:**

```tsx
// GOOD - Use spacing scale
<div className="mt-3 w-64 h-24 p-2">
```

**When Arbitrary Values Are OK:** One-off values for specific brand requirements or pixel-perfect designs.

### WARNING: Class String Concatenation

**The Problem:**

```tsx
// BAD - Breaks Tailwind IntelliSense
const classes = 'flex ' + (isActive ? 'bg-blue-500' : 'bg-gray-500')
```

**The Fix:**

```tsx
// GOOD - Use cn() or clsx
import { cn } from '@/lib/utils'
const classes = cn('flex', isActive ? 'bg-blue-500' : 'bg-gray-500')