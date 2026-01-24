# Redux Workflows Reference

## Contents
- Store Configuration
- Adding New Slices
- Adding RTK Query Endpoints
- Testing Slices
- Debugging State

## Store Configuration

### Current Store Setup

```typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit'
import { api } from './api/base'
import authReducer from './features/authSlice'
import organizationReducer from './features/organizationSlice'
import statusReducer from './features/statusSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    organization: organizationReducer,
    status: statusReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

### Typed Hooks

```typescript
// store/hooks.ts
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'
import type { RootState, AppDispatch } from './index'

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
```

## Adding New Slices

Copy this checklist and track progress:
- [ ] Step 1: Create slice file in `store/features/`
- [ ] Step 2: Define interface for state shape
- [ ] Step 3: Create initialState with typed defaults
- [ ] Step 4: Add reducers with PayloadAction types
- [ ] Step 5: Export actions and reducer
- [ ] Step 6: Add reducer to store configuration
- [ ] Step 7: Create selectors for accessing state
- [ ] Step 8: Write tests in `tests/store/`

### Example: New Feature Slice

```typescript
// store/features/reconciliationSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface ReconciliationState {
  isActive: boolean
  statementBalance: number | null
  statementDate: string | null
}

const initialState: ReconciliationState = {
  isActive: false,
  statementBalance: null,
  statementDate: null,
}

const reconciliationSlice = createSlice({
  name: 'reconciliation',
  initialState,
  reducers: {
    startReconciliation: (state, action: PayloadAction<{ balance: number; date: string }>) => {
      state.isActive = true
      state.statementBalance = action.payload.balance
      state.statementDate = action.payload.date
    },
    endReconciliation: () => initialState,
  },
})

export const { startReconciliation, endReconciliation } = reconciliationSlice.actions
export default reconciliationSlice.reducer
```

## Adding RTK Query Endpoints

Copy this checklist and track progress:
- [ ] Step 1: Identify resource and HTTP methods needed
- [ ] Step 2: Add endpoint to existing API slice or create new one
- [ ] Step 3: Define query/mutation with proper URL and method
- [ ] Step 4: Add `providesTags` for queries (cache identification)
- [ ] Step 5: Add `invalidatesTags` for mutations (cache invalidation)
- [ ] Step 6: Add optimistic update if needed (onQueryStarted)
- [ ] Step 7: Export generated hooks
- [ ] Step 8: Use hooks in components

### Mutation with Optimistic Update

```typescript
// store/api/transactions.ts
updateTransaction: builder.mutation({
  query: ({ orgId, accountId, transactionId, ...body }) => ({
    url: `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
    method: 'PATCH',
    body,
  }),
  invalidatesTags: (_result, _error, { transactionId }) => [
    { type: 'Transaction', id: transactionId },
  ],
  async onQueryStarted({ orgId, accountId, transactionId, ...patch }, { dispatch, queryFulfilled }) {
    const patchResult = dispatch(
      transactionsApi.util.updateQueryData('getTransactions', { orgId, accountId }, (draft) => {
        const tx = draft.data.find((t) => t.id === transactionId)
        if (tx) Object.assign(tx, patch)
      })
    )
    try {
      await queryFulfilled
    } catch {
      patchResult.undo()
    }
  },
}),
```

## Testing Slices

See the **vitest** skill for test runner configuration.

### Slice Reducer Tests

```typescript
// tests/store/statusSlice.test.ts
import { describe, it, expect } from 'vitest'
import statusReducer, { toggleStatusFilter, toggleSelection } from '@/store/features/statusSlice'

describe('statusSlice', () => {
  const initialState = {
    statusFilter: { uncleared: true, cleared: true, reconciled: false },
    selectedIds: [],
    isSelectAllMode: false,
    excludedIds: [],
  }

  it('toggles status filter', () => {
    const state = statusReducer(initialState, toggleStatusFilter('uncleared'))
    expect(state.statusFilter.uncleared).toBe(false)
  })

  it('toggles selection', () => {
    const state = statusReducer(initialState, toggleSelection('tx-123'))
    expect(state.selectedIds).toContain('tx-123')

    const state2 = statusReducer(state, toggleSelection('tx-123'))
    expect(state2.selectedIds).not.toContain('tx-123')
  })
})
```

### Selector Tests

```typescript
import { describe, it, expect } from 'vitest'
import { selectActiveStatusFilters } from '@/store/features/statusSlice'

describe('selectActiveStatusFilters', () => {
  it('returns only active filters', () => {
    const state = {
      status: {
        statusFilter: { uncleared: true, cleared: false, reconciled: true },
      },
    } as RootState

    const result = selectActiveStatusFilters(state)
    expect(result).toEqual(['UNCLEARED', 'RECONCILED'])
  })
})
```

## Debugging State

### Redux DevTools

1. Install Redux DevTools browser extension
2. DevTools automatically connects via `configureStore`
3. Inspect actions, state diff, and time-travel debug

### Common Issues

**Issue:** Stale data after mutation
**Fix:** Verify `invalidatesTags` matches `providesTags`

```typescript
// Query provides these tags
providesTags: [{ type: 'Transaction', id: 'LIST' }]

// Mutation must invalidate matching tags
invalidatesTags: [{ type: 'Transaction', id: 'LIST' }]
```

**Issue:** Optimistic update not rolling back
**Fix:** Ensure try/catch wraps queryFulfilled

```typescript
async onQueryStarted(arg, { dispatch, queryFulfilled }) {
  const patch = dispatch(/* ... */)
  try {
    await queryFulfilled  // Wait for server response
  } catch {
    patch.undo()  // Must be in catch block
  }
}
```

**Issue:** Selector recalculating on every render
**Fix:** Use createSelector and memoize factory selectors

```typescript
// BAD - New function reference every render
const selectFiltered = (state) => state.items.filter(/* ... */)

// GOOD - Memoized with createSelector
const selectFiltered = createSelector([selectItems], (items) => items.filter(/* ... */))