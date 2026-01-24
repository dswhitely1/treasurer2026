# Mocking Reference

## Contents
- Vitest Mock Functions
- MSW for API Mocking
- Module Mocking
- Timer Mocking
- Redux Store Mocking

## Vitest Mock Functions

```typescript
import { describe, it, expect, vi } from 'vitest'

// Create mock function
const handleClick = vi.fn()

// Assert calls
expect(handleClick).toHaveBeenCalledTimes(1)
expect(handleClick).toHaveBeenCalledWith(mockAccount)

// Mock return values
const mockFn = vi.fn().mockReturnValue('test')
const asyncMockFn = vi.fn().mockResolvedValue({ data: [] })
```

### Spy on Object Methods

```typescript
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

// After test
consoleSpy.mockRestore()
```

## MSW for API Mocking

### Basic Handler

```typescript
import { http, HttpResponse } from 'msw'

server.use(
  http.get('/api/organizations/:orgId/accounts', () => {
    return HttpResponse.json({
      success: true,
      data: { accounts: [mockAccount] },
    })
  })
)
```

### Dynamic Response Based on Request

```typescript
server.use(
  http.patch('/api/.../transactions/:id/status', async ({ request }) => {
    const body = await request.json() as { newStatus: string }
    return HttpResponse.json({
      success: true,
      transaction: { ...mockTransaction, status: body.newStatus },
    })
  })
)
```

### Error Responses

```typescript
server.use(
  http.get('/api/users', () => {
    return HttpResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: 401 }
    )
  })
)
```

### Override Handler for Single Test

```typescript
it('handles error case', async () => {
  // This overrides the default handler
  server.use(
    http.get('/api/accounts', () => {
      return HttpResponse.json({ error: 'Failed' }, { status: 500 })
    })
  )
  // Test error behavior
})
```

## Module Mocking

```typescript
// Mock entire module
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: { id: '123' } }),
  },
}))

// Mock specific export
vi.mock('@/hooks/useLocalStorage', () => ({
  useLocalStorage: vi.fn(() => ['value', vi.fn()]),
}))
```

## Timer Mocking

```typescript
import { vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('debounces input', async () => {
  render(<SearchInput />)
  
  fireEvent.change(input, { target: { value: 'test' } })
  
  // Fast-forward debounce timer
  vi.advanceTimersByTime(300)
  
  expect(onSearch).toHaveBeenCalledWith('test')
})
```

## Redux Store Mocking

### Custom Test Store

```typescript
// treasurer/tests/utils.tsx
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { store as appStore } from '@/store'

export function renderWithProviders(
  ui: ReactElement,
  { store = appStore, ...renderOptions } = {}
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
```

### Preloaded State

```typescript
const customStore = configureStore({
  reducer: rootReducer,
  preloadedState: {
    auth: { user: mockUser, isAuthenticated: true },
    organization: { activeOrganizationId: 'org-1' },
  },
})

render(<Dashboard />, { store: customStore })
```

## WARNING: Anti-Patterns

### Don't Mock What You Don't Own

```typescript
// BAD - Mocking React internals
vi.mock('react', () => ({ useState: vi.fn() }))

// GOOD - Mock your own modules
vi.mock('@/lib/api')
```

### Reset Mocks Between Tests

```typescript
afterEach(() => {
  vi.clearAllMocks()
  server.resetHandlers()
})
```

### Avoid Over-Mocking

```typescript
// BAD - Testing mock implementation
vi.mock('@/services/auth')
expect(authService.login).toHaveBeenCalled() // Testing mock, not real code

// GOOD - Mock only external boundaries
server.use(http.post('/api/auth/login', ...))
// Test actual behavior through UI
```

See the **vitest** skill for test configuration.