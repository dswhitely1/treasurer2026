# Layouts Reference

## Contents
- Page Structure
- Grid System
- Responsive Breakpoints
- Spacing Scale
- Container Patterns
- Financial Data Layouts

---

## Page Structure

Treasurer uses a consistent page layout with organization-scoped navigation.

```tsx
// treasurer/src/components/layout/RootLayout.tsx
function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Footer />
    </div>
  )
}
```

### Page Header Pattern

```tsx
// Consistent page header with title and actions
<div className="mb-8 flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
    <p className="mt-1 text-sm text-gray-600">
      Manage transactions for {accountName}
    </p>
  </div>
  <div className="flex gap-3">
    <Button variant="secondary">Export</Button>
    <Button variant="primary">Add Transaction</Button>
  </div>
</div>
```

---

## Grid System

```tsx
// Two-column layout (sidebar + content)
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
  <aside className="lg:col-span-1">
    {/* Sidebar content */}
  </aside>
  <main className="lg:col-span-3">
    {/* Main content */}
  </main>
</div>

// Dashboard grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <StatCard title="Total Balance" value="$12,345.67" />
  <StatCard title="Income" value="$5,000.00" />
  <StatCard title="Expenses" value="$3,456.78" />
  <StatCard title="Pending" value="$1,234.00" />
</div>

// Form layout (labels + inputs)
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <FormField label="Account Name" />
  <FormField label="Account Type" />
</div>
```

---

## Responsive Breakpoints

Tailwind defaults used consistently:

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm:` | 640px | Stack to row on small tablets |
| `md:` | 768px | Two-column layouts |
| `lg:` | 1024px | Full desktop layouts |
| `xl:` | 1280px | Extra-wide layouts |

### Mobile-First Pattern

```tsx
// DO - Mobile-first, add complexity at larger sizes
<div className="flex flex-col sm:flex-row gap-4">
  <div className="w-full sm:w-1/2">First</div>
  <div className="w-full sm:w-1/2">Second</div>
</div>

// DON'T - Desktop-first, hide at smaller sizes
<div className="flex-row sm:flex-col">  // Backwards
```

---

## Spacing Scale

Use Tailwind's spacing scale consistently:

| Token | Value | Usage |
|-------|-------|-------|
| `gap-2` | 0.5rem | Tight spacing (icon + text) |
| `gap-4` | 1rem | Default element spacing |
| `gap-6` | 1.5rem | Section spacing |
| `gap-8` | 2rem | Page section spacing |
| `p-4` | 1rem | Card padding (small) |
| `p-6` | 1.5rem | Card padding (default) |

---

## Container Patterns

```tsx
// Page container
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

// Narrow content (forms, detail views)
<div className="max-w-2xl mx-auto">

// Full-width with padding
<div className="w-full px-4 sm:px-6 lg:px-8">
```

---

## Financial Data Layouts

### Transaction List

```tsx
<div className="bg-white shadow-sm rounded-lg overflow-hidden">
  {/* Header with filters */}
  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
    <StatusFilter />
    <SearchInput />
  </div>
  
  {/* Scrollable table container */}
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {transactions.map(tx => <TransactionRow key={tx.id} transaction={tx} />)}
      </tbody>
    </table>
  </div>
  
  {/* Footer with pagination */}
  <div className="px-6 py-4 border-t border-gray-200">
    <Pagination />
  </div>
</div>
```

### Reconciliation Layout

```tsx
// Side-by-side comparison for reconciliation
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div className="bg-white rounded-lg shadow-sm p-6">
    <h3 className="text-lg font-semibold mb-4">Bank Statement</h3>
    <div className="text-3xl font-mono tabular-nums">${statementBalance}</div>
  </div>
  <div className="bg-white rounded-lg shadow-sm p-6">
    <h3 className="text-lg font-semibold mb-4">Cleared Transactions</h3>
    <div className="text-3xl font-mono tabular-nums">${clearedTotal}</div>
  </div>
</div>