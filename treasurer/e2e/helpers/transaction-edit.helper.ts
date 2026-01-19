import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Page object model for Transaction Edit Modal.
 */
export class TransactionEditPage {
  readonly page: Page
  readonly modal: Locator
  readonly closeButton: Locator
  readonly memoInput: Locator
  readonly amountInput: Locator
  readonly dateInput: Locator
  readonly typeSelect: Locator
  readonly saveButton: Locator
  readonly cancelButton: Locator
  readonly editHistoryTab: Locator
  readonly splitsSection: Locator
  readonly addSplitButton: Locator

  constructor(page: Page) {
    this.page = page
    this.modal = page.locator('[role="dialog"][aria-modal="true"]')
    this.closeButton = this.modal.locator('button[aria-label="Close modal"]')
    this.memoInput = this.modal.getByLabel(/memo|description/i)
    this.amountInput = this.modal.getByLabel(/amount/i)
    this.dateInput = this.modal.getByLabel(/date/i)
    this.typeSelect = this.modal.getByLabel(/type/i)
    this.saveButton = this.modal.getByRole('button', { name: /save/i })
    this.cancelButton = this.modal.getByRole('button', { name: /cancel/i })
    this.editHistoryTab = this.modal.getByRole('button', { name: /edit history/i })
    this.splitsSection = this.modal.locator('[data-testid="splits-section"]')
    this.addSplitButton = this.modal.getByRole('button', { name: /add split/i })
  }

  /**
   * Open the edit modal for a specific transaction.
   */
  async openEditModal(transactionId: string) {
    // Click edit button on transaction row
    const editButton = this.page.locator(
      `[data-testid="transaction-row-${transactionId}"] button[aria-label*="Edit"]`
    )
    await editButton.click()

    // Wait for modal to appear
    await expect(this.modal).toBeVisible({ timeout: 5000 })

    // Verify URL contains edit query param
    await this.page.waitForURL(`**?*edit=${transactionId}*`, { timeout: 5000 })
  }

  /**
   * Fill in transaction form fields.
   */
  async fillTransactionForm(data: {
    memo?: string
    amount?: string
    date?: string
    type?: string
  }) {
    if (data.memo !== undefined) {
      await this.memoInput.clear()
      await this.memoInput.fill(data.memo)
    }

    if (data.amount !== undefined) {
      await this.amountInput.clear()
      await this.amountInput.fill(data.amount)
    }

    if (data.date !== undefined) {
      await this.dateInput.clear()
      await this.dateInput.fill(data.date)
    }

    if (data.type !== undefined) {
      await this.typeSelect.selectOption(data.type)
    }
  }

  /**
   * Add a split to the transaction.
   */
  async addSplit(categoryName: string, amount: string, memo?: string) {
    await this.addSplitButton.click()

    // Get the last split row (newly added)
    const splitRows = this.splitsSection.locator('[data-testid^="split-row-"]')
    const lastSplitRow = splitRows.last()

    // Fill in split details
    const categorySelect = lastSplitRow.getByLabel(/category/i)
    const amountInput = lastSplitRow.getByLabel(/amount/i)
    const memoInput = lastSplitRow.getByLabel(/memo/i)

    await categorySelect.selectOption({ label: categoryName })
    await amountInput.fill(amount)

    if (memo) {
      await memoInput.fill(memo)
    }
  }

  /**
   * Remove a split by index.
   */
  async removeSplit(index: number) {
    const splitRows = this.splitsSection.locator('[data-testid^="split-row-"]')
    const targetSplit = splitRows.nth(index)
    const removeButton = targetSplit.getByRole('button', { name: /remove|delete/i })
    await removeButton.click()
  }

  /**
   * Update an existing split.
   */
  async updateSplit(
    index: number,
    data: { category?: string; amount?: string; memo?: string }
  ) {
    const splitRows = this.splitsSection.locator('[data-testid^="split-row-"]')
    const targetSplit = splitRows.nth(index)

    if (data.category) {
      const categorySelect = targetSplit.getByLabel(/category/i)
      await categorySelect.selectOption({ label: data.category })
    }

    if (data.amount !== undefined) {
      const amountInput = targetSplit.getByLabel(/amount/i)
      await amountInput.clear()
      await amountInput.fill(data.amount)
    }

    if (data.memo !== undefined) {
      const memoInput = targetSplit.getByLabel(/memo/i)
      await memoInput.clear()
      await memoInput.fill(data.memo)
    }
  }

  /**
   * Save the transaction.
   */
  async save() {
    await this.saveButton.click()
  }

  /**
   * Save using keyboard shortcut (Cmd/Ctrl+S).
   */
  async saveWithKeyboard() {
    await this.page.keyboard.press('ControlOrMeta+s')
  }

  /**
   * Close the modal.
   */
  async close() {
    await this.closeButton.click()
  }

  /**
   * Close using keyboard shortcut (Escape).
   */
  async closeWithKeyboard() {
    await this.page.keyboard.press('Escape')
  }

  /**
   * Wait for modal to close.
   */
  async waitForClose() {
    await expect(this.modal).toBeHidden({ timeout: 5000 })
  }

  /**
   * Wait for save success (modal closes and list updates).
   */
  async waitForSaveSuccess() {
    await this.waitForClose()

    // Wait for success notification
    const notification = this.page.locator('[role="alert"]', {
      hasText: /saved|updated/i,
    })
    await expect(notification).toBeVisible({ timeout: 5000 })
  }

  /**
   * Get validation error message for a field.
   */
  async getValidationError(fieldName: string): Promise<string | null> {
    const errorMessage = this.modal.locator(
      `[data-testid="${fieldName}-error"], [id="${fieldName}-error"]`
    )

    if (await errorMessage.isVisible()) {
      return errorMessage.textContent()
    }

    return null
  }

  /**
   * Open edit history panel.
   */
  async openEditHistory() {
    await this.editHistoryTab.click()

    // Wait for history panel to expand
    const historyPanel = this.modal.locator('[data-testid="edit-history-panel"]')
    await expect(historyPanel).toBeVisible({ timeout: 3000 })
  }

  /**
   * Get edit history entries.
   */
  async getEditHistoryEntries() {
    const historyPanel = this.modal.locator('[data-testid="edit-history-panel"]')
    const entries = historyPanel.locator('[data-testid^="history-entry-"]')
    return entries
  }

  /**
   * Expand a history entry to see details.
   */
  async expandHistoryEntry(index: number) {
    const entries = await this.getEditHistoryEntries()
    const targetEntry = entries.nth(index)
    const expandButton = targetEntry.getByRole('button', {
      name: /expand|show details/i,
    })
    await expandButton.click()
  }
}

/**
 * Page object model for Conflict Resolution Dialog.
 */
export class ConflictResolutionDialog {
  readonly page: Page
  readonly dialog: Locator
  readonly keepMyChangesButton: Locator
  readonly useServerVersionButton: Locator
  readonly cancelButton: Locator
  readonly yourVersionPanel: Locator
  readonly serverVersionPanel: Locator

  constructor(page: Page) {
    this.page = page
    this.dialog = page.locator('[data-testid="conflict-resolution-dialog"]')
    this.keepMyChangesButton = this.dialog.getByRole('button', {
      name: /keep my changes|force save/i,
    })
    this.useServerVersionButton = this.dialog.getByRole('button', {
      name: /use server version|reload/i,
    })
    this.cancelButton = this.dialog.getByRole('button', { name: /cancel/i })
    this.yourVersionPanel = this.dialog.locator('[data-testid="your-version"]')
    this.serverVersionPanel = this.dialog.locator('[data-testid="server-version"]')
  }

  /**
   * Wait for conflict dialog to appear.
   */
  async waitForDialog() {
    await expect(this.dialog).toBeVisible({ timeout: 5000 })
  }

  /**
   * Choose to keep local changes.
   */
  async keepMyChanges() {
    await this.keepMyChangesButton.click()
  }

  /**
   * Choose to use server version.
   */
  async useServerVersion() {
    await this.useServerVersionButton.click()
  }

  /**
   * Cancel conflict resolution.
   */
  async cancel() {
    await this.cancelButton.click()
  }

  /**
   * Get the differences shown in the conflict dialog.
   */
  async getDifferences() {
    const diffItems = this.dialog.locator('[data-testid^="diff-item-"]')
    const count = await diffItems.count()
    const differences: { field: string; yourValue: string; serverValue: string }[] = []

    for (let i = 0; i < count; i++) {
      const item = diffItems.nth(i)
      const field = await item.getAttribute('data-field')
      const yourValue = await item
        .locator('[data-testid="your-value"]')
        .textContent()
      const serverValue = await item
        .locator('[data-testid="server-value"]')
        .textContent()

      if (field && yourValue && serverValue) {
        differences.push({ field, yourValue, serverValue })
      }
    }

    return differences
  }
}

/**
 * Helper to wait for network idle.
 */
export async function waitForNetworkIdle(page: Page, timeout = 2000) {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Helper to verify transaction appears in list with updated values.
 */
export async function verifyTransactionInList(
  page: Page,
  transactionId: string,
  expectedData: { memo?: string; amount?: string; date?: string }
) {
  const transactionRow = page.locator(
    `[data-testid="transaction-row-${transactionId}"]`
  )

  await expect(transactionRow).toBeVisible({ timeout: 5000 })

  if (expectedData.memo) {
    await expect(transactionRow.getByText(expectedData.memo)).toBeVisible()
  }

  if (expectedData.amount) {
    await expect(transactionRow.getByText(expectedData.amount)).toBeVisible()
  }

  if (expectedData.date) {
    await expect(transactionRow.getByText(expectedData.date)).toBeVisible()
  }
}
