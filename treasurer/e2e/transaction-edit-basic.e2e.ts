import { test, expect, getTransaction } from './fixtures/auth.fixture'
import { TRANSACTION_INDEX } from './fixtures/transaction.fixture'
import {
  TransactionEditPage,
  verifyTransactionInList,
} from './helpers/transaction-edit.helper'

/**
 * E2E Tests: Transaction Edit - Basic Flow
 *
 * Tests the basic transaction editing workflow including:
 * - Opening the edit modal
 * - Modifying transaction fields
 * - Saving changes
 * - Verifying updates in the list
 */

test.describe('Transaction Edit - Basic Flow', () => {
  test.beforeEach(async ({ testContext: _testContext }) => {
    // Test context is already set up with authenticated user
    // and navigated to transactions page
  })

  test('should open edit modal with pre-filled form', async ({
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

    // Verify modal is visible
    await expect(editPage.modal).toBeVisible()

    // Verify modal title
    await expect(
      page.getByRole('heading', { name: /edit transaction/i })
    ).toBeVisible()

    // Verify form is pre-filled
    await expect(editPage.memoInput).toHaveValue(transaction.description)
    await expect(editPage.amountInput).toHaveValue(transaction.amount)
    await expect(editPage.dateInput).toHaveValue(transaction.date)

    // Verify version info is displayed
    if (transaction.version > 1) {
      await expect(page.getByText(`(v${transaction.version})`)).toBeVisible()
    }
  })

  test('should modify transaction memo and save successfully', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.GROCERY
    )
    const newMemo = 'Updated: Whole Foods grocery shopping'

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Modify memo
    await editPage.fillTransactionForm({ memo: newMemo })

    // Save changes
    await editPage.save()

    // Wait for save success
    await editPage.waitForSaveSuccess()

    // Verify modal is closed
    await expect(editPage.modal).toBeHidden()

    // Verify URL no longer has edit param
    await expect(page).not.toHaveURL(/edit=/)

    // Verify transaction appears in list with updated memo
    await verifyTransactionInList(page, transaction.id, { memo: newMemo })
  })

  test('should modify transaction amount and save successfully', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.GROCERY
    )
    const newAmount = '150.75'

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Modify amount
    await editPage.fillTransactionForm({ amount: newAmount })

    // Save changes
    await editPage.save()

    // Wait for save success
    await editPage.waitForSaveSuccess()

    // Verify transaction appears in list with updated amount
    await verifyTransactionInList(page, transaction.id, { amount: newAmount })
  })

  test('should modify transaction date and save successfully', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.GROCERY
    )
    const newDate = '2026-01-20'

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Modify date
    await editPage.fillTransactionForm({ date: newDate })

    // Save changes
    await editPage.save()

    // Wait for save success
    await editPage.waitForSaveSuccess()

    // Verify transaction appears in list with updated date
    await verifyTransactionInList(page, transaction.id, { date: newDate })
  })

  test('should modify multiple fields and save successfully', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.GROCERY
    )
    const updates = {
      memo: 'Costco bulk shopping',
      amount: '200.00',
      date: '2026-01-18',
    }

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Modify all fields
    await editPage.fillTransactionForm(updates)

    // Save changes
    await editPage.save()

    // Wait for save success
    await editPage.waitForSaveSuccess()

    // Verify all updates in list
    await verifyTransactionInList(page, transaction.id, updates)
  })

  test('should close modal without saving using close button', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.GROCERY
    )
    const originalMemo = transaction.description

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Modify memo
    await editPage.fillTransactionForm({ memo: 'This should not be saved' })

    // Close without saving
    await editPage.close()

    // Wait for modal to close
    await editPage.waitForClose()

    // Verify transaction still has original memo
    await verifyTransactionInList(page, transaction.id, { memo: originalMemo })
  })

  test('should close modal without saving using cancel button', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.GROCERY
    )
    const originalAmount = transaction.amount

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Modify amount
    await editPage.fillTransactionForm({ amount: '999.99' })

    // Click cancel button
    await editPage.cancelButton.click()

    // Wait for modal to close
    await editPage.waitForClose()

    // Verify transaction still has original amount
    await verifyTransactionInList(page, transaction.id, {
      amount: originalAmount,
    })
  })

  test('should display success notification after saving', async ({
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

    // Modify transaction
    await editPage.fillTransactionForm({ memo: 'Quick update' })

    // Save changes
    await editPage.save()

    // Wait for and verify success notification
    const successNotification = page.locator('[role="alert"]', {
      hasText: /transaction.*saved|transaction.*updated/i,
    })
    await expect(successNotification).toBeVisible({ timeout: 5000 })

    // Notification should auto-dismiss or be dismissible
    await page.waitForTimeout(3000) // Wait for auto-dismiss
    await expect(successNotification).toBeHidden({ timeout: 5000 })
  })

  test('should update version number after successful edit', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.GROCERY
    )
    const currentVersion = transaction.version

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Modify and save
    await editPage.fillTransactionForm({ memo: 'Version increment test' })
    await editPage.save()
    await editPage.waitForSaveSuccess()

    // Re-open edit modal
    await editPage.openEditModal(transaction.id)

    // Verify version has incremented
    await expect(page.getByText(`(v${currentVersion + 1})`)).toBeVisible()

    // Close modal
    await editPage.close()
  })

  test('should handle backdrop click to close modal', async ({
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

    // Click backdrop (outside modal content)
    const backdrop = page.locator('.fixed.inset-0.bg-black.bg-opacity-50')
    await backdrop.click({ position: { x: 10, y: 10 } })

    // Modal should close
    await editPage.waitForClose()
  })

  test('should prevent body scroll when modal is open', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.GROCERY
    )

    // Check body overflow before opening modal
    const bodyOverflowBefore = await page.evaluate(
      () => document.body.style.overflow
    )
    expect(bodyOverflowBefore).not.toBe('hidden')

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Check body overflow is hidden
    const bodyOverflowDuring = await page.evaluate(
      () => document.body.style.overflow
    )
    expect(bodyOverflowDuring).toBe('hidden')

    // Close modal
    await editPage.close()
    await editPage.waitForClose()

    // Check body overflow is restored
    const bodyOverflowAfter = await page.evaluate(
      () => document.body.style.overflow
    )
    expect(bodyOverflowAfter).not.toBe('hidden')
  })
})
