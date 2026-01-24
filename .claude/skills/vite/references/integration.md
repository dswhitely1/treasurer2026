# Integration Testing Reference

## Contents
- RTK Query API Testing
- MSW Server Setup
- Testing Async Workflows
- Cache Invalidation Testing
- Error Handling

## RTK Query API Testing

Integration tests for RTK Query require a test store and MSW for mocking:

```typescript
// treasurer/src/features/status/api/__tests__/statusApi.test.tsx
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { statusApi, useGetTransactionsWithStatusQuery } from '../statusApi'

const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

// Create store with RTK Query middleware
function createTestStore() {
  return configureStore({
    reducer: {
      [statusApi.reducerPath]: statusApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(statusApi.middleware),
  })
}
```

## MSW Server Setup

Global setup in `treasurer/tests/setup.ts`:

```typescript
import '@testing-library/jest-dom'
import { afterEach, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'

export const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
```

## Testing Async Workflows

### Query Success

```typescript
it('should fetch transactions with status', async () => {
  server.use(
    http.get(`/api/organizations/:orgId/accounts/:accountId/transactions`, () => {
      return HttpResponse.json({
        success: true,
        data: {
          transactions: [mockTransaction],
          total: 1,
          counts: { UNCLEARED: 1, CLEARED: 0, RECONCILED: 0 },
        },
      })
    })
  )

  const store = createTestStore()
  const { result } = renderHook(
    () => useGetTransactionsWithStatusQuery({ orgId: 'org-1', accountId: 'acc-1' }),
    { wrapper: createWrapper(store) }
  )

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true)
  })

  expect(result.current.data?.transactions).toHaveLength(1)
})
```

### Mutation with Optimistic Update

```typescript
it('should perform optimistic update', async () => {
  server.use(
    http.get(`/api/organizations/:orgId/accounts/:accountId/transactions`, () => {
      return HttpResponse.json({
        success: true,
        data: { transactions: [mockTransaction] },
      })
    }),
    http.patch(`/api/.../transactions/:transactionId/status`, async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      return HttpResponse.json({
        success: true,
        transaction: { ...mockTransaction, status: 'CLEARED' },
      })
    })
  )

  // Fetch initial data, then mutate
  const [changeStatus] = result.current
  await changeStatus({ transactionId: 'txn-1', newStatus: 'CLEARED' })

  await waitFor(() => {
    expect(mutationResult.current[1].isSuccess).toBe(true)
  })
})
```

## Cache Invalidation Testing

```typescript
it('should invalidate transaction list after status change', async () => {
  let fetchCount = 0

  server.use(
    http.get(`/api/.../transactions`, () => {
      fetchCount++
      return HttpResponse.json({ success: true, data: { transactions: [] } })
    }),
    http.patch(`/api/.../transactions/:id/status`, () => {
      return HttpResponse.json({ success: true })
    })
  )

  // Initial fetch
  await waitFor(() => expect(queryResult.current.isSuccess).toBe(true))
  expect(fetchCount).toBe(1)

  // Mutation should trigger refetch
  await changeStatus({ transactionId: 'txn-1', newStatus: 'CLEARED' })

  await waitFor(() => {
    expect(fetchCount).toBeGreaterThan(1)
  })
})
```

## Error Handling

```typescript
it('should handle API errors', async () => {
  server.use(
    http.get(`/api/.../transactions`, () => {
      return HttpResponse.json(
        { success: false, message: 'Not found' },
        { status: 404 }
      )
    })
  )

  const { result } = renderHook(
    () => useGetTransactionsWithStatusQuery({ orgId: 'org-1', accountId: 'acc-1' }),
    { wrapper: createWrapper(store) }
  )

  await waitFor(() => {
    expect(result.current.isError).toBe(true)
  })

  expect(result.current.error).toBeDefined()
})
```

## WARNING: Avoid These Mistakes

### Don't Forget to Reset Handlers

```typescript
// BAD - Handlers leak between tests
beforeAll(() => server.listen())

// GOOD - Reset after each test
afterEach(() => server.resetHandlers())
```

### Use Proper Wait Strategies

```typescript
// BAD - Arbitrary timeout
await new Promise(resolve => setTimeout(resolve, 500))

// GOOD - Wait for specific condition
await waitFor(() => expect(result.current.isSuccess).toBe(true))
```

See the **vitest** skill for more testing configuration.