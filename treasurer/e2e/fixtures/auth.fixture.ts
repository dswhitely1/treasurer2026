import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Authentication test data for E2E tests.
 */
export const TEST_USER = {
  email: 'testuser@treasurer.test',
  password: 'TestPassword123!',
  name: 'Test User',
}

export const TEST_ORG = {
  id: 'org-test-123',
  name: 'Test Organization',
}

export const TEST_ACCOUNT = {
  id: 'acc-test-123',
  name: 'Test Checking Account',
  type: 'CHECKING',
  initialBalance: '1000.00',
}

/**
 * Authenticate user and set up test context.
 */
export async function authenticateUser(page: Page): Promise<void> {
  // Navigate to login page
  await page.goto('/login')

  // Fill in credentials
  await page.getByLabel(/email/i).fill(TEST_USER.email)
  await page.getByLabel(/password/i).fill(TEST_USER.password)

  // Submit login form
  await page.getByRole('button', { name: /sign in|login/i }).click()

  // Wait for redirect to dashboard
  await page.waitForURL(/\/org\/.*\/dashboard/, { timeout: 10000 })

  // Verify authentication
  await expect(page.getByText(TEST_USER.name)).toBeVisible()
}

/**
 * Set up authenticated test context with organization and account.
 */
export async function setupTestContext(page: Page) {
  await authenticateUser(page)

  // Navigate to the test organization's transactions page
  await page.goto(`/org/${TEST_ORG.id}/accounts/${TEST_ACCOUNT.id}/transactions`)

  // Wait for the page to load
  await page.waitForSelector('[data-testid="transactions-list"]', {
    timeout: 10000,
  })

  return {
    orgId: TEST_ORG.id,
    accountId: TEST_ACCOUNT.id,
  }
}

/**
 * Extended test fixture with authentication.
 */
export const test = base.extend<{
  authenticatedPage: Page
  testContext: { orgId: string; accountId: string }
}>({
  authenticatedPage: async ({ page }, use) => {
    await authenticateUser(page)
    await use(page)
  },

  testContext: async ({ page }, use) => {
    const context = await setupTestContext(page)
    await use(context)
  },
})

export { expect } from '@playwright/test'
