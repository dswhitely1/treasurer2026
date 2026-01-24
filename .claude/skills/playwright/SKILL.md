---
name: playwright
description: |
  Creates end-to-end tests for critical user flows and workflows.
  Use when: Writing E2E tests, testing user authentication flows, testing multi-step workflows like transaction reconciliation, testing cross-browser compatibility, debugging flaky tests.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__query-docs
---

# Playwright Skill

E2E testing framework for Treasurer's critical user flows. Tests live in `treasurer/e2e/` using Page Object Model pattern with fixtures for auth and transaction setup. Run with `pnpm test:e2e` or `pnpm test:e2e:ui` for interactive debugging.

## Quick Start

### Running Tests

```bash
# From treasurer/ directory
pnpm test:e2e                    # Run all E2E tests
pnpm test:e2e:ui                 # Interactive UI mode
pnpm test:e2e:headed             # See browser during tests
pnpm test:e2e transaction-edit   # Run specific test file
pnpm test:e2e --project=chromium # Specific browser
```

### Basic Test Structure

```typescript
// e2e/transaction-edit-basic.e2e.ts
import { test, expect } from '@playwright/test'

test.describe('Transaction Edit', () => {
  test.beforeEach(async ({ page }) => {
    // Auth fixture handles login
    await page.goto('/org/test-org/accounts/test-account/transactions')
  })

  test('should open edit modal with pre-filled form', async ({ page }) => {
    await page.getByTestId('transaction-row').first().click()
    await page.getByRole('button', { name: 'Edit' }).click()
    
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByLabel('Amount')).not.toBeEmpty()
  })
})
```

## Key Concepts

| Concept | Usage | Example |
|---------|-------|---------|
| Locators | Prefer role/testid over CSS | `page.getByRole('button', { name: 'Save' })` |
| Assertions | Use `expect` with auto-retry | `await expect(locator).toBeVisible()` |
| Fixtures | Reusable setup/teardown | `test.use({ storageState: 'auth.json' })` |
| Page Objects | Encapsulate page interactions | `TransactionEditPage.openModal()` |

## Common Patterns

### Wait for Network Idle

**When:** After navigation or form submission

```typescript
await page.goto('/dashboard')
await page.waitForLoadState('networkidle')
```

### Assert Toast Notifications

**When:** Verifying success/error feedback

```typescript
await page.getByRole('button', { name: 'Save' }).click()
await expect(page.getByRole('alert')).toContainText('saved successfully')
```

### Keyboard Shortcuts

**When:** Testing accessibility and power user features

```typescript
// Test Escape closes modal
await page.keyboard.press('Escape')
await expect(page.getByRole('dialog')).not.toBeVisible()

// Test Cmd+S saves (cross-platform)
await page.keyboard.press('Meta+s') // Mac
await page.keyboard.press('Control+s') // Windows/Linux
```

## See Also

- [patterns](references/patterns.md) - Page Objects, selectors, assertions
- [workflows](references/workflows.md) - Auth setup, CI/CD, debugging

## Related Skills

- See the **vitest** skill for unit/integration testing
- See the **typescript** skill for type-safe test utilities
- See the **react** skill for component testing patterns

## Documentation Resources

> Fetch latest Playwright documentation with Context7.

**How to use Context7:**
1. Use `mcp__context7__resolve-library-id` to search for "playwright"
2. Prefer website documentation (IDs starting with `/websites/`) over source code
3. Query with `mcp__context7__query-docs` using the resolved library ID

**Library ID:** `/microsoft/playwright` _(resolve using mcp__context7__resolve-library-id)_

**Recommended Queries:**
- "Page interactions and locators"
- "Test fixtures and hooks"
- "Assertions and auto-waiting"
- "Authentication and storage state"