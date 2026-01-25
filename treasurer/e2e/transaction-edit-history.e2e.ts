import { test, expect, getTransaction } from './fixtures/auth.fixture'
import { TRANSACTION_INDEX } from './fixtures/transaction.fixture'
import { TransactionEditPage } from './helpers/transaction-edit.helper'

/**
 * E2E Tests: Transaction Edit - Edit History
 *
 * Tests the edit history functionality including:
 * - Viewing edit history timeline
 * - Expanding change details
 * - Verifying before/after values
 * - User information display
 */

test.describe('Transaction Edit - Edit History', () => {
  test('should display edit history tab in modal', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.SPLIT_EXPENSE
    )

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Verify edit history tab is visible
    await expect(editPage.editHistoryTab).toBeVisible()
  })

  test('should open edit history panel when clicking tab', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.SPLIT_EXPENSE
    )

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Open edit history
    await editPage.openEditHistory()

    // Verify history panel is visible
    const historyPanel = page.locator('[data-testid="edit-history-panel"]')
    await expect(historyPanel).toBeVisible()
  })

  test('should display all edit history entries', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.SPLIT_EXPENSE
    )

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Open edit history
    await editPage.openEditHistory()

    // Get history entries
    const entries = await editPage.getEditHistoryEntries()

    // Should have at least the creation entry
    await expect(entries).toHaveCount(transaction.version)
  })

  test('should display edit timestamp and user info', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.SPLIT_EXPENSE
    )

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Open edit history
    await editPage.openEditHistory()

    // Get first history entry
    const entries = await editPage.getEditHistoryEntries()
    const firstEntry = entries.first()

    // Should display timestamp
    await expect(
      firstEntry.locator('[data-testid="edit-timestamp"]')
    ).toBeVisible()

    // Should display user name/email
    await expect(firstEntry.locator('[data-testid="edit-user"]')).toBeVisible()

    // Should display edit action (e.g., "Created", "Updated")
    await expect(
      firstEntry.locator('[data-testid="edit-action"]')
    ).toBeVisible()
  })

  test('should expand history entry to show change details', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.SPLIT_EXPENSE
    )

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Open edit history
    await editPage.openEditHistory()

    // Expand the most recent edit entry (not creation)
    const entries = await editPage.getEditHistoryEntries()
    const entryCount = await entries.count()

    if (entryCount > 1) {
      // Expand the second entry (first edit after creation)
      await editPage.expandHistoryEntry(1)

      // Verify change details are visible
      const changeDetails = entries
        .nth(1)
        .locator('[data-testid="change-details"]')
      await expect(changeDetails).toBeVisible()
    }
  })

  test('should display before and after values for changed fields', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.GROCERY
    )

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Make a change
    const originalMemo = await editPage.memoInput.inputValue()
    const newMemo = 'Changed memo for history test'
    await editPage.fillTransactionForm({ memo: newMemo })
    await editPage.save()
    await editPage.waitForSaveSuccess()

    // Re-open edit modal
    await editPage.openEditModal(transaction.id)

    // Open edit history
    await editPage.openEditHistory()

    // Expand the most recent edit
    await editPage.expandHistoryEntry(0)

    // Verify before and after values are shown
    const changeDetails = (await editPage.getEditHistoryEntries())
      .first()
      .locator('[data-testid="change-details"]')

    // Should show memo change
    const memoChange = changeDetails.locator('[data-field="memo"]')
    await expect(memoChange).toBeVisible()

    // Verify before value
    const beforeValue = memoChange.locator('[data-testid="before-value"]')
    await expect(beforeValue).toContainText(originalMemo)

    // Verify after value
    const afterValue = memoChange.locator('[data-testid="after-value"]')
    await expect(afterValue).toContainText(newMemo)
  })

  test('should track multiple edits in chronological order', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.GROCERY
    )

    // Make first edit
    await editPage.openEditModal(transaction.id)
    await editPage.fillTransactionForm({ memo: 'First edit' })
    await editPage.save()
    await editPage.waitForSaveSuccess()

    // Wait a moment
    await page.waitForTimeout(1000)

    // Make second edit
    await editPage.openEditModal(transaction.id)
    await editPage.fillTransactionForm({ memo: 'Second edit' })
    await editPage.save()
    await editPage.waitForSaveSuccess()

    // Wait a moment
    await page.waitForTimeout(1000)

    // Make third edit
    await editPage.openEditModal(transaction.id)
    await editPage.fillTransactionForm({ amount: '999.99' })
    await editPage.save()
    await editPage.waitForSaveSuccess()

    // Open edit history
    await editPage.openEditModal(transaction.id)
    await editPage.openEditHistory()

    // Verify entries are in chronological order (newest first)
    const entries = await editPage.getEditHistoryEntries()
    const entryCount = await entries.count()

    // Should have creation + 3 edits = 4 entries
    expect(entryCount).toBeGreaterThanOrEqual(4)

    // Verify the most recent entry is at the top
    const firstEntry = entries.first()
    const firstTimestamp = await firstEntry
      .locator('[data-testid="edit-timestamp"]')
      .getAttribute('datetime')

    const secondEntry = entries.nth(1)
    const secondTimestamp = await secondEntry
      .locator('[data-testid="edit-timestamp"]')
      .getAttribute('datetime')

    // First entry timestamp should be more recent
    if (firstTimestamp && secondTimestamp) {
      expect(new Date(firstTimestamp).getTime()).toBeGreaterThan(
        new Date(secondTimestamp).getTime()
      )
    }
  })

  test('should display "Created" action for initial entry', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.GROCERY
    )

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Open edit history
    await editPage.openEditHistory()

    // Get last entry (creation entry)
    const entries = await editPage.getEditHistoryEntries()
    const lastEntry = entries.last()

    // Verify it shows "Created" action
    const action = lastEntry.locator('[data-testid="edit-action"]')
    await expect(action).toContainText(/created/i)

    // Expand to see initial values
    const expandButton = lastEntry.getByRole('button', {
      name: /expand|show details/i,
    })

    if (await expandButton.isVisible()) {
      await expandButton.click()

      // Should show initial values with no "before" state
      const changeDetails = lastEntry.locator('[data-testid="change-details"]')
      await expect(changeDetails).toBeVisible()
    }
  })

  test('should collapse expanded history entry', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.SPLIT_EXPENSE
    )

    // Open edit modal and history
    await editPage.openEditModal(transaction.id)
    await editPage.openEditHistory()

    // Expand first entry
    const entries = await editPage.getEditHistoryEntries()
    const firstEntry = entries.first()
    const expandButton = firstEntry.getByRole('button', {
      name: /expand|show details|collapse/i,
    })

    await expandButton.click()

    // Verify details are visible
    const changeDetails = firstEntry.locator('[data-testid="change-details"]')
    await expect(changeDetails).toBeVisible()

    // Click again to collapse
    await expandButton.click()

    // Verify details are hidden
    await expect(changeDetails).toBeHidden()
  })

  test('should show split changes in edit history', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.SPLIT_EXPENSE
    )

    // Open and modify splits
    await editPage.openEditModal(transaction.id)
    await editPage.updateSplit(0, { amount: '150.00' })
    await editPage.updateSplit(1, { amount: '50.00' })
    await editPage.save()
    await editPage.waitForSaveSuccess()

    // Re-open and view history
    await editPage.openEditModal(transaction.id)
    await editPage.openEditHistory()

    // Expand most recent edit
    await editPage.expandHistoryEntry(0)

    // Verify split changes are shown
    const changeDetails = (await editPage.getEditHistoryEntries())
      .first()
      .locator('[data-testid="change-details"]')

    const splitChanges = changeDetails.locator('[data-testid="split-changes"]')
    await expect(splitChanges).toBeVisible()

    // Should show individual split modifications
    await expect(splitChanges).toContainText(/150\.00/)
    await expect(splitChanges).toContainText(/50\.00/)
  })

  test('should handle no edit history for newly created transaction', async ({
    page,
    testContext,
  }) => {
    // For a transaction with version 1, should show only creation
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.GROCERY
    )

    await editPage.openEditModal(transaction.id)
    await editPage.openEditHistory()

    const entries = await editPage.getEditHistoryEntries()
    const entryCount = await entries.count()

    // Should have exactly 1 entry (creation) if version is 1
    if (transaction.version === 1) {
      expect(entryCount).toBe(1)

      // Verify it's the creation entry
      const action = entries.first().locator('[data-testid="edit-action"]')
      await expect(action).toContainText(/created/i)
    }
  })
})
