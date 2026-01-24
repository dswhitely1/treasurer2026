---
name: frontend-design
description: |
  Applies UI design patterns with Tailwind CSS, component variants, and responsive layouts.
  Use when: Creating new UI components, styling existing components, implementing responsive layouts, establishing visual consistency across the Treasurer application.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

# Frontend Design Skill

Treasurer uses Tailwind CSS with Class Variance Authority (CVA) for component styling. The design system emphasizes financial application conventions: clear data presentation, status-driven colors, and information density appropriate for reconciliation workflows.

## Quick Start

### Component Variants with CVA

```typescript
// treasurer/src/components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        ghost: 'hover:bg-gray-100',
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
```

### Status-Driven Styling

```typescript
// Transaction status colors - semantic meaning is critical
const statusColors = {
  UNCLEARED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CLEARED: 'bg-blue-100 text-blue-800 border-blue-200',
  RECONCILED: 'bg-green-100 text-green-800 border-green-200',
}
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| CVA Variants | Type-safe component styling | `variant: 'primary'` |
| Status Colors | Financial state indication | Yellow→Blue→Green flow |
| Responsive | Mobile-first breakpoints | `sm:`, `md:`, `lg:` |
| Focus States | Keyboard accessibility | `focus-visible:ring-2` |

## Common Patterns

### Financial Data Tables

**When:** Displaying transaction lists, account summaries

```tsx
<table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50">
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Date
      </th>
      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
        Amount
      </th>
    </tr>
  </thead>
  <tbody className="bg-white divide-y divide-gray-200">
    {/* Right-align monetary values */}
    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-sm">
      ${amount.toFixed(2)}
    </td>
  </tbody>
</table>
```

### Card Containers

**When:** Grouping related content, dashboard widgets

```tsx
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Summary</h3>
  {/* Content */}
</div>
```

## See Also

- [aesthetics](references/aesthetics.md) - Colors, typography, visual identity
- [components](references/components.md) - UI component patterns
- [layouts](references/layouts.md) - Page structures, grids, responsive design
- [motion](references/motion.md) - Transitions, animations
- [patterns](references/patterns.md) - Design anti-patterns, best practices

## Related Skills

- See the **tailwind** skill for utility class patterns
- See the **react** skill for component architecture
- See the **typescript** skill for type-safe props with CVA