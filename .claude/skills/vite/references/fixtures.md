# Test Fixtures Reference

## Contents
- Mock Data Factories
- Test Utils Setup
- Provider Wrappers
- Common Fixtures
- Factory Functions

## Mock Data Factories

### Account Mock

```typescript
// treasurer/tests/store/accountSlice.test.ts
const mockAccount: Account = {
  id: '1',
  name: 'Checking',
  description: null,
  institution: 'Bank A',
  accountType: 'CHECKING',
  balance: '1000',
  currency: 'USD',
  isActive: true,
  transactionFee: null,
  organizationId: 'org-1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}
```

### Transaction Mock with Status

```typescript
const mockTransaction: TransactionWithStatus = {
  id: 'txn-1',
  accountId: 'acc-1',
  transactionType: 'EXPENSE',
  amount: '100.00',
  description: 'Test transaction',
  date: '2026-01-15',
  feeAmount: null,
  vendorId: null,
  vendorName: null,
  splits: [],
  status: 'UNCLEARED',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
  statusChangedAt: '2026-01-15T10:00:00Z',
  statusChangedBy: 'user-1',
}
```

## Factory Functions

### Configurable Mock Factories

```typescript
// Create mock with overrides
function createMockTransactionWithStatus(
  overrides: Partial<TransactionWithStatus> = {}
): TransactionWithStatus {
  return {
    id: 'txn-1',
    accountId: 'acc-1',
    transactionType: 'EXPENSE',
    amount: '100.00',
    description: 'Test transaction',
    status: 'UNCLEARED',
    ...overrides,
  }
}

// Usage in tests
const clearedTxn = createMockTransactionWithStatus({ status: 'CLEARED' })
const largeTxn = createMockTransactionWithStatus({ amount: '10000.00' })
```

### Store Factory

```typescript
function createMockStore(preloadedState = {}) {
  return configureStore({
    reducer: {
      auth: authReducer,
      organization: organizationReducer,
      status: statusReducer,
      [statusApi.reducerPath]: statusApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(statusApi.middleware),
    preloadedState,
  })
}
```

## Provider Wrappers

### Standard Test Wrapper

```typescript
// treasurer/tests/utils.tsx
export function renderWithProviders(
  ui: ReactElement,
  { store = appStore, ...renderOptions }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <BrowserRouter>{children}</BrowserRouter>
      </Provider>
    )
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { renderWithProviders as render }
```

### API Test Wrapper

```typescript
function createWrapper(store: ReturnType<typeof createTestStore>) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <Provider store={store}>{children}</Provider>
  }
}

// Usage
const { result } = renderHook(() => useBulkSelection(), {
  wrapper: createWrapper(),
})
```

## Common Fixtures

### API Response Fixtures

```typescript
const mockReconciliationSummary: ReconciliationSummary = {
  accountId: 'acc-1',
  accountName: 'Test Account',
  currentBalance: 1000,
  clearedBalance: 800,
  reconciledBalance: 500,
  unclearedBalance: 200,
  pendingTransactionCount: 5,
  clearedTransactionCount: 10,
  reconciledTransactionCount: 15,
  balancesByStatus: [
    { status: 'UNCLEARED', count: 5, income: 100, expense: 300, net: -200 },
    { status: 'CLEARED', count: 10, income: 500, expense: 200, net: 300 },
    { status: 'RECONCILED', count: 15, income: 800, expense: 300, net: 500 },
  ],
  difference: 0,
}
```

### History Entry Fixtures

```typescript
const mockHistoryEntry: StatusHistoryEntry = {
  id: 'history-1',
  transactionId: 'txn-1',
  previousStatus: null,
  newStatus: 'UNCLEARED',
  changedAt: '2026-01-15T10:00:00Z',
  changedBy: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
  },
}
```

## WARNING: Fixture Anti-Patterns

### Avoid Shared Mutable State

```typescript
// BAD - Mutations leak between tests
const mockAccount = { id: '1', name: 'Test' }
mockAccount.name = 'Modified' // Pollutes other tests

// GOOD - Create fresh fixtures
const createMockAccount = () => ({ id: '1', name: 'Test' })
```

### Use Realistic Data

```typescript
// BAD - Placeholder data
const mock = { id: 'x', name: 'xxx', amount: '0' }

// GOOD - Realistic values for debugging
const mock = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Main Checking',
  amount: '1500.50',
}
```

### Keep Fixtures Close to Tests

```typescript
// BAD - Centralized fixtures far from usage
import { mockAccount } from '@/__fixtures__/accounts'

// GOOD - Define inline or in same file
const mockAccount: Account = { ... }
```

## Test Data Checklist

Copy this checklist when creating test fixtures:

- [ ] All required fields are present
- [ ] Types match the actual interface
- [ ] UUIDs use valid format
- [ ] Dates use ISO 8601 format
- [ ] Decimal values are strings (matching Prisma)
- [ ] Factory function exists for configurable mocks