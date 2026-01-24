# Performance Reference

## Contents
- Memoization Patterns
- Preventing Re-renders
- Code Splitting
- RTK Query Caching
- Performance Anti-Patterns

## Memoization Patterns

### React.memo for Components

```typescript
// treasurer/src/components/transactions/TransactionRow.tsx
import { memo } from 'react'

interface TransactionRowProps {
  transaction: Transaction
  isSelected: boolean
  onToggle: (id: string) => void
}

export const TransactionRow = memo(function TransactionRow({
  transaction,
  isSelected,
  onToggle,
}: TransactionRowProps) {
  return (
    <tr className={isSelected ? 'bg-blue-50' : ''}>
      <td>{transaction.description}</td>
      <td>{formatCurrency(transaction.amount)}</td>
    </tr>
  )
})
```

### useMemo for Expensive Computations

```typescript
function TransactionStats({ transactions }: Props) {
  const stats = useMemo(() => ({
    total: transactions.reduce((sum, t) => sum + t.amount, 0),
    count: transactions.length,
    avgAmount: transactions.length > 0 
      ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length 
      : 0,
  }), [transactions])

  return <StatsDisplay stats={stats} />
}
```

### useCallback for Stable Function References

```typescript
function TransactionList({ transactions, onStatusChange }: Props) {
  // Stable reference prevents child re-renders
  const handleToggle = useCallback((id: string) => {
    dispatch(toggleSelection(id))
  }, [dispatch])

  return (
    <>
      {transactions.map(tx => (
        <TransactionRow 
          key={tx.id} 
          transaction={tx} 
          onToggle={handleToggle} // Same reference every render
        />
      ))}
    </>
  )
}
```

## Preventing Re-renders

### Factory Selectors for Row Components

```typescript
// Each row gets its own memoized selector
function TransactionRow({ id }: Props) {
  const selectIsSelected = useMemo(makeSelectIsSelected, [])
  const isSelected = useAppSelector(state => selectIsSelected(state, id))
  
  // Only re-renders when THIS row's selection changes
}
```

### Avoid Inline Objects/Arrays

```typescript
// BAD - New array every render
<TransactionList columns={['date', 'amount', 'status']} />

// GOOD - Stable reference
const COLUMNS = ['date', 'amount', 'status'] as const
<TransactionList columns={COLUMNS} />
```

## Code Splitting

### Lazy Loading Pages

```typescript
// treasurer/src/App.tsx
import { lazy, Suspense } from 'react'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ReconciliationPage = lazy(() => import('./pages/ReconciliationPage'))
const AccountsPage = lazy(() => import('./pages/AccountsPage'))

function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/reconciliation/:accountId" element={<ReconciliationPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
      </Routes>
    </Suspense>
  )
}
```

## RTK Query Caching

```typescript
// treasurer/src/store/api/base.ts
export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Transaction', 'Account', 'StatusSummary'],
  endpoints: () => ({}),
  // Keep unused data for 60 seconds
  keepUnusedDataFor: 60,
})
```

### Tag-Based Invalidation

```typescript
// Mutation invalidates specific tags
updateTransaction: builder.mutation({
  query: ({ id, ...body }) => ({ url: `/transactions/${id}`, method: 'PATCH', body }),
  invalidatesTags: (result, error, { id }) => [
    { type: 'Transaction', id },      // Invalidate this transaction
    { type: 'Transaction', id: 'LIST' }, // Invalidate list
  ],
}),
```

## Performance Anti-Patterns

### WARNING: Creating Functions in Render

**The Problem:**

```typescript
// BAD - New function every render
{transactions.map(tx => (
  <TransactionRow 
    key={tx.id}
    onDelete={() => handleDelete(tx.id)} // New function each render!
  />
))}
```

**Why This Breaks:**
1. Breaks `React.memo` on child components
2. Causes all rows to re-render on any state change

**The Fix:**

```typescript
// GOOD - Pass id, create handler once in child
const handleDelete = useCallback((id: string) => {
  deleteTransaction(id)
}, [deleteTransaction])

{transactions.map(tx => (
  <TransactionRow 
    key={tx.id}
    id={tx.id}
    onDelete={handleDelete}
  />
))}

// In TransactionRow
<Button onClick={() => onDelete(id)}>Delete</Button>
```

### WARNING: Selecting Full State Objects

**The Problem:**

```typescript
// BAD - Re-renders on ANY state change
const state = useAppSelector(state => state.status)
```

**Why This Breaks:**
Component re-renders whenever anything in `status` changes.

**The Fix:**

```typescript
// GOOD - Select only what's needed
const filter = useAppSelector(state => state.status.statusFilter)
const selectedIds = useAppSelector(state => state.status.selectedIds)
```

### WARNING: Missing Keys in Lists

**The Problem:**

```typescript
// BAD - React can't track identity
{items.map(item => <Item {...item} />)}
```

**Why This Breaks:**
Full re-render of all items on any change.

**The Fix:**

```typescript
// GOOD - Stable unique key
{items.map(item => <Item key={item.id} {...item} />)}