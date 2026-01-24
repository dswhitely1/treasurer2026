# Playwright Workflows Reference

## Contents
- Authentication Setup
- Test Data Management
- CI/CD Integration
- Debugging Flaky Tests

## Authentication Setup

### Storage State Pattern

Treasurer uses JWT authentication. Capture auth state once and reuse:

```typescript
// e2e/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test'

export const test = base.extend({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'e2e/.auth/user.json'
    })
    const page = await context.newPage()
    await use(page)
    await context.close()
  }
})
```

### Generate Auth State

```typescript
// e2e/global-setup.ts
import { chromium } from '@playwright/test'

async function globalSetup() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  await page.goto('http://localhost:3000/login')
  await page.getByLabel('Email').fill('test@example.com')
  await page.getByLabel('Password').fill('testpassword')
  await page.getByRole('button', { name: 'Login' }).click()
  
  await page.waitForURL('**/dashboard')
  await page.context().storageState({ path: 'e2e/.auth/user.json' })
  
  await browser.close()
}

export default globalSetup
```

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  projects: [
    {
      name: 'chromium',
      use: {
        storageState: 'e2e/.auth/user.json'
      }
    }
  ]
})
```

## Test Data Management

### Fixture-Based Setup

```typescript
// e2e/fixtures/transaction.fixture.ts
import { test as base } from '@playwright/test'
import { TransactionEditPage } from '../helpers/transaction-edit.helper'

type Fixtures = {
  testTransaction: { id: string; amount: string }
  transactionPage: TransactionEditPage
}

export const test = base.extend<Fixtures>({
  testTransaction: async ({ request }, use) => {
    // Create via API
    const response = await request.post('/api/organizations/test-org/accounts/test-account/transactions', {
      data: { amount: '100.00', memo: 'Test transaction', date: new Date().toISOString() }
    })
    const transaction = await response.json()
    
    await use(transaction.data)
    
    // Cleanup after test
    await request.delete(`/api/.../transactions/${transaction.data.id}`)
  },
  
  transactionPage: async ({ page }, use) => {
    await use(new TransactionEditPage(page))
  }
})
```

### Usage

```typescript
import { test } from './fixtures/transaction.fixture'
import { expect } from '@playwright/test'

test('edit created transaction', async ({ page, testTransaction, transactionPage }) => {
  await page.goto(`/org/test-org/accounts/test-account/transactions`)
  await transactionPage.openForTransaction(testTransaction.id)
  
  await expect(transactionPage.amountInput).toHaveValue(testTransaction.amount)
})
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 10
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps
      
      - name: Start services
        run: docker compose up -d --build
      
      - name: Wait for services
        run: |
          npx wait-on http://localhost:3000 http://localhost:3001/api/health
      
      - name: Run E2E tests
        run: cd treasurer && pnpm test:e2e
        env:
          CI: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: treasurer/playwright-report/
```

### CI Configuration in playwright.config.ts

```typescript
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
})
```

## Debugging Flaky Tests

### Workflow Checklist

Copy this checklist when debugging flaky tests:

- [ ] Run test in headed mode: `pnpm test:e2e:headed`
- [ ] Enable tracing: `pnpm test:e2e --trace on`
- [ ] Check for race conditions (missing waits)
- [ ] Verify test isolation (no shared state)
- [ ] Check network timing (add `networkidle` where needed)
- [ ] Review CI vs local differences (viewport, speed)

### Add Debug Points

```typescript
test('flaky test investigation', async ({ page }) => {
  // Pause execution for inspection
  await page.pause()
  
  // Take screenshot at specific point
  await page.screenshot({ path: 'debug-screenshot.png' })
  
  // Log network requests
  page.on('request', req => console.log('Request:', req.url()))
  page.on('response', res => console.log('Response:', res.status(), res.url()))
})
```

### View Trace Files

```bash
# After test failure with trace enabled
pnpm exec playwright show-trace playwright-report/data/trace.zip
```

### Common Flaky Test Fixes

```typescript
// Problem: Element not ready after navigation
// Fix: Wait for network idle
await page.goto('/dashboard')
await page.waitForLoadState('networkidle')

// Problem: Animation in progress
// Fix: Wait for animation to complete
await expect(page.getByRole('dialog')).toBeVisible()
await page.getByRole('dialog').waitFor({ state: 'visible' })

// Problem: Dynamic content loading
// Fix: Wait for specific content
await expect(page.getByTestId('transaction-list')).not.toBeEmpty()

// Problem: Toast disappears too fast
// Fix: Increase assertion timeout for this specific check
await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 })
```

### Iterate Until Pass Pattern

When fixing flaky tests:

1. Add explicit waits for dynamic content
2. Run test: `pnpm test:e2e [test-file] --repeat-each=5`
3. If test fails, analyze trace and add more waits
4. Repeat step 2 until 5 consecutive passes
5. Run full suite to ensure no regressions