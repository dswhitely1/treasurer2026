# Mocking Reference

## Contents
- vi.fn() Mock Functions
- Middleware Mocking
- MSW for API Mocking
- Module Mocking
- Anti-Patterns

## vi.fn() Mock Functions

Create mock functions to verify calls and control return values.

```typescript
// Basic mock function
const handleClick = vi.fn()
render(<Button onClick={handleClick}>Click</Button>)
fireEvent.click(screen.getByRole('button'))

expect(handleClick).toHaveBeenCalledOnce()
expect(handleClick).toHaveBeenCalledWith(expect.any(Object)) // Event object
```

### Mock Return Values

```typescript
const mockFetch = vi.fn()
  .mockResolvedValueOnce({ data: 'first call' })
  .mockResolvedValueOnce({ data: 'second call' })
  .mockRejectedValueOnce(new Error('Network error'))

await mockFetch() // { data: 'first call' }
await mockFetch() // { data: 'second call' }
await mockFetch() // throws Error('Network error')
```

### Mock Implementation

```typescript
const mockCalculate = vi.fn().mockImplementation((a: number, b: number) => {
  return a + b
})

expect(mockCalculate(2, 3)).toBe(5)
expect(mockCalculate).toHaveBeenCalledWith(2, 3)
```

## Middleware Mocking

Test Express middleware by mocking `req`, `res`, and `next`.

```typescript
// treasurer-api/tests/middleware/transactionProtection.test.ts
import { preventReconciledModification } from '@/middleware/transactionProtection.js'

describe('preventReconciledModification', () => {
  it('allows modification of UNCLEARED transactions', async () => {
    const req = {
      params: { transactionId: unclearedTxId },
    } as unknown as Request

    const res = {} as Response
    const next = vi.fn() as NextFunction

    const middleware = preventReconciledModification()
    await middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledWith() // Called without error
  })

  it('blocks modification of RECONCILED transactions', async () => {
    const req = {
      params: { transactionId: reconciledTxId },
    } as unknown as Request

    const res = {} as Response
    const next = vi.fn() as NextFunction

    const middleware = preventReconciledModification()
    await middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    const error = next.mock.calls[0]?.[0]
    expect(error).toHaveProperty('message', 'Cannot modify reconciled transactions')
    expect(error).toHaveProperty('statusCode', 400)
  })
})
```

## MSW for API Mocking

Frontend tests use Mock Service Worker for API responses.

```typescript
// treasurer/tests/setup.ts
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'

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

### Adding Handlers

```typescript
import { http, HttpResponse } from 'msw'
import { server } from '../setup'

it('displays fetched accounts', async () => {
  server.use(
    http.get('/api/organizations/:orgId/accounts', () => {
      return HttpResponse.json({
        success: true,
        data: {
          accounts: [
            { id: '1', name: 'Checking', balance: '1000.00' },
          ],
        },
      })
    })
  )

  render(<AccountList orgId="org-1" />)
  
  await waitFor(() => {
    expect(screen.getByText('Checking')).toBeInTheDocument()
  })
})
```

### Error Responses

```typescript
it('shows error state on API failure', async () => {
  server.use(
    http.get('/api/organizations/:orgId/accounts', () => {
      return HttpResponse.json(
        { success: false, message: 'Server error' },
        { status: 500 }
      )
    })
  )

  render(<AccountList orgId="org-1" />)
  
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })
})
```

## Module Mocking

Mock entire modules when needed (use sparingly).

```typescript
// Mock a utility module
vi.mock('@/lib/api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'mocked' }),
}))

// Mock with factory
vi.mock('@/config/database', async () => {
  const actual = await vi.importActual('@/config/database')
  return {
    ...actual,
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
    },
  }
})
```

## WARNING: Mocking Anti-Patterns

### Over-Mocking (Testing Mocks, Not Code)

**The Problem:**

```typescript
// BAD - Everything is mocked
vi.mock('@/services/userService')
vi.mock('@/services/authService')
vi.mock('@/config/database')

it('creates user', async () => {
  const mockCreate = vi.fn().mockResolvedValue({ id: '1' })
  ;(userService.create as Mock).mockImplementation(mockCreate)
  
  await createUser({ email: 'test@test.com' })
  
  expect(mockCreate).toHaveBeenCalled() // Tests the mock, not the code!
})
```

**Why This Breaks:**
1. Real implementation bugs go undetected
2. Tests pass but production fails
3. Refactoring breaks tests without breaking behavior

**The Fix:**

```typescript
// GOOD - Use real database, mock only external services
describe('UserService', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany()
  })

  it('creates user in database', async () => {
    const result = await userService.create({
      email: 'test@test.com',
      password: 'Password123',
    })

    // Verify actual database state
    const user = await prisma.user.findUnique({
      where: { email: 'test@test.com' },
    })
    expect(user).toBeDefined()
    expect(user?.email).toBe('test@test.com')
  })
})
```

### Mocking Implementation Details

**The Problem:**

```typescript
// BAD - Mocking internal function
vi.mock('@/utils/helpers', () => ({
  formatDate: vi.fn().mockReturnValue('2026-01-23'),
}))

it('displays formatted date', () => {
  render(<DateDisplay date={new Date()} />)
  expect(formatDate).toHaveBeenCalled() // Testing implementation
})
```

**The Fix:**

```typescript
// GOOD - Test the output, not internal calls
it('displays formatted date', () => {
  render(<DateDisplay date={new Date('2026-01-23')} />)
  expect(screen.getByText('January 23, 2026')).toBeInTheDocument()
})
```

### Forgetting to Reset Mocks

**The Problem:**

```typescript
// BAD - Mock state leaks between tests
vi.mock('@/api/client')

it('test 1', () => {
  (apiClient.get as Mock).mockResolvedValue({ status: 'ok' })
  // ...
})

it('test 2', () => {
  // Still has mock from test 1!
  // ...
})
```

**The Fix:**

```typescript
// GOOD - Reset in afterEach
afterEach(() => {
  vi.resetAllMocks()
})

// Or use restoreMocks in config
// vitest.config.ts
export default defineConfig({
  test: {
    restoreMocks: true,
  },
})
```

## Mock Assertions

| Pattern | Checks |
|---------|--------|
| `toHaveBeenCalled()` | Called at least once |
| `toHaveBeenCalledOnce()` | Called exactly once |
| `toHaveBeenCalledTimes(n)` | Called n times |
| `toHaveBeenCalledWith(a, b)` | Specific arguments |
| `toHaveBeenLastCalledWith(a)` | Last call arguments |
| `toHaveReturned()` | Returned (not threw) |
| `toHaveReturnedWith(x)` | Specific return value |

## When to Mock

| Mock | Don't Mock |
|------|------------|
| External APIs | Database (use test DB) |
| Time (`vi.useFakeTimers`) | Internal modules |
| Browser APIs in Node | Business logic |
| Third-party services | Pure functions |