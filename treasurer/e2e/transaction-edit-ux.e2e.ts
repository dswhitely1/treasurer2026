import { test, expect, devices } from '@playwright/test'
import { SAMPLE_TRANSACTIONS } from './fixtures/transaction.fixture'
import { TransactionEditPage } from './helpers/transaction-edit.helper'
import { test as authTest } from './fixtures/auth.fixture'

/**
 * E2E Tests: Transaction Edit - UX Features
 *
 * Tests keyboard navigation, accessibility, responsive design,
 * error handling, and URL state management.
 */

test.describe('Transaction Edit - Keyboard Navigation & Accessibility', () => {
  authTest('should close modal with Escape key', async ({ page, testContext }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Close with Escape
    await editPage.closeWithKeyboard()

    // Modal should close
    await editPage.waitForClose()
  })

  authTest('should save with Cmd/Ctrl+S keyboard shortcut', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Modify transaction
    await editPage.fillTransactionForm({ memo: 'Saved with keyboard' })

    // Save with keyboard shortcut
    await editPage.saveWithKeyboard()

    // Should save successfully
    await editPage.waitForSaveSuccess()
  })

  authTest('should support tab navigation through form fields', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Start from close button (which has initial focus)
    await expect(editPage.closeButton).toBeFocused()

    // Tab to memo field
    await page.keyboard.press('Tab')
    await expect(editPage.memoInput).toBeFocused()

    // Tab to amount field
    await page.keyboard.press('Tab')
    await expect(editPage.amountInput).toBeFocused()

    // Tab to date field
    await page.keyboard.press('Tab')
    await expect(editPage.dateInput).toBeFocused()

    // Continue tabbing should reach type select
    await page.keyboard.press('Tab')
    await expect(editPage.typeSelect).toBeFocused()

    // Eventually reach Save button
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      if (await editPage.saveButton.evaluate((el) => el === document.activeElement)) {
        break
      }
    }

    await expect(editPage.saveButton).toBeFocused()
  })

  authTest('should trap focus within modal', async ({ page, testContext }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Get all focusable elements in modal
    const focusableElements = await editPage.modal.locator(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements.first()
    const lastElement = focusableElements.last()

    // Focus last element
    await lastElement.focus()

    // Tab forward should cycle to first element
    await page.keyboard.press('Tab')

    const activeElement = await page.evaluate(() => document.activeElement?.tagName)

    // Should have cycled back to an element within the modal
    const isWithinModal = await page.evaluate(() => {
      const activeEl = document.activeElement
      const modalEl = document.querySelector('[role="dialog"]')
      return modalEl?.contains(activeEl)
    })

    expect(isWithinModal).toBe(true)
  })

  authTest('should have proper ARIA attributes', async ({ page, testContext }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Modal should have role="dialog"
    await expect(editPage.modal).toHaveAttribute('role', 'dialog')

    // Modal should have aria-modal="true"
    await expect(editPage.modal).toHaveAttribute('aria-modal', 'true')

    // Modal should have aria-labelledby pointing to title
    const labelledBy = await editPage.modal.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()

    const titleElement = page.locator(`#${labelledBy}`)
    await expect(titleElement).toBeVisible()

    // Close button should have aria-label
    await expect(editPage.closeButton).toHaveAttribute(
      'aria-label',
      /close modal/i
    )

    // Form fields should have associated labels
    await expect(editPage.memoInput).toHaveAttribute('id')
    const memoId = await editPage.memoInput.getAttribute('id')
    const memoLabel = page.locator(`label[for="${memoId}"]`)
    await expect(memoLabel).toBeVisible()
  })

  authTest('should announce validation errors to screen readers', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Create validation error
    await editPage.fillTransactionForm({ amount: '' })
    await editPage.save()

    // Error should have role="alert" or aria-live
    const errorElement = editPage.modal.locator('[data-testid="amount-error"]')

    if (await errorElement.isVisible()) {
      const role = await errorElement.getAttribute('role')
      const ariaLive = await errorElement.getAttribute('aria-live')

      expect(role === 'alert' || ariaLive === 'polite' || ariaLive === 'assertive').toBe(
        true
      )
    }
  })

  authTest('should meet minimum touch target size on mobile', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Check close button size (should be at least 44x44px for touch)
    const closeButtonBox = await editPage.closeButton.boundingBox()
    expect(closeButtonBox?.width).toBeGreaterThanOrEqual(44)
    expect(closeButtonBox?.height).toBeGreaterThanOrEqual(44)

    // Check save button size
    const saveButtonBox = await editPage.saveButton.boundingBox()
    expect(saveButtonBox?.width).toBeGreaterThanOrEqual(44)
    expect(saveButtonBox?.height).toBeGreaterThanOrEqual(44)
  })
})

test.describe('Transaction Edit - Responsive Design', () => {
  authTest('should display full-screen modal on mobile', async ({
    page,
    testContext,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE

    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Modal should take full screen on mobile
    const modalBox = await editPage.modal.boundingBox()
    const viewportSize = page.viewportSize()!

    // Modal width should be close to viewport width
    expect(modalBox?.width).toBeGreaterThan(viewportSize.width * 0.9)

    // Modal should be positioned at edges
    expect(modalBox?.x).toBeLessThanOrEqual(20) // Allow some padding
  })

  authTest('should display centered modal on desktop', async ({
    page,
    testContext,
  }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })

    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Modal should be centered and not full-width
    const modalBox = await editPage.modal.boundingBox()
    const viewportSize = page.viewportSize()!

    // Modal width should be less than viewport width
    expect(modalBox?.width).toBeLessThan(viewportSize.width * 0.7)

    // Modal should be roughly centered
    const centerX = (modalBox?.x ?? 0) + (modalBox?.width ?? 0) / 2
    const viewportCenterX = viewportSize.width / 2
    expect(Math.abs(centerX - viewportCenterX)).toBeLessThan(100)
  })

  authTest('should adapt layout on tablet viewport', async ({
    page,
    testContext,
  }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 }) // iPad

    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Modal should be visible and usable
    await expect(editPage.modal).toBeVisible()

    // Form fields should be properly sized
    const memoBox = await editPage.memoInput.boundingBox()
    expect(memoBox?.width).toBeGreaterThan(200) // Reasonable width

    // Buttons should be accessible
    await expect(editPage.saveButton).toBeVisible()
    await expect(editPage.closeButton).toBeVisible()
  })
})

test.describe('Transaction Edit - Error Handling', () => {
  authTest('should handle network error during save', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Simulate offline
    await page.context().setOffline(true)

    // Try to save
    await editPage.fillTransactionForm({ memo: 'Offline edit' })
    await editPage.save()

    // Should show network error
    const errorNotification = page.locator('[role="alert"]', {
      hasText: /network|offline|connection/i,
    })
    await expect(errorNotification).toBeVisible({ timeout: 5000 })

    // Modal should remain open
    await expect(editPage.modal).toBeVisible()

    // Restore connection
    await page.context().setOffline(false)

    // User should be able to retry
    await editPage.save()
    await editPage.waitForSaveSuccess()
  })

  authTest('should handle API error response', async ({ page, testContext }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Mock API to return error
    await page.route('**/api/organizations/*/accounts/*/transactions/*', (route) => {
      if (route.request().method() === 'PATCH') {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Invalid transaction data',
            details: 'Amount exceeds account limit',
          }),
        })
      } else {
        route.continue()
      }
    })

    // Try to save
    await editPage.fillTransactionForm({ amount: '999999.99' })
    await editPage.save()

    // Should show API error message
    const errorNotification = page.locator('[role="alert"]', {
      hasText: /invalid|error|failed/i,
    })
    await expect(errorNotification).toBeVisible({ timeout: 5000 })

    // Should display specific error details
    await expect(errorNotification).toContainText(/amount|limit/i)

    // Modal should remain open
    await expect(editPage.modal).toBeVisible()
  })

  authTest('should handle timeout during save', async ({ page, testContext }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    await editPage.openEditModal(transaction.id)

    // Mock slow API response
    await page.route('**/api/organizations/*/accounts/*/transactions/*', (route) => {
      if (route.request().method() === 'PATCH') {
        // Delay response beyond timeout
        setTimeout(() => {
          route.fulfill({ status: 200, body: JSON.stringify({}) })
        }, 35000) // Longer than typical timeout
      } else {
        route.continue()
      }
    })

    // Try to save
    await editPage.fillTransactionForm({ memo: 'Slow save' })
    await editPage.save()

    // Should show timeout error
    const errorNotification = page.locator('[role="alert"]', {
      hasText: /timeout|took too long/i,
    })
    await expect(errorNotification).toBeVisible({ timeout: 40000 })
  })
})

test.describe('Transaction Edit - URL State Management', () => {
  authTest('should open modal from direct URL with edit param', async ({
    page,
    testContext,
  }) => {
    const transaction = SAMPLE_TRANSACTIONS[0]

    // Navigate directly to URL with edit param
    await page.goto(
      `/org/${testContext.orgId}/accounts/${testContext.accountId}/transactions?edit=${transaction.id}`
    )

    const editPage = new TransactionEditPage(page)

    // Modal should open automatically
    await expect(editPage.modal).toBeVisible({ timeout: 5000 })

    // Form should be pre-filled
    await expect(editPage.memoInput).toHaveValue(transaction.memo)
  })

  authTest('should update URL when opening modal', async ({ page, testContext }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    // Open edit modal via button click
    await editPage.openEditModal(transaction.id)

    // URL should contain edit parameter
    await expect(page).toHaveURL(new RegExp(`edit=${transaction.id}`))
  })

  authTest('should remove URL param when closing modal', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    // Open modal
    await editPage.openEditModal(transaction.id)

    // Close modal
    await editPage.close()
    await editPage.waitForClose()

    // URL should no longer have edit param
    await expect(page).not.toHaveURL(/edit=/)
  })

  authTest('should handle browser back button to close modal', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    // Record initial URL
    const initialUrl = page.url()

    // Open modal
    await editPage.openEditModal(transaction.id)

    // Verify modal is open
    await expect(editPage.modal).toBeVisible()

    // Click browser back button
    await page.goBack()

    // Modal should close
    await editPage.waitForClose()

    // Should be back to initial URL
    expect(page.url()).toBe(initialUrl)
  })

  authTest('should preserve other query parameters when adding edit param', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = SAMPLE_TRANSACTIONS[0]

    // Navigate with existing query params
    await page.goto(
      `/org/${testContext.orgId}/accounts/${testContext.accountId}/transactions?filter=cleared&sort=date`
    )

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // URL should contain all query params
    await expect(page).toHaveURL(/filter=cleared/)
    await expect(page).toHaveURL(/sort=date/)
    await expect(page).toHaveURL(/edit=/)
  })

  authTest('should handle invalid transaction ID in URL', async ({
    page,
    testContext,
  }) => {
    // Navigate to URL with non-existent transaction ID
    await page.goto(
      `/org/${testContext.orgId}/accounts/${testContext.accountId}/transactions?edit=invalid-txn-id`
    )

    // Should show error notification
    const errorNotification = page.locator('[role="alert"]', {
      hasText: /not found|invalid/i,
    })
    await expect(errorNotification).toBeVisible({ timeout: 5000 })

    // Modal should not open or should close
    const editPage = new TransactionEditPage(page)
    await expect(editPage.modal).toBeHidden()
  })
})
