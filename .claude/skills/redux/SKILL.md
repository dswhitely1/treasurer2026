---
name: redux
description: |
  Handles Redux Toolkit state management and RTK Query for API caching.
  Use when: Creating slices, configuring store, managing client state, setting up API caching with RTK Query, implementing optimistic updates, or debugging state issues.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Redux Skill

Redux Toolkit powers this project's state management with a clear separation: RTK Query handles server state (API caching, optimistic updates), while Redux slices manage client state (UI state, filters, selections). Store is at `treasurer/src/store/`, slices at `store/features/`, and API endpoints at `store/api/`.

## Quick Start

### Creating a Slice

```typescript
// store/features/statusSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface StatusState {
  statusFilter: { uncleared: boolean; cleared: boolean; reconciled: boolean }
  selectedIds: string[]
}

const initialState: StatusState = {
  statusFilter: { uncleared: true, cleared: true, reconciled: false },
  selectedIds: [],
}

const statusSlice = createSlice({
  name: 'status',
  initialState,
  reducers: {
    toggleStatusFilter: (state, action: PayloadAction<keyof StatusState['statusFilter']>) => {
      state.statusFilter[action.payload] = !state.statusFilter[action.payload]
    },
    toggleSelection: (state, action: PayloadAction<string>) => {
      const idx = state.selectedIds.indexOf(action.payload)
      idx === -1 ? state.selectedIds.push(action.payload) : state.selectedIds.splice(idx, 1)
    },
  },
})

export const { toggleStatusFilter, toggleSelection } = statusSlice.actions
export default statusSlice.reducer
```

### RTK Query Endpoint

```typescript
// store/api/transactions.ts
import { api } from './base'

export const transactionsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTransactions: builder.query({
      query: ({ orgId, accountId }) =>
        `/organizations/${orgId}/accounts/${accountId}/transactions`,
      providesTags: (result) =>
        result?.data
          ? [...result.data.map(({ id }) => ({ type: 'Transaction' as const, id })), { type: 'Transaction', id: 'LIST' }]
          : [{ type: 'Transaction', id: 'LIST' }],
    }),
  }),
})

export const { useGetTransactionsQuery } = transactionsApi
```

## Key Concepts

| Concept | Usage | Location |
|---------|-------|----------|
| Store | Single source of truth | `store/index.ts` |
| Slice | Feature-specific reducer + actions | `store/features/*.ts` |
| RTK Query | Server state caching | `store/api/*.ts` |
| Typed hooks | `useAppDispatch`, `useAppSelector` | `store/hooks.ts` |

## Common Patterns

### Optimistic Updates with Rollback

**When:** Status changes need instant UI feedback

```typescript
updateTransactionStatus: builder.mutation({
  query: ({ orgId, accountId, transactionId, status }) => ({
    url: `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
    method: 'PATCH',
    body: { status },
  }),
  async onQueryStarted({ transactionId, status }, { dispatch, queryFulfilled, getState }) {
    const patchResult = dispatch(
      transactionsApi.util.updateQueryData('getTransactions', { orgId, accountId }, (draft) => {
        const tx = draft.data.find((t) => t.id === transactionId)
        if (tx) tx.status = status
      })
    )
    try {
      await queryFulfilled
    } catch {
      patchResult.undo()
    }
  },
})
```

## See Also

- [patterns](references/patterns.md)
- [workflows](references/workflows.md)

## Related Skills

- **react** - Component patterns that consume Redux state
- **typescript** - Type definitions for slices and selectors
- **zod** - Validation schemas shared between API and store

## Documentation Resources

> Fetch latest Redux Toolkit documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "redux toolkit"
2. Prefer website documentation (IDs starting with `/websites/`) over source code
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/reduxjs/redux-toolkit` _(resolve using mcp__context7__resolve-library-id)_

**Recommended Queries:**
- "createSlice best practices"
- "RTK Query optimistic updates"
- "configureStore middleware"