# Tailwind Workflows Reference

## Contents
- Creating New UI Components
- Debugging Styling Issues
- Class Ordering with Prettier
- Responsive Design Workflow
- Dark Mode Implementation

---

## Creating New UI Components

### Workflow Checklist

Copy this checklist and track progress:
- [ ] Step 1: Create component file in `treasurer/src/components/ui/`
- [ ] Step 2: Define CVA variants if component has visual states
- [ ] Step 3: Export typed props including VariantProps
- [ ] Step 4: Add className prop for consumer overrides
- [ ] Step 5: Use cn() to merge base + variant + custom classes
- [ ] Step 6: Test all variants and responsive breakpoints

### Complete Component Example

```tsx
// treasurer/src/components/ui/Badge.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        error: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
```

---

## Debugging Styling Issues

### Iterate-Until-Pass Pattern

1. Open browser DevTools and inspect the element
2. Check computed styles for conflicts
3. Verify Tailwind classes are in final output
4. If class missing: check purge config in `tailwind.config.js`
5. Fix and refresh until styles apply correctly

### Common Issues

**Classes Not Applying:**

```bash
# Check if class exists in build output
grep "bg-blue-600" treasurer/dist/assets/*.css
```

**Specificity Conflicts:**

```tsx
// BAD - Custom CSS fights Tailwind
.my-button { background: red; }  // Overrides Tailwind

// GOOD - Use Tailwind's @apply or className
<button className="bg-red-500 hover:bg-red-600">
```

**Dynamic Classes Not Working:**

```tsx
// BAD - Class name constructed dynamically (not in build)
<div className={`bg-${color}-500`}>

// GOOD - Use complete class names
<div className={cn(
  color === 'blue' && 'bg-blue-500',
  color === 'red' && 'bg-red-500',
)}>
```

### DevTools Debugging

```tsx
// Temporarily add outline to debug layout
<div className="outline outline-2 outline-red-500">
  {/* content */}
</div>
```

---

## Class Ordering with Prettier

This project uses `prettier-plugin-tailwindcss` for automatic class ordering.

### Configuration

```json
// .prettierrc (root)
{
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindConfig": "./treasurer/tailwind.config.js"
}
```

### Workflow

1. Write classes in any order
2. Save file (Prettier auto-formats)
3. Classes reorder to Tailwind's recommended order

**Before formatting:**
```tsx
<div className="p-4 flex bg-white items-center rounded-lg shadow-md gap-2">
```

**After formatting:**
```tsx
<div className="flex items-center gap-2 rounded-lg bg-white p-4 shadow-md">
```

### Run Prettier Manually

```bash
cd treasurer
pnpm prettier --write "src/**/*.{ts,tsx}"
```

---

## Responsive Design Workflow

### Mobile-First Approach

```tsx
// Base styles = mobile, then layer on breakpoints
<div className="
  flex flex-col gap-4      // Mobile: stacked
  md:flex-row md:gap-6     // Tablet: side-by-side
  lg:gap-8                 // Desktop: more spacing
">
```

### Breakpoint Reference

| Prefix | Min-width | Common Use |
|--------|-----------|------------|
| (none) | 0px | Mobile default |
| `sm:` | 640px | Large phones |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large monitors |

### Testing Responsive Layouts

1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test at each breakpoint:
   - 375px (mobile)
   - 768px (tablet)
   - 1024px (laptop)
   - 1440px (desktop)

### Hide/Show Pattern

```tsx
// Show sidebar only on desktop
<aside className="hidden lg:block lg:w-64">
  <Sidebar />
</aside>

// Show mobile nav only on mobile
<nav className="block lg:hidden">
  <MobileNav />
</nav>
```

---

## Dark Mode Implementation

This project uses class-based dark mode.

### Configuration

```js
// treasurer/tailwind.config.js
module.exports = {
  darkMode: 'class',
  // ...
}
```

### Component Pattern

```tsx
<div className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">
  <h1 className="text-gray-900 dark:text-gray-100">Title</h1>
  <p className="text-gray-600 dark:text-gray-400">Description</p>
</div>
```

### Toggle Implementation

```tsx
function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return (
    <button onClick={() => setIsDark(!isDark)}>
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
```

### CVA with Dark Mode

```tsx
const cardVariants = cva(
  'rounded-lg border p-6 transition-colors',
  {
    variants: {
      variant: {
        default: 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
        elevated: 'border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800',
      },
    },
  }
)
```

---

## Integration with TypeScript

See the **typescript** skill for type patterns. Key integration:

```tsx
// Typed variant props from CVA
import type { VariantProps } from 'class-variance-authority'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}
```

---

## Integration with React

See the **react** skill for component patterns. Tailwind integrates via:

1. `className` prop on all React elements
2. CVA for variant-based styling
3. cn() utility for conditional classes