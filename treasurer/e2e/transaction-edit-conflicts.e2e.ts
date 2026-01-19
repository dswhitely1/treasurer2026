import { test, expect, chromium } from '@playwright/test'
import { TEST_USER, TEST_ORG, TEST_ACCOUNT } from './fixtures/auth.fixture'
import { SAMPLE_TRANSACTIONS } from './fixtures/transaction.fixture'
import {
  TransactionEditPage,
  ConflictResolutionDialog,
  verifyTransactionInList,
} from './helpers/transaction-edit.helper'

/**
 * E2E Tests: Transaction Edit - Optimistic Locking & Conflict Resolution
 *
 * Tests conflict detection and resolution when the same transaction
 * is edited concurrently in multiple browser contexts.
 */

test.describe('Transaction Edit - Optimistic Locking & Conflicts', () => {
  test('should detect conflict when editing stale transaction', async () => {
    // Create two browser contexts to simulate concurrent editing
    const browser = await chromium.launch()
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    try {
      const transaction = SAMPLE_TRANSACTIONS[0]

      // Login and navigate in both contexts
      await Promise.all([
        setupPageContext(page1),
        setupPageContext(page2),
      ])

      const editPage1 = new TransactionEditPage(page1)
      const editPage2 = new TransactionEditPage(page2)

      // Open same transaction in both contexts
      await Promise.all([
        editPage1.openEditModal(transaction.id),
        editPage2.openEditModal(transaction.id),
      ])

      // Both should load version 1
      await expect(page1.getByText('(v1)')).toBeVisible()
      await expect(page2.getByText('(v1)')).toBeVisible()

      // Edit and save in first context
      await editPage1.fillTransactionForm({ memo: 'First edit' })
      await editPage1.save()
      await editPage1.waitForSaveSuccess()

      // Now transaction is version 2 on server

      // Try to save in second context (has stale version 1)
      await editPage2.fillTransactionForm({ memo: 'Second edit (stale)' })
      await editPage2.save()

      // Conflict dialog should appear
      const conflictDialog = new ConflictResolutionDialog(page2)
      await conflictDialog.waitForDialog()

      // Verify dialog is visible
      await expect(conflictDialog.dialog).toBeVisible()

      // Verify both versions are shown
      await expect(conflictDialog.yourVersionPanel).toBeVisible()
      await expect(conflictDialog.serverVersionPanel).toBeVisible()

      // Verify differences are displayed
      const differences = await conflictDialog.getDifferences()
      expect(differences.length).toBeGreaterThan(0)

      // Should show memo difference
      const memoDiff = differences.find((d) => d.field === 'memo')
      expect(memoDiff).toBeTruthy()
      expect(memoDiff?.yourValue).toContain('Second edit')
      expect(memoDiff?.serverValue).toContain('First edit')
    } finally {
      await context1.close()
      await context2.close()
      await browser.close()
    }
  })

  test('should handle "Keep my changes" in conflict resolution', async () => {
    const browser = await chromium.launch()
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    try {
      const transaction = SAMPLE_TRANSACTIONS[0]

      await Promise.all([setupPageContext(page1), setupPageContext(page2)])

      const editPage1 = new TransactionEditPage(page1)
      const editPage2 = new TransactionEditPage(page2)

      // Open in both contexts
      await Promise.all([
        editPage1.openEditModal(transaction.id),
        editPage2.openEditModal(transaction.id),
      ])

      // Edit and save in first context
      await editPage1.fillTransactionForm({ memo: 'Context 1 edit' })
      await editPage1.save()
      await editPage1.waitForSaveSuccess()

      // Edit in second context
      await editPage2.fillTransactionForm({ memo: 'Context 2 override' })
      await editPage2.save()

      // Handle conflict - choose to keep my changes
      const conflictDialog = new ConflictResolutionDialog(page2)
      await conflictDialog.waitForDialog()
      await conflictDialog.keepMyChanges()

      // Should force save with version bump
      await editPage2.waitForSaveSuccess()

      // Verify the second edit is now saved (overriding first)
      await verifyTransactionInList(page2, transaction.id, {
        memo: 'Context 2 override',
      })

      // Verify in first context by refreshing
      await page1.reload()
      await verifyTransactionInList(page1, transaction.id, {
        memo: 'Context 2 override',
      })
    } finally {
      await context1.close()
      await context2.close()
      await browser.close()
    }
  })

  test('should handle "Use server version" in conflict resolution', async () => {
    const browser = await chromium.launch()
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    try {
      const transaction = SAMPLE_TRANSACTIONS[0]

      await Promise.all([setupPageContext(page1), setupPageContext(page2)])

      const editPage1 = new TransactionEditPage(page1)
      const editPage2 = new TransactionEditPage(page2)

      // Open in both contexts
      await Promise.all([
        editPage1.openEditModal(transaction.id),
        editPage2.openEditModal(transaction.id),
      ])

      // Edit and save in first context
      const serverMemo = 'Server version edit'
      await editPage1.fillTransactionForm({ memo: serverMemo })
      await editPage1.save()
      await editPage1.waitForSaveSuccess()

      // Edit in second context
      await editPage2.fillTransactionForm({ memo: 'Local changes to discard' })
      await editPage2.save()

      // Handle conflict - choose to use server version
      const conflictDialog = new ConflictResolutionDialog(page2)
      await conflictDialog.waitForDialog()
      await conflictDialog.useServerVersion()

      // Modal should reload with server version
      await expect(editPage2.modal).toBeVisible()
      await expect(editPage2.memoInput).toHaveValue(serverMemo)

      // User can now make changes on top of server version
      await editPage2.fillTransactionForm({ memo: serverMemo + ' - updated' })
      await editPage2.save()
      await editPage2.waitForSaveSuccess()

      // Verify final memo
      await verifyTransactionInList(page2, transaction.id, {
        memo: serverMemo + ' - updated',
      })
    } finally {
      await context1.close()
      await context2.close()
      await browser.close()
    }
  })

  test('should handle "Cancel" in conflict resolution', async () => {
    const browser = await chromium.launch()
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    try {
      const transaction = SAMPLE_TRANSACTIONS[0]

      await Promise.all([setupPageContext(page1), setupPageContext(page2)])

      const editPage1 = new TransactionEditPage(page1)
      const editPage2 = new TransactionEditPage(page2)

      // Open in both contexts
      await Promise.all([
        editPage1.openEditModal(transaction.id),
        editPage2.openEditModal(transaction.id),
      ])

      // Edit and save in first context
      await editPage1.fillTransactionForm({ memo: 'First save' })
      await editPage1.save()
      await editPage1.waitForSaveSuccess()

      // Edit in second context
      await editPage2.fillTransactionForm({ memo: 'Not saved' })
      await editPage2.save()

      // Handle conflict - cancel
      const conflictDialog = new ConflictResolutionDialog(page2)
      await conflictDialog.waitForDialog()
      await conflictDialog.cancel()

      // Conflict dialog should close
      await expect(conflictDialog.dialog).toBeHidden()

      // Edit modal should still be open
      await expect(editPage2.modal).toBeVisible()

      // User can modify and try again
      await editPage2.fillTransactionForm({ memo: 'Retry after cancel' })
      await editPage2.save()

      // Should trigger conflict again
      await conflictDialog.waitForDialog()
    } finally {
      await context1.close()
      await context2.close()
      await browser.close()
    }
  })

  test('should show version mismatch details in conflict dialog', async () => {
    const browser = await chromium.launch()
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    try {
      const transaction = SAMPLE_TRANSACTIONS[2] // Multi-field transaction

      await Promise.all([setupPageContext(page1), setupPageContext(page2)])

      const editPage1 = new TransactionEditPage(page1)
      const editPage2 = new TransactionEditPage(page2)

      // Open in both contexts
      await Promise.all([
        editPage1.openEditModal(transaction.id),
        editPage2.openEditModal(transaction.id),
      ])

      // Make comprehensive changes in first context
      await editPage1.fillTransactionForm({
        memo: 'Server memo',
        amount: '250.00',
        date: '2026-01-25',
      })
      await editPage1.save()
      await editPage1.waitForSaveSuccess()

      // Make different changes in second context
      await editPage2.fillTransactionForm({
        memo: 'Local memo',
        amount: '275.00',
        date: '2026-01-26',
      })
      await editPage2.save()

      // Verify conflict shows all differences
      const conflictDialog = new ConflictResolutionDialog(page2)
      await conflictDialog.waitForDialog()

      const differences = await conflictDialog.getDifferences()

      // Should show memo, amount, and date differences
      expect(differences.some((d) => d.field === 'memo')).toBe(true)
      expect(differences.some((d) => d.field === 'amount')).toBe(true)
      expect(differences.some((d) => d.field === 'date')).toBe(true)
    } finally {
      await context1.close()
      await context2.close()
      await browser.close()
    }
  })

  test('should prevent Escape key from closing modal during conflict', async () => {
    const browser = await chromium.launch()
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    try {
      const transaction = SAMPLE_TRANSACTIONS[0]

      await Promise.all([setupPageContext(page1), setupPageContext(page2)])

      const editPage1 = new TransactionEditPage(page1)
      const editPage2 = new TransactionEditPage(page2)

      // Create conflict
      await Promise.all([
        editPage1.openEditModal(transaction.id),
        editPage2.openEditModal(transaction.id),
      ])

      await editPage1.fillTransactionForm({ memo: 'First' })
      await editPage1.save()
      await editPage1.waitForSaveSuccess()

      await editPage2.fillTransactionForm({ memo: 'Second' })
      await editPage2.save()

      // Conflict dialog appears
      const conflictDialog = new ConflictResolutionDialog(page2)
      await conflictDialog.waitForDialog()

      // Try to close with Escape
      await page2.keyboard.press('Escape')

      // Modal should remain open (Escape disabled during conflict)
      await expect(editPage2.modal).toBeVisible()
      await expect(conflictDialog.dialog).toBeVisible()
    } finally {
      await context1.close()
      await context2.close()
      await browser.close()
    }
  })
})

/**
 * Helper to set up authenticated page context.
 */
async function setupPageContext(page: any) {
  // Navigate to login
  await page.goto('/login')

  // Login
  await page.getByLabel(/email/i).fill(TEST_USER.email)
  await page.getByLabel(/password/i).fill(TEST_USER.password)
  await page.getByRole('button', { name: /sign in|login/i }).click()

  // Wait for dashboard
  await page.waitForURL(/\/org\/.*\/dashboard/, { timeout: 10000 })

  // Navigate to transactions
  await page.goto(
    `/org/${TEST_ORG.id}/accounts/${TEST_ACCOUNT.id}/transactions`
  )

  // Wait for list to load
  await page.waitForSelector('[data-testid="transactions-list"]', {
    timeout: 10000,
  })
}
