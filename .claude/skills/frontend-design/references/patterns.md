# Design Patterns Reference

## Contents
- Anti-Pattern Catalog
- Financial App Best Practices
- Visual Consistency Checklist
- Accessibility Requirements
- Decision Framework

---

## Anti-Pattern Catalog

### WARNING: Generic AI Aesthetic

**The Problem:**

```tsx
// BAD - Every AI-generated UI looks like this
<div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-3xl shadow-2xl backdrop-blur-lg">
  <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">
    Welcome
  </h1>
</div>
```

**Why This Breaks:**
1. Gradients reduce trust in financial applications
2. Extreme border-radius looks unprofessional for data apps
3. Glassmorphism reduces contrast and readability

**The Fix:**

```tsx
// GOOD - Professional, trustworthy financial UI
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <h1 className="text-2xl font-bold text-gray-900">
    Welcome
  </h1>
</div>
```

---

### WARNING: Inconsistent Status Colors

**The Problem:**

```tsx
// BAD - Random colors for transaction states
<Badge className="bg-purple-100">UNCLEARED</Badge>
<Badge className="bg-orange-100">CLEARED</Badge>
<Badge className="bg-teal-100">RECONCILED</Badge>
```

**Why This Breaks:** Users build mental models. Financial status colors should follow conventions:
- Yellow = pending/warning
- Blue = in progress
- Green = complete/success

**The Fix:**

```tsx
// GOOD - Semantic, consistent status colors
<Badge className="bg-yellow-100 text-yellow-800">UNCLEARED</Badge>
<Badge className="bg-blue-100 text-blue-800">CLEARED</Badge>
<Badge className="bg-green-100 text-green-800">RECONCILED</Badge>
```

---

### WARNING: Proportional Fonts for Numbers

**The Problem:**

```tsx
// BAD - Numbers misalign in columns
<td className="text-right">$1,234.56</td>
<td className="text-right">$99.00</td>
```

**The Fix:**

```tsx
// GOOD - Monospace with tabular figures
<td className="text-right font-mono tabular-nums">$1,234.56</td>
<td className="text-right font-mono tabular-nums">$99.00</td>
```

---

### WARNING: Missing Focus States

**The Problem:**

```tsx
// BAD - Removes focus indicator for "cleaner" look
<button className="focus:outline-none">Submit</button>
```

**Why This Breaks:** Keyboard users cannot see what element is focused. WCAG 2.1 requires visible focus indicators.

**The Fix:**

```tsx
// GOOD - Visible focus ring
<button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
  Submit
</button>
```

---

## Financial App Best Practices

### Data Density

```tsx
// Financial users expect to see many records at once
// DO: Compact rows with essential information
<tr className="h-12">  {/* Not too tall */}
  <td className="px-4 py-2 text-sm">{/* Reasonable padding */}</td>
</tr>

// DON'T: Oversized cards with lots of whitespace
<div className="p-8 min-h-32">  {/* Wasteful */}
```

### Number Formatting

```tsx
// Always format currency consistently
const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
```

### Color Coding

| Purpose | Color | Tailwind Class |
|---------|-------|----------------|
| Income/Credit | Green | `text-green-600` |
| Expense/Debit | Red | `text-red-600` |
| Neutral | Gray | `text-gray-900` |
| Warning | Yellow | `text-yellow-600` |
| Info | Blue | `text-blue-600` |

---

## Visual Consistency Checklist

Copy this checklist when building new views:

- [ ] Page title uses `text-2xl font-bold text-gray-900`
- [ ] Section titles use `text-lg font-semibold text-gray-900`
- [ ] Cards use `bg-white rounded-lg shadow-sm border border-gray-200 p-6`
- [ ] Primary buttons use `variant="primary"`
- [ ] Destructive actions use `variant="destructive"` with confirmation
- [ ] Monetary values use `font-mono tabular-nums text-right`
- [ ] Status badges use semantic colors (yellow/blue/green)
- [ ] Tables have `divide-y divide-gray-200`
- [ ] Focus states are visible (`focus-visible:ring-2`)
- [ ] Spacing uses consistent scale (gap-4, gap-6, gap-8)

---

## Accessibility Requirements

### Color Contrast

```tsx
// Minimum contrast ratios (WCAG AA)
// Normal text: 4.5:1
// Large text (18px+ bold or 24px+): 3:1

// DO - High contrast
<p className="text-gray-900">Primary text</p>       // ~21:1 on white
<p className="text-gray-600">Secondary text</p>    // ~5.7:1 on white

// DON'T - Low contrast
<p className="text-gray-400">Hard to read</p>      // ~3.4:1 - fails AA
```

### Interactive Elements

```tsx
// Minimum touch target size: 44x44px on mobile
<button className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">
```

---

## Decision Framework

### When to Add Visual Flair

**Add:** When it aids comprehension (status colors, icons for transaction types)
**Avoid:** When it's purely decorative (gradients, excessive shadows, animations)

### When to Break Consistency

**Break:** When a unique action needs to stand out (delete account, reconcile all)
**Don't Break:** For minor variations (slightly different padding, colors)