---
name: vitest
description: |
  Implements unit and integration tests with Vitest for frontend and backend.
  Use when: writing tests, debugging test failures, setting up test infrastructure,
  mocking dependencies, or creating test fixtures.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Vitest Skill

This project uses Vitest 2.x (backend) and 1.x (frontend) with globals enabled. Backend tests use a real PostgreSQL test database with Prisma, while frontend tests use jsdom with MSW for API mocking. Tests follow the `*.test.ts` naming pattern.

## Quick Start

### Run Tests

```bash
# All tests (monorepo root)
pnpm test

# Frontend tests
cd treasurer && pnpm test

# Backend tests
cd treasurer-api && pnpm test

# Single test file
pnpm test -- path/to/file.test.ts

# Watch mode
pnpm test -- --watch

# Coverage report
pnpm test:coverage
```

### Basic Test Structure

```typescript
// Backend service test
describe('TransactionService', () => {
  beforeEach(async () => {
    await prisma.transaction.deleteMany()
  })

  it('creates transaction with correct balance update', async () => {
    const result = await createTransaction(accountId, {
      description: 'Test',
      amount: 100,
      transactionType: 'INCOME',
    })
    expect(result.amount).toBe(100)
  })
})
```

```typescript
// Frontend component test
describe('Button', () => {
  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledOnce()
  })
})
```

## Key Concepts

| Concept | Backend | Frontend |
|---------|---------|----------|
| Environment | `node` | `jsdom` |
| Database | Real Prisma/PostgreSQL | MSW mocking |
| Assertions | `expect()` globals | `expect()` + Testing Library |
| Cleanup | `beforeEach` deletes | `cleanup()` + server reset |
| Test data | `testFactories.ts` | Mock objects |

## Configuration

**Backend** (`treasurer-api/vitest.config.ts`):
- `pool: 'forks'` with `singleFork: true` for database isolation
- `fileParallelism: false` prevents concurrent DB access

**Frontend** (in `treasurer/vite.config.ts`):
- `environment: 'jsdom'` for DOM APIs
- `css: true` for Tailwind class testing

## Common Patterns

### API Endpoint Test

```typescript
describe('POST /api/auth/register', () => {
  it('registers user with valid data', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123' })

    expect(response.status).toBe(201)
    expect(response.body.data.token).toBeDefined()
  })
})
```

### React Component with Redux

```typescript
import { render, screen } from '../utils'  // Custom render with providers

it('displays account balance', () => {
  render(<AccountCard account={mockAccount} orgId="org-1" />)
  expect(screen.getByText('$1,500.50')).toBeInTheDocument()
})
```

## See Also

- [Unit Testing](references/unit.md) - Service and component unit tests
- [Integration Testing](references/integration.md) - API and database tests
- [Mocking](references/mocking.md) - vi.fn, vi.mock, MSW patterns
- [Fixtures](references/fixtures.md) - Test factories and utilities

## Related Skills

- See the **typescript** skill for type-safe test patterns
- See the **express** skill for API route testing
- See the **prisma** skill for database test setup
- See the **react** skill for component testing patterns
- See the **redux** skill for store testing

## Documentation Resources

> Fetch latest Vitest documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "vitest"
2. Prefer website documentation over source code repositories
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/vitest-dev/vitest` _(resolve using mcp__context7__resolve-library-id)_

**Recommended Queries:**
- "Test configuration options"
- "Mocking modules and functions"
- "Coverage configuration"
- "Snapshot testing"