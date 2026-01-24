# Unit Testing Reference

## Contents
- Service Layer Tests
- Redux Slice Tests
- React Component Tests
- Common Assertions
- Anti-Patterns

## Service Layer Tests

Test business logic in isolation with real database operations.

```typescript
// treasurer-api/tests/services/transactionStatusService.test.ts
describe('changeTransactionStatus', () => {
  let userId: string
  let orgId: string
  let accountId: string
  let transactionId: string

  beforeEach(async () => {
    const setup = await createFullTestSetup()
    userId = setup.user.id
    orgId = setup.organization.id
    accountId = setup.account.id
    transactionId = setup.transaction.id
  })

  it('changes status from UNCLEARED to CLEARED', async () => {
    const result = await changeTransactionStatus(
      orgId, accountId, transactionId, userId,
      { status: 'CLEARED' }
    )
    
    expect(result.fromStatus).toBe('UNCLEARED')
    expect(result.toStatus).toBe('CLEARED')
    expect(result.changedById).toBe(userId)
  })

  it('rejects invalid state transitions', async () => {
    await expect(
      changeTransactionStatus(orgId, accountId, transactionId, userId, {
        status: 'RECONCILED', // Cannot skip CLEARED
      })
    ).rejects.toThrow('Invalid status transition from UNCLEARED to RECONCILED')
  })
})
```

## Redux Slice Tests

Test reducers and selectors in isolation. See the **redux** skill for advanced patterns.

```typescript
// treasurer/tests/store/accountSlice.test.ts
import { accountReducer, selectAccount, clearSelectedAccount } from '@/store/features/accountSlice'

const mockAccount = {
  id: '1',
  name: 'Checking',
  balance: '1500.00',
  accountType: 'CHECKING' as const,
}

describe('accountSlice', () => {
  it('returns initial state', () => {
    const result = accountReducer(undefined, { type: 'unknown' })
    expect(result.accounts).toEqual([])
    expect(result.selectedAccount).toBeNull()
  })

  it('handles selectAccount', () => {
    const result = accountReducer(initialState, selectAccount(mockAccount))
    expect(result.selectedAccount).toEqual(mockAccount)
  })

  it('preserves accounts when selecting', () => {
    const stateWithAccounts = {
      ...initialState,
      accounts: [mockAccount],
    }
    const result = accountReducer(stateWithAccounts, selectAccount(mockAccount))
    expect(result.accounts).toHaveLength(1)
  })
})
```

## React Component Tests

Use custom `render` from `tests/utils.tsx` for Redux and Router context.

```typescript
// treasurer/tests/components/Button.test.tsx
import { render, screen, fireEvent } from '../utils'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-red-600')
  })

  it('disables button correctly', () => {
    render(<Button disabled>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

## Common Assertions

| Pattern | Usage |
|---------|-------|
| `expect(x).toBe(y)` | Strict equality (primitives) |
| `expect(x).toEqual(y)` | Deep equality (objects/arrays) |
| `expect(x).toBeNull()` | Null check |
| `expect(x).toBeDefined()` | Not undefined |
| `expect(x).toHaveLength(n)` | Array/string length |
| `expect(fn).toThrow('msg')` | Error throwing |
| `expect(fn).toHaveBeenCalledWith(...)` | Mock arguments |

### Testing Library Assertions

```typescript
expect(screen.getByRole('button')).toBeInTheDocument()
expect(screen.getByText('Hello')).toBeVisible()
expect(input).toHaveValue('test')
expect(button).toBeDisabled()
expect(element).toHaveClass('active')
```

## WARNING: Common Anti-Patterns

### Testing Implementation Details

**The Problem:**

```typescript
// BAD - Tests internal state
it('sets loading to true', () => {
  const { result } = renderHook(() => useData())
  expect(result.current.loading).toBe(true)
})
```

**Why This Breaks:**
1. Refactoring internals breaks tests
2. Tests don't verify user-visible behavior
3. False confidence - implementation works, behavior doesn't

**The Fix:**

```typescript
// GOOD - Tests observable behavior
it('shows loading indicator while fetching', async () => {
  render(<DataList />)
  expect(screen.getByText('Loading...')).toBeInTheDocument()
  await waitFor(() => {
    expect(screen.getByText('Item 1')).toBeInTheDocument()
  })
})
```

### Missing Cleanup Between Tests

**The Problem:**

```typescript
// BAD - Tests affect each other
describe('UserService', () => {
  it('creates user', async () => {
    await createUser({ email: 'test@example.com' })
  })
  
  it('fails on duplicate email', async () => {
    // This passes only because previous test ran first!
    await expect(createUser({ email: 'test@example.com' }))
      .rejects.toThrow()
  })
})
```

**The Fix:**

```typescript
// GOOD - Each test is isolated
beforeEach(async () => {
  await prisma.user.deleteMany()
})

it('fails on duplicate email', async () => {
  await createUser({ email: 'test@example.com' })
  await expect(createUser({ email: 'test@example.com' }))
    .rejects.toThrow('Duplicate entry')
})
```

## Test Workflow

Copy this checklist:
- [ ] Write failing test first (red)
- [ ] Implement minimal code to pass (green)
- [ ] Refactor while tests pass
- [ ] Run `pnpm test` to verify
- [ ] Check coverage with `pnpm test:coverage`