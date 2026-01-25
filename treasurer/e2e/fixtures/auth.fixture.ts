import { test as base, expect, type Page } from '@playwright/test'
import { setupTestData, type TestDataContext } from '../helpers/api.helper'

/**
 * Extended test context with dynamically created test data.
 */
export interface E2ETestContext {
  orgId: string
  accountId: string
  token: string
  testData: TestDataContext
}

/**
 * Authenticate user in browser by setting token in localStorage.
 */
async function authenticateInBrowser(
  page: Page,
  token: string,
  user: { id: string; email: string; name: string }
): Promise<void> {
  // Set auth state in localStorage before navigating
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token)
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
        })
      )
    },
    { token, user }
  )
}

/**
 * Extended test fixture with dynamically created test data.
 *
 * This fixture:
 * 1. Creates a new user, organization, account, categories, and transactions via API
 * 2. Sets up browser authentication
 * 3. Navigates to the transactions page
 * 4. Provides access to all created test data
 */
export const test = base.extend<{
  authenticatedPage: Page
  testContext: E2ETestContext
}>({
  testContext: async ({ page }, use) => {
    // Create all test data via API
    const testData = await setupTestData()

    // Set up browser authentication
    await authenticateInBrowser(page, testData.token, testData.user)

    // Navigate to the transactions page
    const transactionsUrl = `/org/${testData.organization.id}/accounts/${testData.account.id}/transactions`
    await page.goto(transactionsUrl)

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Provide the test context
    await use({
      orgId: testData.organization.id,
      accountId: testData.account.id,
      token: testData.token,
      testData,
    })
  },

  authenticatedPage: async ({ page, testContext: _testContext }, use) => {
    // testContext already sets up authentication, just use the page
    await use(page)
  },
})

export { expect }

/**
 * Helper to get transaction by index from test data.
 */
export function getTransaction(testData: TestDataContext, index: number) {
  const txn = testData.transactions[index]
  if (!txn) {
    throw new Error(`Transaction at index ${index} not found`)
  }
  return txn
}

/**
 * Helper to get category by name from test data.
 */
export function getCategory(testData: TestDataContext, name: string) {
  const cat = testData.categories.find((c) => c.name === name)
  if (!cat) {
    throw new Error(`Category "${name}" not found`)
  }
  return cat
}
