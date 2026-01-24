# Aesthetics Reference

## Contents
- Color System
- Typography
- Status Semantics
- Visual Identity
- Dark Mode Considerations

---

## Color System

Treasurer uses Tailwind's default palette with semantic meaning for financial states.

### Primary Palette

```typescript
// Core brand colors
const colors = {
  primary: 'blue-600',      // Primary actions, links
  secondary: 'gray-200',    // Secondary buttons, borders
  accent: 'blue-500',       // Focus rings, highlights
  destructive: 'red-600',   // Delete actions, errors
}
```

### Status Colors (Critical for Financial Apps)

```tsx
// NEVER change these without understanding the user mental model
// Yellow = needs attention, Blue = in progress, Green = complete

// DO - Semantic status indication
<span className="bg-yellow-100 text-yellow-800 border border-yellow-200 px-2 py-1 rounded-full text-xs font-medium">
  UNCLEARED
</span>

// DON'T - Random color choices break user expectations
<span className="bg-purple-100 text-purple-800">UNCLEARED</span> // Confusing
```

### Background Hierarchy

```css
/* Page background */
.page { @apply bg-gray-50; }

/* Card/section background */
.card { @apply bg-white; }

/* Elevated elements (modals, dropdowns) */
.elevated { @apply bg-white shadow-lg; }

/* Selected/active states */
.selected { @apply bg-blue-50; }
```

---

## Typography

### Font Stack

```typescript
// Tailwind default sans-serif stack - don't override without reason
// System fonts load instantly and match user's OS
fontFamily: {
  sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
}
```

### Type Scale

```tsx
// Headings
<h1 className="text-2xl font-bold text-gray-900">Page Title</h1>
<h2 className="text-xl font-semibold text-gray-900">Section Title</h2>
<h3 className="text-lg font-semibold text-gray-900">Card Title</h3>

// Body text
<p className="text-base text-gray-700">Primary content</p>
<p className="text-sm text-gray-600">Secondary content</p>
<p className="text-xs text-gray-500">Labels, captions</p>

// Monetary values - ALWAYS use monospace
<span className="font-mono text-sm tabular-nums">$1,234.56</span>
```

### WARNING: Monetary Display

**The Problem:**

```tsx
// BAD - Proportional fonts cause misaligned columns
<td className="text-right">$1,234.56</td>
<td className="text-right">$99.00</td>
```

**Why This Breaks:** Digits have different widths in proportional fonts. Columns won't align, making financial data hard to scan.

**The Fix:**

```tsx
// GOOD - Monospace with tabular numbers
<td className="text-right font-mono tabular-nums">$1,234.56</td>
<td className="text-right font-mono tabular-nums">$99.00</td>
```

---

## Status Semantics

Financial applications MUST use consistent status indication:

| Status | Color | Meaning |
|--------|-------|---------|
| UNCLEARED | Yellow | Needs verification |
| CLEARED | Blue | Verified, pending reconciliation |
| RECONCILED | Green | Complete, locked |
| Error | Red | Failed, attention required |

---

## Visual Identity

Treasurer's design emphasizes:

1. **Data Density** - Financial users expect to see many records
2. **Clarity** - Status must be immediately apparent
3. **Trust** - Conservative styling appropriate for money management
4. **Accessibility** - WCAG AA contrast ratios minimum

### DO: Conservative Financial Aesthetic

```tsx
// Professional, trustworthy appearance
<div className="bg-white border border-gray-200 rounded-lg shadow-sm">
```

### DON'T: Trendy Design Patterns

```tsx
// AVOID - Gradients and glassmorphism reduce trust for financial apps
<div className="bg-gradient-to-r from-purple-500 to-pink-500 backdrop-blur-sm">