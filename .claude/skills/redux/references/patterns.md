# Redux Patterns Reference

## Contents
- State Categories
- Slice Patterns
- RTK Query Patterns
- Selector Patterns
- Anti-Patterns

## State Categories

Treasurer separates state into distinct categories:

| Category | Solution | Example |
|----------|----------|---------|
| Server State | RTK Query | Transactions, accounts, API data |
| Client State | Redux slices | Filters, selections, UI state |
| URL State | React Router | Page, filters in query params |
| Local State | useState | Form inputs, modal open/close |

## Slice Patterns

### Feature Slice Structure

```typescript
// store/features/organizationSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { Organization } from '@/types'

interface OrganizationState {
  organizations: Organization[]
  activeOrganizationId: string | null
  loading: boolean
  error: string | null
}

const initialState: OrganizationState = {
  organizations: [],
  activeOrganizationId: null,
  loading: false,
  error: null,
}

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    setActiveOrganization: (state, action: PayloadAction<string>) => {
      state.activeOrganizationId = action.payload
    },
    clearOrganizations: (state) => {
      state.organizations = []
      state.activeOrganizationId = null
    },
  },
})
```

### Bulk Selection Pattern

```typescript
// Complex selection with select-all and exclusions
interface SelectionState {
  selectedIds: string[]
  isSelectAllMode: boolean
  excludedIds: string[]
}

const statusSlice = createSlice({
  name: 'status',
  initialState: { selectedIds: [], isSelectAllMode: false, excludedIds: [] },
  reducers: {
    toggleSelection: (state, action: PayloadAction<string>) => {
      const id = action.payload
      if (state.isSelectAllMode) {
        const idx = state.excludedIds.indexOf(id)
        idx === -1 ? state.excludedIds.push(id) : state.excludedIds.splice(idx, 1)
      } else {
        const idx = state.selectedIds.indexOf(id)
        idx === -1 ? state.selectedIds.push(id) : state.selectedIds.splice(idx, 1)
      }
    },
    selectAll: (state) => {
      state.isSelectAllMode = true
      state.excludedIds = []
    },
    clearSelection: (state) => {
      state.selectedIds = []
      state.isSelectAllMode = false
      state.excludedIds = []
    },
  },
})
```

## RTK Query Patterns

### Tag-Based Invalidation

```typescript
// Proper cache invalidation after mutations
export const accountsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAccounts: builder.query({
      query: (orgId) => `/organizations/${orgId}/accounts`,
      providesTags: (result) =>
        result?.data
          ? [...result.data.map(({ id }) => ({ type: 'Account' as const, id })), { type: 'Account', id: 'LIST' }]
          : [{ type: 'Account', id: 'LIST' }],
    }),
    createAccount: builder.mutation({
      query: ({ orgId, ...body }) => ({
        url: `/organizations/${orgId}/accounts`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Account', id: 'LIST' }],
    }),
  }),
})
```

### Conditional Fetching

```typescript
// Skip queries when data isn't needed
function AccountList({ orgId }: { orgId: string | null }) {
  const { data, isLoading } = useGetAccountsQuery(orgId!, {
    skip: !orgId,  // Don't fetch without orgId
  })
}
```

## Selector Patterns

### Memoized Selectors with createSelector

```typescript
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '@/store'

const selectStatusFilter = (state: RootState) => state.status.statusFilter

export const selectActiveStatusFilters = createSelector(
  [selectStatusFilter],
  (filter): TransactionStatus[] => {
    const active: TransactionStatus[] = []
    if (filter.uncleared) active.push('UNCLEARED')
    if (filter.cleared) active.push('CLEARED')
    if (filter.reconciled) active.push('RECONCILED')
    return active
  }
)
```

### Factory Selectors for Parameterized Selection

```typescript
// When selector needs a parameter, use factory pattern
export const makeSelectIsSelected = () =>
  createSelector(
    [(state: RootState) => state.status.selectedIds, (_state, id: string) => id],
    (selectedIds, id): boolean => selectedIds.includes(id)
  )

// Usage in component - memoize the factory call
const selectIsSelected = useMemo(makeSelectIsSelected, [])
const isSelected = useAppSelector((state) => selectIsSelected(state, transaction.id))
```

## Anti-Patterns

### WARNING: Storing Server Data in Slices

**The Problem:**

```typescript
// BAD - Duplicating server state in Redux slice
const transactionSlice = createSlice({
  name: 'transactions',
  initialState: { transactions: [], loading: false },
  reducers: {
    setTransactions: (state, action) => {
      state.transactions = action.payload
    },
  },
})
```

**Why This Breaks:**
1. Manual cache invalidation required - easy to forget
2. No automatic refetching on stale data
3. Duplicates RTK Query functionality

**The Fix:**

```typescript
// GOOD - Use RTK Query for server state
const transactionsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTransactions: builder.query({
      query: ({ orgId, accountId }) => `/organizations/${orgId}/accounts/${accountId}/transactions`,
      providesTags: ['Transaction'],
    }),
  }),
})
```

### WARNING: Mutating State Outside Immer

**The Problem:**

```typescript
// BAD - Mutation without Immer context
const items = useAppSelector(state => state.items)
items.push(newItem)  // Mutates Redux state directly!
```

**Why This Breaks:** Redux state must be immutable. Direct mutation bypasses change detection and causes stale UI.

**The Fix:**

```typescript
// GOOD - Dispatch action to mutate via Immer
dispatch(addItem(newItem))