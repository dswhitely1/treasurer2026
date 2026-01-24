# Test Fixtures Reference

## Contents
- Test Factories
- Setup Utilities
- Mock Data Patterns
- Custom Render
- Anti-Patterns

## Test Factories

Create consistent test data with factory functions.

```typescript
// treasurer-api/tests/helpers/testFactories.ts
import { prisma } from '@/config/database.js'
import bcrypt from 'bcryptjs'

export interface TestUser {
  id: string
  email: string
  password: string
  name: string
  token?: string
}

export async function createTestUser(
  overrides?: Partial<{ email: string; password: string; name: string }>
): Promise<TestUser> {
  const email = overrides?.email ?? `test-${Date.now()}@example.com`
  const password = overrides?.password ?? 'Password123'
  const name = overrides?.name ?? 'Test User'

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name },
  })

  return { id: user.id, email, password, name }
}

export async function createTestOrganization(
  userId: string,
  overrides?: Partial<{ name: string; role: 'OWNER' | 'ADMIN' | 'MEMBER' }>
): Promise<{ id: string; name: string }> {
  const name = overrides?.name ?? 'Test Organization'
  const role = overrides?.role ?? 'OWNER'

  const org = await prisma.organization.create({
    data: { name },
  })

  await prisma.organizationMember.create({
    data: { userId, organizationId: org.id, role },
  })

  return { id: org.id, name }
}

export async function createTestAccount(
  organizationId: string,
  overrides?: Partial<{ name: string; balance: number; accountType: string }>
) {
  return prisma.account.create({
    data: {
      name: overrides?.name ?? 'Test Account',
      balance: overrides?.balance ?? 1000,
      accountType: overrides?.accountType ?? 'CHECKING',
      organizationId,
    },
  })
}
```

### Full Setup Factory

```typescript
// Create complete test environment in one call
export async function createFullTestSetup(overrides?: {
  email?: string
  orgName?: string
  accountBalance?: number
}): Promise<{
  user: TestUser
  organization: { id: string; name: string }
  account: { id: string; name: string; balance: number }
  transaction: { id: string; amount: number }
}> {
  const user = await createTestUser({ email: overrides?.email })
  const organization = await createTestOrganization(user.id, {
    name: overrides?.orgName,
  })
  const account = await createTestAccount(organization.id, {
    balance: overrides?.accountBalance,
  })
  const transaction = await createTestTransaction(account.id)

  return { user, organization, account, transaction }
}

// Usage
const { user, orgId, accountId, transactionId } = await createFullTestSetup({
  accountBalance: 5000,
})
```

## Setup Utilities

API test helpers that handle auth flow.

```typescript
// treasurer-api/tests/helpers/testUtils.ts
import request from 'supertest'
import type { Express } from 'express'

export async function registerAndLogin(
  app: Express,
  userData?: { email?: string; password?: string }
): Promise<{ token: string; userId: string; email: string }> {
  const email = userData?.email ?? `user-${Date.now()}@example.com`
  const password = userData?.password ?? 'Password123'

  const response = await request(app)
    .post('/api/auth/register')
    .send({ email, password, name: 'Test User' })

  if (response.status !== 201) {
    throw new Error(`Registration failed: ${response.body.message}`)
  }

  return {
    token: response.body.data.token,
    userId: response.body.data.user.id,
    email,
  }
}

export async function setupTestEnvironment(app: Express): Promise<{
  token: string
  userId: string
  orgId: string
  accountId: string
  transactionId: string
}> {
  const { token, userId } = await registerAndLogin(app)

  const orgRes = await request(app)
    .post('/api/organizations')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Org' })

  const orgId = orgRes.body.data.id

  const accountRes = await request(app)
    .post(`/api/organizations/${orgId}/accounts`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Account', accountType: 'CHECKING', balance: 1000 })

  const accountId = accountRes.body.data.account.id

  const txRes = await request(app)
    .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      description: 'Test Transaction',
      amount: 100,
      transactionType: 'EXPENSE',
      splits: [{ amount: 100, categoryName: 'Test' }],
    })

  return {
    token,
    userId,
    orgId,
    accountId,
    transactionId: txRes.body.data.transaction.id,
  }
}
```

## Mock Data Patterns

Frontend mock objects for component tests.

```typescript
// treasurer/tests/mocks/accounts.ts
import type { Account } from '@/types'

export const mockCheckingAccount: Account = {
  id: 'acc-1',
  name: 'Main Checking',
  balance: '1500.50',
  accountType: 'CHECKING',
  institution: 'First Bank',
  currency: 'USD',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-15T00:00:00Z',
}

export const mockSavingsAccount: Account = {
  ...mockCheckingAccount,
  id: 'acc-2',
  name: 'Savings',
  accountType: 'SAVINGS',
  balance: '10000.00',
}

export const mockCreditCard: Account = {
  ...mockCheckingAccount,
  id: 'acc-3',
  name: 'Visa Card',
  accountType: 'CREDIT_CARD',
  balance: '-500.00', // Credit cards show negative (owed)
}
```

## Custom Render

Wrap components with required providers for testing.

```typescript
// treasurer/tests/utils.tsx
import { render, type RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store as appStore, type AppStore } from '@/store'
import type { ReactElement, ReactNode } from 'react'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  store?: AppStore
}

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
// Override render with our custom version
export { renderWithProviders as render }
```

### Usage

```typescript
// Import from utils, not @testing-library/react
import { render, screen, fireEvent } from '../utils'

it('renders with Redux state', () => {
  render(<AccountCard account={mockAccount} orgId="org-1" />)
  expect(screen.getByText('Main Checking')).toBeInTheDocument()
})
```

## WARNING: Fixture Anti-Patterns

### Fixtures with Hidden Dependencies

**The Problem:**

```typescript
// BAD - Factory creates hidden side effects
export async function createTestUser() {
  const user = await prisma.user.create({ ... })
  
  // Hidden: also creates org and account!
  await prisma.organization.create({ ... })
  await prisma.account.create({ ... })
  
  return user
}
```

**Why This Breaks:**
1. Tests rely on hidden data they didn't request
2. Cleanup becomes unpredictable
3. Test changes break unrelated tests

**The Fix:**

```typescript
// GOOD - Explicit composition
export async function createTestUser() { /* only user */ }
export async function createTestOrg(userId: string) { /* only org */ }
export async function createFullSetup() { 
  const user = await createTestUser()
  const org = await createTestOrg(user.id)
  return { user, org }
}
```

### Shared Mutable Fixtures

**The Problem:**

```typescript
// BAD - Same object mutated across tests
const mockUser = { id: '1', name: 'Test' }

it('updates name', () => {
  mockUser.name = 'Updated'  // Mutates shared fixture!
  // ...
})

it('uses original name', () => {
  expect(mockUser.name).toBe('Test')  // Fails!
})
```

**The Fix:**

```typescript
// GOOD - Create fresh copies
const createMockUser = () => ({ id: '1', name: 'Test' })

it('updates name', () => {
  const user = createMockUser()
  user.name = 'Updated'
})

it('uses original name', () => {
  const user = createMockUser()
  expect(user.name).toBe('Test')  // Passes
})
```

## Fixture Setup Checklist

Copy this checklist:
- [ ] Create factory functions for each entity
- [ ] Support overrides for customization
- [ ] Use unique identifiers (timestamps, counters)
- [ ] Document what each factory creates
- [ ] Avoid hidden side effects
- [ ] Clean up in `beforeEach`, not factories