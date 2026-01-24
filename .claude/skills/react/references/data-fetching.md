# Data Fetching Reference

## Contents
- RTK Query Pattern (Primary)
- Query Hook Usage
- Mutation Patterns
- Optimistic Updates
- Data Fetching Anti-Patterns

## RTK Query Pattern (Primary)

This codebase uses RTK Query for all server state. NEVER use `useEffect` for data fetching. See the **redux** skill for full Redux patterns.

### API Slice Definition

```typescript
// treasurer/src/store/api/transactions.ts
import { api } from './base'

export const transactionsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTransactions: builder.query<TransactionsResponse, { orgId: string; accountId: string }>({
      query: ({ orgId, accountId }) =>
        `/organizations/${orgId}/accounts/${accountId}/transactions`,
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Transaction' as const, id })),
              { type: 'Transaction', id: 'LIST' },
            ]
          : [{ type: 'Transaction', id: 'LIST' }],
    }),

    getTransaction: builder.query<Transaction, { orgId: string; accountId: string; id: string }>({
      query: ({ orgId, accountId, id }) =>
        `/organizations/${orgId}/accounts/${accountId}/transactions/${id}`,
      providesTags: (result, error, { id }) => [{ type: 'Transaction', id }],
    }),
  }),
})

export const { useGetTransactionsQuery, useGetTransactionQuery } = transactionsApi
```

## Query Hook Usage

### Basic Query

```typescript
function TransactionsList({ orgId, accountId }: Props) {
  const { data, isLoading, error, refetch } = useGetTransactionsQuery({ orgId, accountId })

  if (isLoading) return <Spinner />
  if (error) return <ErrorDisplay error={error} />

  return (
    <ul>
      {data?.data.map(tx => (
        <TransactionRow key={tx.id} transaction={tx} />
      ))}
    </ul>
  )
}
```

### Conditional Fetching

```typescript
// Skip query until orgId is available
const { data } = useGetAccountsQuery(orgId, { skip: !orgId })
```

### Polling

```typescript
// Refresh every 30 seconds
const { data } = useGetStatusSummaryQuery(accountId, {
  pollingInterval: 30000,
})
```

## Mutation Patterns

### Basic Mutation

```typescript
const [updateTransaction, { isLoading }] = useUpdateTransactionMutation()

const handleSubmit = async (data: TransactionFormData) => {
  try {
    await updateTransaction({ orgId, accountId, id, ...data }).unwrap()
    toast.success('Transaction updated')
  } catch (error) {
    toast.error('Update failed')
  }
}
```

### Mutation with Cache Invalidation

```typescript
updateTransactionStatus: builder.mutation({
  query: ({ orgId, accountId, transactionId, status }) => ({
    url: `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
    method: 'PATCH',
    body: { status },
  }),
  invalidatesTags: (result, error, { transactionId }) => [
    { type: 'Transaction', id: transactionId },
    { type: 'Transaction', id: 'LIST' },
    { type: 'StatusSummary' },
  ],
}),
```

## Optimistic Updates

```typescript
updateTransactionStatus: builder.mutation({
  query: ({ orgId, accountId, transactionId, status }) => ({
    url: `...`,
    method: 'PATCH',
    body: { status },
  }),
  async onQueryStarted({ orgId, accountId, transactionId, status }, { dispatch, queryFulfilled }) {
    // Optimistically update cache
    const patchResult = dispatch(
      transactionsApi.util.updateQueryData(
        'getTransactions',
        { orgId, accountId },
        (draft) => {
          const tx = draft.data.find(t => t.id === transactionId)
          if (tx) tx.status = status
        }
      )
    )

    try {
      await queryFulfilled
    } catch {
      patchResult.undo() // Rollback on error
    }
  },
}),
```

## Data Fetching Anti-Patterns

### WARNING: useEffect for Data Fetching

**The Problem:**

```typescript
// BAD - NEVER DO THIS
function TransactionPage({ id }: Props) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/transactions/${id}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [id])
}
```

**Why This Breaks:**
1. **Race conditions** - Fast ID changes cause stale data overwrites
2. **Memory leaks** - Unmount during fetch triggers setState warning
3. **No caching** - Every mount = new request
4. **No deduplication** - Multiple components = multiple requests
5. **No retry logic** - Network failures require manual handling
6. **Waterfall requests** - Nested components fetch sequentially

**The Fix:**

```typescript
// GOOD - Use RTK Query
function TransactionPage({ id }: Props) {
  const { data, isLoading, error } = useGetTransactionQuery(id)
  // Caching, deduplication, error handling - all automatic
}
```

### WARNING: Fetch in Event Handlers Without Loading State

**The Problem:**

```typescript
// BAD - No loading feedback
const handleDelete = async () => {
  await deleteTransaction(id)
  navigate('/transactions')
}
```

**The Fix:**

```typescript
// GOOD - Use mutation loading state
const [deleteTransaction, { isLoading }] = useDeleteTransactionMutation()

const handleDelete = async () => {
  await deleteTransaction(id).unwrap()
  navigate('/transactions')
}

<Button onClick={handleDelete} isLoading={isLoading}>Delete</Button>