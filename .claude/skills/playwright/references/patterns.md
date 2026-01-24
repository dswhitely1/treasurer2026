# Playwright Patterns Reference

## Contents
- Locator Strategies
- Page Object Model
- Assertion Patterns
- Anti-Patterns

## Locator Strategies

### Priority Order

Use locators in this order (most to least preferred):

```typescript
// 1. Role + accessible name (BEST - tests accessibility too)
page.getByRole('button', { name: 'Save Transaction' })
page.getByRole('dialog', { name: 'Edit Transaction' })

// 2. Test IDs (when role isn't feasible)
page.getByTestId('transaction-row')
page.getByTestId('amount-input')

// 3. Label text (for form fields)
page.getByLabel('Amount')
page.getByLabel('Transaction Date')

// 4. Placeholder (acceptable for inputs)
page.getByPlaceholder('Enter memo...')

// 5. CSS selectors (LAST RESORT)
page.locator('.transaction-card:first-child')
```

### Chaining Locators

```typescript
// Scope to specific container
const modal = page.getByRole('dialog')
await modal.getByRole('button', { name: 'Save' }).click()

// Filter by text content
page.getByRole('row').filter({ hasText: 'Grocery Store' })

// Nth element when needed
page.getByTestId('transaction-row').nth(0)
```

## Page Object Model

### Transaction Edit Page Object

```typescript
// e2e/helpers/transaction-edit.helper.ts
import { Page, Locator, expect } from '@playwright/test'

export class TransactionEditPage {
  readonly page: Page
  readonly modal: Locator
  readonly amountInput: Locator
  readonly memoInput: Locator
  readonly saveButton: Locator

  constructor(page: Page) {
    this.page = page
    this.modal = page.getByRole('dialog', { name: 'Edit Transaction' })
    this.amountInput = this.modal.getByLabel('Amount')
    this.memoInput = this.modal.getByLabel('Memo')
    this.saveButton = this.modal.getByRole('button', { name: 'Save' })
  }

  async openForTransaction(transactionId: string) {
    await this.page.getByTestId(`transaction-${transactionId}`).click()
    await this.page.getByRole('button', { name: 'Edit' }).click()
    await expect(this.modal).toBeVisible()
  }

  async fillAmount(amount: string) {
    await this.amountInput.clear()
    await this.amountInput.fill(amount)
  }

  async save() {
    await this.saveButton.click()
    await expect(this.modal).not.toBeVisible()
  }
}
```

### Usage in Tests

```typescript
import { TransactionEditPage } from './helpers/transaction-edit.helper'

test('edit transaction amount', async ({ page }) => {
  const editPage = new TransactionEditPage(page)
  
  await editPage.openForTransaction('abc123')
  await editPage.fillAmount('150.00')
  await editPage.save()
  
  await expect(page.getByText('$150.00')).toBeVisible()
})
```

## Assertion Patterns

### Visibility Assertions

```typescript
// Element should be visible
await expect(page.getByRole('dialog')).toBeVisible()

// Element should NOT be visible (hidden or removed)
await expect(page.getByRole('dialog')).not.toBeVisible()

// Wait for element to appear then disappear (loading states)
await expect(page.getByRole('progressbar')).toBeVisible()
await expect(page.getByRole('progressbar')).not.toBeVisible()
```

### Text Content Assertions

```typescript
// Exact text
await expect(locator).toHaveText('Transaction saved')

// Contains text
await expect(locator).toContainText('saved')

// Regex match
await expect(locator).toHaveText(/Transaction \d+ saved/)
```

### Form State Assertions

```typescript
// Input values
await expect(page.getByLabel('Amount')).toHaveValue('100.00')

// Disabled state
await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()

// Checked state
await expect(page.getByRole('checkbox')).toBeChecked()
```

## Anti-Patterns

### WARNING: Hard-coded Timeouts

**The Problem:**

```typescript
// BAD - Arbitrary wait, flaky and slow
await page.click('#save-button')
await page.waitForTimeout(2000)
await expect(page.locator('.success')).toBeVisible()
```

**Why This Breaks:**
1. Tests are slower than necessary (always waits full duration)
2. Still flaky on slow CI runners
3. Doesn't communicate intent

**The Fix:**

```typescript
// GOOD - Wait for specific condition
await page.getByRole('button', { name: 'Save' }).click()
await expect(page.getByRole('alert')).toContainText('saved')
```

### WARNING: CSS Selectors Over Roles

**The Problem:**

```typescript
// BAD - Brittle, doesn't test accessibility
await page.click('.btn-primary.submit-form')
await page.locator('div.modal > div.content > button').click()
```

**Why This Breaks:**
1. CSS class changes break tests
2. Misses accessibility issues
3. Hard to understand test intent

**The Fix:**

```typescript
// GOOD - Semantic and accessible
await page.getByRole('button', { name: 'Submit' }).click()
await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click()
```

### WARNING: Missing Assertions After Actions

**The Problem:**

```typescript
// BAD - No verification action succeeded
test('delete transaction', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  // Test ends without checking result
})
```

**Why This Breaks:**
1. Silent failures go unnoticed
2. API errors aren't caught
3. Race conditions hide bugs

**The Fix:**

```typescript
// GOOD - Verify expected outcome
test('delete transaction', async ({ page }) => {
  const row = page.getByTestId('transaction-row').first()
  const transactionText = await row.textContent()
  
  await row.getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  
  await expect(page.getByRole('alert')).toContainText('deleted')
  await expect(page.getByText(transactionText!)).not.toBeVisible()
})