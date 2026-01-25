/**
 * Transaction type definitions for E2E tests.
 *
 * Note: Actual test data is now created dynamically via the API helper.
 * These types match the data returned from the API.
 */

export interface TestTransaction {
  id: string
  description: string
  amount: string
  date: string
  transactionType: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  status: 'UNCLEARED' | 'CLEARED' | 'RECONCILED'
  version: number
  splits: TestTransactionSplit[]
}

export interface TestTransactionSplit {
  id: string
  categoryId: string
  categoryName: string
  amount: string
  memo?: string
}

export interface TestCategory {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
}

/**
 * Transaction indices in the test data.
 * These correspond to the order transactions are created in setupTestData().
 */
export const TRANSACTION_INDEX = {
  /** Grocery shopping - UNCLEARED, single split */
  GROCERY: 0,
  /** Monthly salary - CLEARED, single split */
  SALARY: 1,
  /** Split expense - UNCLEARED, multiple splits */
  SPLIT_EXPENSE: 2,
  /** Reconciled transaction - should not be editable */
  RECONCILED: 3,
} as const

/**
 * Category names available in test data.
 */
export const CATEGORY_NAMES = {
  GROCERIES: 'Groceries',
  SALARY: 'Salary',
  DINING: 'Dining Out',
  ENTERTAINMENT: 'Entertainment',
  UTILITIES: 'Utilities',
} as const
