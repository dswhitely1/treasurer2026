# Motion Reference

## Contents
- Transition Fundamentals
- CSS Transitions
- Loading States
- Micro-interactions
- Performance Considerations

---

## Transition Fundamentals

Treasurer uses CSS transitions for subtle, performant animations. No animation library is currently installed.

### Duration Guidelines

| Duration | Usage |
|----------|-------|
| 75ms | Instant feedback (opacity) |
| 150ms | Fast transitions (buttons, hovers) |
| 200ms | Standard UI transitions |
| 300ms | Complex state changes |

### Timing Functions

```css
/* Tailwind defaults */
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); /* ease-out - default */
transition-timing-function: cubic-bezier(0, 0, 0.2, 1);   /* ease-in */
transition-timing-function: linear;
```

---

## CSS Transitions

### Button Hover States

```tsx
// All buttons include transition-colors for smooth hover
<button className="bg-blue-600 hover:bg-blue-700 transition-colors duration-150">
  Submit
</button>
```

### Focus States

```tsx
// Focus rings should appear instantly but feel smooth
<input className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors duration-150" />
```

### Expandable Sections

```tsx
// Smooth height transitions for accordions
function Accordion({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  return (
    <div className={cn(
      'overflow-hidden transition-all duration-200',
      isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
    )}>
      {children}
    </div>
  )
}
```

---

## Loading States

### Button Loading

```tsx
function Button({ isLoading, children, ...props }: ButtonProps) {
  return (
    <button disabled={isLoading} {...props}>
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
```

### Skeleton Loading

```tsx
// Use for data tables while fetching
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-200 rounded" />
      ))}
    </div>
  )
}
```

### Optimistic Updates

```tsx
// Show pending state during mutation
function TransactionRow({ transaction, isPending }: Props) {
  return (
    <tr className={cn(
      'transition-opacity duration-200',
      isPending && 'opacity-50'
    )}>
      {/* Row content */}
    </tr>
  )
}
```

---

## Micro-interactions

### Checkbox Toggle

```tsx
// Status checkbox with smooth state change
<input
  type="checkbox"
  checked={isSelected}
  onChange={toggleSelection}
  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors duration-75"
/>
```

### Row Hover

```tsx
<tr className="hover:bg-gray-50 transition-colors duration-75">
  {/* Table cells */}
</tr>
```

### Card Interaction

```tsx
// Clickable card with subtle elevation change
<button className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-left hover:shadow-md hover:border-blue-300 transition-all duration-150">
  {children}
</button>
```

---

## Performance Considerations

### DO: GPU-Accelerated Properties

```tsx
// These properties are cheap to animate
<div className="transition-opacity duration-200" />  // opacity
<div className="transition-transform duration-200" /> // transform
<div className="transition-shadow duration-200" />   // box-shadow (with caution)
```

### WARNING: Expensive Animations

**The Problem:**

```tsx
// BAD - Animating layout properties causes reflow
<div className="transition-all duration-200 hover:w-64 hover:h-48">
```

**Why This Breaks:** Animating `width`, `height`, `margin`, `padding` triggers expensive layout recalculations on every frame.

**The Fix:**

```tsx
// GOOD - Use transform for size changes
<div className="transition-transform duration-200 hover:scale-105">
```

### Reduced Motion

```tsx
// Respect user preferences
<div className="transition-opacity duration-200 motion-reduce:transition-none">
```

Or in Tailwind config:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
}