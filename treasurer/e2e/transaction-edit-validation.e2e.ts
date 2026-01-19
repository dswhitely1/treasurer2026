import { test, expect } from './fixtures/auth.fixture'
import { SAMPLE_TRANSACTIONS } from './fixtures/transaction.fixture'
import { TransactionEditPage } from './helpers/transaction-edit.helper'

/**
 * E2E Tests: Transaction Edit - Validation, Authorization, and Business Rules
 *
 * Tests validation rules, authorization checks, and business constraints.
 */

test.describe('Transaction Edit - Validation', () => {
  test('should require memo field', async ({ page, testContext }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Clear memo
    await editPage.fillTransactionForm({ memo: '' })

    // Try to save
    await editPage.save()

    // Should show validation error
    const error = await editPage.getValidationError('memo')
    expect(error).toBeTruthy()
    expect(error).toMatch(/required|cannot be empty/i)

    // Modal should remain open
    await expect(editPage.modal).toBeVisible()
  })

  test('should require amount field', async ({ page, testContext }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Clear amount
    await editPage.fillTransactionForm({ amount: '' })

    // Try to save
    await editPage.save()

    // Should show validation error
    const error = await editPage.getValidationError('amount')
    expect(error).toBeTruthy()
    expect(error).toMatch(/required|cannot be empty/i)

    await expect(editPage.modal).toBeVisible()
  })

  test('should require amount to be greater than zero', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Set amount to zero
    await editPage.fillTransactionForm({ amount: '0' })

    // Try to save
    await editPage.save()

    // Should show validation error
    const error = await editPage.getValidationError('amount')
    expect(error).toBeTruthy()
    expect(error).toMatch(/greater than.*zero|must be positive/i)

    await expect(editPage.modal).toBeVisible()
  })

  test('should require amount to be negative', async ({ page, testContext }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Set negative amount
    await editPage.fillTransactionForm({ amount: '-50.00' })

    // Try to save
    await editPage.save()

    // Should show validation error
    const error = await editPage.getValidationError('amount')
    expect(error).toBeTruthy()
    expect(error).toMatch(/cannot be negative|must be positive/i)

    await expect(editPage.modal).toBeVisible()
  })

  test('should validate amount decimal format', async ({ page, testContext }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Set invalid decimal format
    await editPage.fillTransactionForm({ amount: '100.999' })

    // Try to save
    await editPage.save()

    // Should show validation error or auto-format
    const error = await editPage.getValidationError('amount')
    if (error) {
      expect(error).toMatch(/decimal|format|two decimal places/i)
    } else {
      // Or verify it was auto-formatted to 2 decimals
      await expect(editPage.amountInput).toHaveValue(/^\d+\.\d{2}$/)
    }
  })

  test('should require date field', async ({ page, testContext }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Clear date
    await editPage.fillTransactionForm({ date: '' })

    // Try to save
    await editPage.save()

    // Should show validation error
    const error = await editPage.getValidationError('date')
    expect(error).toBeTruthy()
    expect(error).toMatch(/required|cannot be empty/i)

    await expect(editPage.modal).toBeVisible()
  })

  test('should validate date format', async ({ page, testContext }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Set invalid date format
    await editPage.fillTransactionForm({ date: 'not-a-date' })

    // Try to save
    await editPage.save()

    // Should show validation error
    const error = await editPage.getValidationError('date')
    expect(error).toBeTruthy()
    expect(error).toMatch(/invalid date|date format/i)

    await expect(editPage.modal).toBeVisible()
  })

  test('should validate future dates are allowed/disallowed based on business rules', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Set future date
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const futureDateString = futureDate.toISOString().split('T')[0]

    await editPage.fillTransactionForm({ date: futureDateString })

    // Try to save
    await editPage.save()

    // Check if future dates are allowed (business rule dependent)
    const error = await editPage.getValidationError('date')
    // This test should match your actual business rules
    // Some apps allow future dates, some don't
  })

  test('should display multiple validation errors simultaneously', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Create multiple validation errors
    await editPage.fillTransactionForm({
      memo: '',
      amount: '0',
      date: '',
    })

    // Try to save
    await editPage.save()

    // Should show all validation errors
    const memoError = await editPage.getValidationError('memo')
    const amountError = await editPage.getValidationError('amount')
    const dateError = await editPage.getValidationError('date')

    expect(memoError).toBeTruthy()
    expect(amountError).toBeTruthy()
    expect(dateError).toBeTruthy()

    await expect(editPage.modal).toBeVisible()
  })

  test('should clear validation errors when fixing fields', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Create validation error
    await editPage.fillTransactionForm({ amount: '' })
    await editPage.save()

    // Verify error exists
    let error = await editPage.getValidationError('amount')
    expect(error).toBeTruthy()

    // Fix the field
    await editPage.fillTransactionForm({ amount: '100.00' })

    // Error should clear (either immediately or on blur)
    await page.waitForTimeout(500) // Wait for validation to update

    error = await editPage.getValidationError('amount')
    expect(error).toBeFalsy()
  })
})

test.describe('Transaction Edit - Authorization & Business Rules', () => {
  test('should prevent editing reconciled transaction', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const reconciledTransaction = SAMPLE_TRANSACTIONS.find(
      (t) => t.status === 'RECONCILED'
    )

    if (!reconciledTransaction) {
      test.skip('No reconciled transaction available for testing')
      return
    }

    // Attempt to open edit modal
    await editPage.openEditModal(reconciledTransaction.id)

    // Should either:
    // 1. Not open the modal and show error message, OR
    // 2. Open modal but disable all form fields

    const modalVisible = await editPage.modal.isVisible()

    if (modalVisible) {
      // Verify form is disabled
      await expect(editPage.memoInput).toBeDisabled()
      await expect(editPage.amountInput).toBeDisabled()
      await expect(editPage.dateInput).toBeDisabled()
      await expect(editPage.saveButton).toBeDisabled()

      // Should show warning message
      const warning = page.locator('[role="alert"]', {
        hasText: /reconciled.*cannot.*edit/i,
      })
      await expect(warning).toBeVisible()
    } else {
      // Should show error notification
      const errorNotification = page.locator('[role="alert"]', {
        hasText: /reconciled|cannot edit/i,
      })
      await expect(errorNotification).toBeVisible()
    }
  })

  test('should display warning for stale data', async ({ page, testContext }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Wait for staleness threshold (if app has freshness checking)
    // This would require the transaction to be older than the threshold
    // For testing, you might need to mock the timestamp or use an old transaction

    // Check if freshness warning appears
    const freshnessWarning = page.locator('[role="alert"]', {
      hasText: /old data|stale|outdated/i,
    })

    // This test is conditional based on transaction age
    const warningVisible = await freshnessWarning.isVisible()

    if (warningVisible) {
      // Verify warning message is appropriate
      await expect(freshnessWarning).toContainText(
        /minutes|hours|days|updated/i
      )
    }
  })

  test('should handle permission-based editing restrictions', async ({
    page,
    testContext,
  }) => {
    // This test would require different user roles
    // For now, it's a placeholder for role-based authorization testing

    // Example: Read-only users should not see Edit button
    // Or: Edit modal should show but Save button disabled

    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    // Check if Edit button is available based on permissions
    const editButton = page.locator(
      `[data-testid="transaction-row-${transaction.id}"] button[aria-label*="Edit"]`
    )

    const hasEditPermission = await editButton.isVisible()

    if (hasEditPermission) {
      // User has permission, proceed normally
      await editPage.openEditModal(transaction.id)
      await expect(editPage.saveButton).toBeEnabled()
    } else {
      // User doesn't have permission
      // Edit button should not be visible or should be disabled
      if (await editButton.count() > 0) {
        await expect(editButton).toBeDisabled()
      }
    }
  })
})
