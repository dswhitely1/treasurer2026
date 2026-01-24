# Unit Testing Reference

## Contents
- Test File Structure
- Component Testing Patterns
- Redux Slice Testing
- Hook Testing
- Common Anti-Patterns

## Test File Structure

This project uses two test locations:
- `treasurer/tests/` - General component and store tests
- `treasurer/src/**/__tests__/` - Feature-specific tests co-located with code

```typescript
// treasurer/tests/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../utils'
import { Button } from '@/components/ui'

describe('Button', () => {
  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

## Component Testing Patterns

### Testing Variants with CVA Components

```typescript
// GOOD - Test actual class application
it('applies primary variant styles by default', () => {
  render(<Button>Primary</Button>)
  const button = screen.getByRole('button')
  expect(button).toHaveClass('bg-blue-600')
})

it('applies secondary variant styles', () => {
  render(<Button variant="secondary">Secondary</Button>)
  const button = screen.getByRole('button')
  expect(button).toHaveClass('bg-gray-600')
})
```

### Testing Conditional Rendering

```typescript
// treasurer/tests/components/accounts/AccountCard.test.tsx
it('shows inactive badge when account is inactive', () => {
  const inactiveAccount = { ...mockAccount, isActive: false }
  render(<AccountCard account={inactiveAccount} orgId={mockOrgId} />)
  expect(screen.getByText('Inactive')).toBeInTheDocument()
})

it('does not show inactive badge when account is active', () => {
  render(<AccountCard account={mockAccount} orgId={mockOrgId} />)
  expect(screen.queryByText('Inactive')).not.toBeInTheDocument()
})
```

### Testing User Interactions

```typescript
// GOOD - Use userEvent for realistic interactions
import userEvent from '@testing-library/user-event'

it('should call onClick when clicked', async () => {
  const user = userEvent.setup()
  const handleClick = vi.fn()

  render(<TransactionStatusBadge interactive onClick={handleClick} />)
  await user.click(screen.getByRole('button'))

  expect(handleClick).toHaveBeenCalledTimes(1)
})
```

## Redux Slice Testing

```typescript
// treasurer/tests/store/accountSlice.test.ts
import accountReducer, { selectAccount, clearAccounts } from '@/store/features/accountSlice'

describe('accountSlice', () => {
  it('should return initial state', () => {
    const result = accountReducer(undefined, { type: 'unknown' })

    expect(result.accounts).toEqual([])
    expect(result.selectedAccount).toBeNull()
    expect(result.isLoading).toBe(false)
  })

  it('should handle selectAccount', () => {
    const result = accountReducer(initialState, selectAccount(mockAccount))
    expect(result.selectedAccount).toEqual(mockAccount)
  })

  it('should preserve accounts when selecting account', () => {
    const stateWithAccounts = { ...initialState, accounts: [mockAccount] }
    const result = accountReducer(stateWithAccounts, selectAccount(mockAccount))

    expect(result.accounts).toEqual([mockAccount])
    expect(result.selectedAccount).toEqual(mockAccount)
  })
})
```

## Hook Testing

```typescript
// Use renderHook from @testing-library/react
import { renderHook, act } from '@testing-library/react'

describe('useBulkSelection', () => {
  it('should toggle selection', () => {
    const { result } = renderHook(() => useBulkSelection(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.toggle('txn-1')
    })

    expect(result.current.selectedIds).toContain('txn-1')
  })
})
```

## WARNING: Common Anti-Patterns

### Avoid Testing Implementation Details

```typescript
// BAD - Testing internal state structure
expect(store.getState().status.selectedIds).toContain('txn-1')

// GOOD - Test through public interface
expect(result.current.isSelected('txn-1')).toBe(true)
```

### Never Use Snapshot Testing for Dynamic Content

```typescript
// BAD - Brittle, fails on any text change
expect(component).toMatchSnapshot()

// GOOD - Assert specific behaviors
expect(screen.getByText('$1,500.50')).toBeInTheDocument()
```

### Use Custom Render with Providers

```typescript
// BAD - Missing Redux/Router providers
render(<AccountCard account={mockAccount} />)

// GOOD - Use custom render from tests/utils.tsx
import { render } from '../utils'
render(<AccountCard account={mockAccount} orgId={mockOrgId} />)
```

See the **vitest** skill for test configuration details.