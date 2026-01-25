import {
  test,
  expect,
  getTransaction,
  getCategory,
} from './fixtures/auth.fixture'
import {
  TRANSACTION_INDEX,
  CATEGORY_NAMES,
} from './fixtures/transaction.fixture'
import {
  TransactionEditPage,
  verifyTransactionInList,
} from './helpers/transaction-edit.helper'

/**
 * E2E Tests: Transaction Edit - Split Editing
 *
 * Tests transaction split editing functionality including:
 * - Adding new splits
 * - Removing splits
 * - Modifying split amounts and categories
 * - Validating split totals match transaction amount
 */

test.describe('Transaction Edit - Split Editing', () => {
  test('should display existing splits when opening transaction', async ({
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

    // Verify splits section is visible
    await expect(editPage.splitsSection).toBeVisible()

    // Verify all splits are displayed
    const splitRows = editPage.splitsSection.locator(
      '[data-testid^="split-row-"]'
    )
    await expect(splitRows).toHaveCount(transaction.splits?.length || 0)

    // Verify split details
    for (let i = 0; i < (transaction.splits?.length || 0); i++) {
      const split = transaction.splits[i]
      const splitRow = splitRows.nth(i)

      // Check category
      const categorySelect = splitRow.getByLabel(/category/i)
      await expect(categorySelect).toHaveValue(split.categoryId)

      // Check amount
      const amountInput = splitRow.getByLabel(/amount/i)
      await expect(amountInput).toHaveValue(split.amount)
    }
  })

  test('should add a new split to transaction', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.GROCERY
    )
    const newCategory = getCategory(
      testContext.testData,
      CATEGORY_NAMES.UTILITIES
    )

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Add new split
    await editPage.addSplit(newCategory.name, '25.00', 'Additional expense')

    // Verify split was added
    const splitRows = editPage.splitsSection.locator(
      '[data-testid^="split-row-"]'
    )
    await expect(splitRows).toHaveCount(2)

    // Update original split amount to maintain total
    await editPage.updateSplit(0, { amount: '100.50' })

    // Save transaction
    await editPage.save()
    await editPage.waitForSaveSuccess()

    // Verify transaction saved successfully
    await verifyTransactionInList(page, transaction.id, {
      amount: transaction.amount,
    })
  })

  test('should remove a split from transaction', async ({
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

    // Get initial split count
    const initialSplitRows = editPage.splitsSection.locator(
      '[data-testid^="split-row-"]'
    )
    const initialCount = await initialSplitRows.count()

    // Remove the second split
    await editPage.removeSplit(1)

    // Verify split was removed
    const updatedSplitRows = editPage.splitsSection.locator(
      '[data-testid^="split-row-"]'
    )
    await expect(updatedSplitRows).toHaveCount(initialCount - 1)

    // Update remaining split to match total amount
    await editPage.updateSplit(0, { amount: transaction.amount })

    // Save transaction
    await editPage.save()
    await editPage.waitForSaveSuccess()
  })

  test('should modify split category', async ({ page, testContext }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.GROCERY
    )
    const newCategory = getCategory(testContext.testData, CATEGORY_NAMES.DINING)

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Change category of first split
    await editPage.updateSplit(0, { category: newCategory.name })

    // Save transaction
    await editPage.save()
    await editPage.waitForSaveSuccess()

    // Re-open and verify category changed
    await editPage.openEditModal(transaction.id)

    const splitRow = editPage.splitsSection
      .locator('[data-testid^="split-row-"]')
      .first()
    const categorySelect = splitRow.getByLabel(/category/i)
    await expect(categorySelect).toHaveValue(newCategory.id)

    await editPage.close()
  })

  test('should modify split amount', async ({ page, testContext }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.SPLIT_EXPENSE
    )
    const newAmounts = ['130.00', '70.00']

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Update split amounts
    await editPage.updateSplit(0, { amount: newAmounts[0] })
    await editPage.updateSplit(1, { amount: newAmounts[1] })

    // Save transaction
    await editPage.save()
    await editPage.waitForSaveSuccess()

    // Re-open and verify amounts changed
    await editPage.openEditModal(transaction.id)

    const splitRows = editPage.splitsSection.locator(
      '[data-testid^="split-row-"]'
    )
    for (let i = 0; i < newAmounts.length; i++) {
      const amountInput = splitRows.nth(i).getByLabel(/amount/i)
      await expect(amountInput).toHaveValue(newAmounts[i])
    }

    await editPage.close()
  })

  test('should validate split total equals transaction amount', async ({
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

    // Modify split to create mismatch
    await editPage.updateSplit(0, { amount: '50.00' })
    // Second split remains at 80.00, total = 130.00 but transaction is 200.00

    // Try to save
    await editPage.save()

    // Should show validation error
    const errorMessage = await editPage.getValidationError('splits')
    expect(errorMessage).toBeTruthy()
    expect(errorMessage).toMatch(/split.*total.*match|amount.*mismatch/i)

    // Modal should remain open
    await expect(editPage.modal).toBeVisible()

    // Fix the split amounts
    await editPage.updateSplit(0, { amount: '120.00' })

    // Now save should succeed
    await editPage.save()
    await editPage.waitForSaveSuccess()
  })

  test('should display split total and remaining amount', async ({
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

    // Verify split total is displayed
    const splitTotal = editPage.splitsSection.locator(
      '[data-testid="split-total"]'
    )
    await expect(splitTotal).toBeVisible()
    await expect(splitTotal).toContainText(transaction.amount)

    // Modify a split amount
    await editPage.updateSplit(0, { amount: '90.00' })

    // Verify remaining amount updates
    const remaining = editPage.splitsSection.locator(
      '[data-testid="split-remaining"]'
    )
    await expect(remaining).toBeVisible()
    await expect(remaining).toContainText('110.00') // 200 - 90
  })

  test('should handle converting single split to multiple splits', async ({
    page,
    testContext,
  }) => {
    const editPage = new TransactionEditPage(page)
    const transaction = getTransaction(
      testContext.testData,
      TRANSACTION_INDEX.GROCERY
    )
    const categories = [
      getCategory(testContext.testData, CATEGORY_NAMES.DINING),
      getCategory(testContext.testData, CATEGORY_NAMES.ENTERTAINMENT),
    ]

    // Open edit modal
    await editPage.openEditModal(transaction.id)

    // Update first split
    await editPage.updateSplit(0, {
      category: categories[0].name,
      amount: '75.50',
    })

    // Add second split
    await editPage.addSplit(categories[1].name, '50.00')

    // Total should match transaction amount
    const transactionAmount = parseFloat(transaction.amount)
    const splitTotal = 75.5 + 50.0
    expect(splitTotal).toBe(transactionAmount)

    // Save transaction
    await editPage.save()
    await editPage.waitForSaveSuccess()

    // Re-open and verify splits
    await editPage.openEditModal(transaction.id)

    const splitRows = editPage.splitsSection.locator(
      '[data-testid^="split-row-"]'
    )
    await expect(splitRows).toHaveCount(2)

    await editPage.close()
  })

  test('should handle converting multiple splits to single split', async ({
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

    // Remove all but one split
    const initialSplitRows = editPage.splitsSection.locator(
      '[data-testid^="split-row-"]'
    )
    const initialCount = await initialSplitRows.count()

    for (let i = initialCount - 1; i > 0; i--) {
      await editPage.removeSplit(i)
    }

    // Update remaining split to full amount
    await editPage.updateSplit(0, { amount: transaction.amount })

    // Save transaction
    await editPage.save()
    await editPage.waitForSaveSuccess()

    // Re-open and verify single split
    await editPage.openEditModal(transaction.id)

    const splitRows = editPage.splitsSection.locator(
      '[data-testid^="split-row-"]'
    )
    await expect(splitRows).toHaveCount(1)

    await editPage.close()
  })

  test('should preserve split order after edit', async ({
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

    // Get original split order
    const originalSplits = transaction.splits.map((s) => s.categoryName)

    // Modify amounts but keep order
    await editPage.updateSplit(0, { amount: '110.00' })
    await editPage.updateSplit(1, { amount: '90.00' })

    // Save
    await editPage.save()
    await editPage.waitForSaveSuccess()

    // Re-open and verify order preserved
    await editPage.openEditModal(transaction.id)

    const splitRows = editPage.splitsSection.locator(
      '[data-testid^="split-row-"]'
    )
    for (let i = 0; i < originalSplits.length; i++) {
      const categorySelect = splitRows.nth(i).getByLabel(/category/i)
      const selectedOption = await categorySelect.inputValue()
      const category = testContext.testData.categories.find(
        (c) => c.id === selectedOption
      )
      expect(category?.name).toBe(originalSplits[i])
    }

    await editPage.close()
  })
})
