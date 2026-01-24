# Integration Testing Reference

## Contents
- API Endpoint Testing
- Database Integration
- Full Flow Tests
- Test Utilities
- Anti-Patterns

## API Endpoint Testing

Use Supertest to test Express routes against real database.

```typescript
// treasurer-api/tests/routes/auth.test.ts
import request from 'supertest'
import { createApp } from '@/index.js'

const app = createApp()

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('registers user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          name: 'Test User',
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe('test@example.com')
      expect(response.body.data.token).toBeDefined()
      // Password should never be in response
      expect(response.body.data.user.password).toBeUndefined()
    })

    it('rejects invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'Password123',
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /api/auth/me', () => {
    it('returns user when authenticated', async () => {
      // First register to get token
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'me@example.com', password: 'Password123' })

      const token = registerRes.body.data.token

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body.data.user.email).toBe('me@example.com')
    })

    it('returns 401 without token', async () => {
      const response = await request(app).get('/api/auth/me')
      expect(response.status).toBe(401)
    })
  })
})
```

## Database Integration

Tests run against real PostgreSQL with cleanup between tests.

```typescript
// treasurer-api/tests/setup.ts
import { beforeEach, afterAll } from 'vitest'
import { prisma } from '../src/config/database.js'

beforeEach(async () => {
  // Delete in order respecting foreign key constraints
  await prisma.transactionStatusHistory.deleteMany()
  await prisma.transactionSplit.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.account.deleteMany()
  await prisma.category.deleteMany()
  await prisma.vendor.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

See the **prisma** skill for database configuration details.

## Full Flow Tests

Test complete user journeys through the API.

```typescript
// treasurer-api/tests/routes/transactions.test.ts
describe('Transaction Balance Updates', () => {
  let token: string
  let orgId: string
  let accountId: string

  beforeEach(async () => {
    // Setup: Register → Create org → Create account
    const { token: t, orgId: o, accountId: a } = await setupTestEnvironment(app)
    token = t
    orgId = o
    accountId = a
  })

  it('INCOME increases balance', async () => {
    // Get initial balance
    const initial = await request(app)
      .get(`/api/organizations/${orgId}/accounts/${accountId}`)
      .set('Authorization', `Bearer ${token}`)
    
    const initialBalance = parseFloat(initial.body.data.account.balance)

    // Create income transaction
    await request(app)
      .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Salary',
        amount: 500,
        transactionType: 'INCOME',
        splits: [{ amount: 500, categoryName: 'Income' }],
      })
      .expect(201)

    // Verify balance increased
    const final = await request(app)
      .get(`/api/organizations/${orgId}/accounts/${accountId}`)
      .set('Authorization', `Bearer ${token}`)

    const finalBalance = parseFloat(final.body.data.account.balance)
    expect(finalBalance).toBe(initialBalance + 500)
  })

  it('EXPENSE decreases balance', async () => {
    const initial = await request(app)
      .get(`/api/organizations/${orgId}/accounts/${accountId}`)
      .set('Authorization', `Bearer ${token}`)

    await request(app)
      .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Groceries',
        amount: 50,
        transactionType: 'EXPENSE',
        splits: [{ amount: 50, categoryName: 'Food' }],
      })
      .expect(201)

    const final = await request(app)
      .get(`/api/organizations/${orgId}/accounts/${accountId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(parseFloat(final.body.data.account.balance))
      .toBe(parseFloat(initial.body.data.account.balance) - 50)
  })
})
```

## Test Utilities

Use helpers from `tests/helpers/testUtils.ts`:

```typescript
import { registerAndLogin, setupTestEnvironment } from './helpers/testUtils.js'

// Quick auth setup
const { token, userId } = await registerAndLogin(app, {
  email: 'test@example.com',
  password: 'Password123',
})

// Full environment with org and account
const { token, orgId, accountId, transactionId } = await setupTestEnvironment(app)
```

## WARNING: Test Isolation Failures

### Shared State Between Tests

**The Problem:**

```typescript
// BAD - Shared variable mutated across tests
let userId: string

it('creates user', async () => {
  const res = await request(app).post('/api/auth/register').send(...)
  userId = res.body.data.user.id  // Mutates shared state
})

it('uses created user', async () => {
  // Depends on previous test running first!
  await request(app).get(`/api/users/${userId}`)
})
```

**Why This Breaks:**
1. Tests must run in specific order
2. Parallel execution fails
3. Single test failure cascades

**The Fix:**

```typescript
// GOOD - Each test sets up its own data
describe('User operations', () => {
  let userId: string
  let token: string

  beforeEach(async () => {
    const { userId: u, token: t } = await registerAndLogin(app)
    userId = u
    token = t
  })

  it('fetches user profile', async () => {
    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })
})
```

### Hardcoded Test Data Collisions

**The Problem:**

```typescript
// BAD - Same email in multiple tests
it('test 1', async () => {
  await request(app).post('/api/auth/register')
    .send({ email: 'test@test.com', password: 'Pass123' })
})

it('test 2', async () => {
  // Fails if test 1 ran first and cleanup didn't work
  await request(app).post('/api/auth/register')
    .send({ email: 'test@test.com', password: 'Pass123' })
})
```

**The Fix:**

```typescript
// GOOD - Unique data per test
let testCounter = 0

function uniqueEmail() {
  testCounter++
  return `test-${Date.now()}-${testCounter}@example.com`
}

it('test 1', async () => {
  await request(app).post('/api/auth/register')
    .send({ email: uniqueEmail(), password: 'Pass123' })
})
```

## Integration Test Workflow

Copy this checklist:
- [ ] Set up test database (separate from dev)
- [ ] Write `beforeEach` cleanup respecting FK constraints
- [ ] Create test data factories for reuse
- [ ] Test happy path first
- [ ] Add error case tests
- [ ] Verify database state after operations
- [ ] Run tests in isolation: `pnpm test -- path/to/test.ts`