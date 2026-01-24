# State Management Reference

## Contents
- State Categories
- Redux Slice Structure
- Selector Patterns
- State Anti-Patterns

## State Categories

| Type | Tool | Example |
|------|------|---------|
| **Server State** | RTK Query | Transactions, accounts, user data |
| **Client State** | Redux slices | Filters, selections, UI state |
| **UI State** | useState | Expanded rows, modals, form inputs |
| **URL State** | React Router | Filters, pagination, active tab |

## Redux Slice Structure

Location: `treasurer/src/store/features/`

### Auth Slice

```typescript
// treasurer/src/store/features/authSlice.ts
interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      localStorage.removeItem('token')
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.loading = false
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})
```

### Status Slice (Bulk Selection)

```typescript
// treasurer/src/store/features/statusSlice.ts
interface StatusState {
  statusFilter: {
    uncleared: boolean
    cleared: boolean
    reconciled: boolean
  }
  selectedIds: string[]
  isSelectAllMode: boolean
  excludedIds: string[]
  reconciliation: {
    isActive: boolean
    statementBalance: number | null
    statementDate: string | null
  }
}

const statusSlice = createSlice({
  name: 'status',
  initialState,
  reducers: {
    toggleStatusFilter: (state, action: PayloadAction<keyof StatusState['statusFilter']>) => {
      state.statusFilter[action.payload] = !state.statusFilter[action.payload]
    },
    toggleSelection: (state, action: PayloadAction<string>) => {
      const id = action.payload
      if (state.isSelectAllMode) {
        const index = state.excludedIds.indexOf(id)
        if (index === -1) {
          state.excludedIds.push(id)
        } else {
          state.excludedIds.splice(index, 1)
        }
      } else {
        const index = state.selectedIds.indexOf(id)
        if (index === -1) {
          state.selectedIds.push(id)
        } else {
          state.selectedIds.splice(index, 1)
        }
      }
    },
    clearSelection: (state) => {
      state.selectedIds = []
      state.excludedIds = []
      state.isSelectAllMode = false
    },
  },
})
```

## Selector Patterns

### Memoized Selectors with createSelector

```typescript
import { createSelector } from '@reduxjs/toolkit'

// Base selectors
const selectStatusFilter = (state: RootState) => state.status.statusFilter

// Memoized derived selector
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
// Create new selector instance per component
export const makeSelectIsSelected = () =>
  createSelector(
    [
      (state: RootState) => state.status.selectedIds,
      (state: RootState) => state.status.isSelectAllMode,
      (state: RootState) => state.status.excludedIds,
      (_: RootState, id: string) => id,
    ],
    (selectedIds, isSelectAllMode, excludedIds, id): boolean => {
      if (isSelectAllMode) return !excludedIds.includes(id)
      return selectedIds.includes(id)
    }
  )

// Usage in component
function TransactionRow({ id }: Props) {
  const selectIsSelected = useMemo(makeSelectIsSelected, [])
  const isSelected = useAppSelector(state => selectIsSelected(state, id))
}
```

## State Anti-Patterns

### WARNING: Server State in Redux Slices

**The Problem:**

```typescript
// BAD - Manual server state management
const transactionSlice = createSlice({
  name: 'transactions',
  initialState: { items: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, ...)
      .addCase(fetchTransactions.fulfilled, ...)
      .addCase(fetchTransactions.rejected, ...)
  },
})
```

**Why This Breaks:**
1. No automatic caching
2. No request deduplication
3. Manual loading/error state management
4. No automatic refetch on focus/reconnect

**The Fix:**

Use RTK Query for server state. Redux slices for client-only state.

### WARNING: Deriving State Instead of Computing

**The Problem:**

```typescript
// BAD - Derived state stored
const [transactions, setTransactions] = useState([])
const [filteredTransactions, setFilteredTransactions] = useState([])

useEffect(() => {
  setFilteredTransactions(transactions.filter(t => t.status === filter))
}, [transactions, filter])
```

**The Fix:**

```typescript
// GOOD - Compute during render or use createSelector
const filteredTransactions = useMemo(
  () => transactions.filter(t => t.status === filter),
  [transactions, filter]
)