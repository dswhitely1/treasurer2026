/**
 * Transaction test data fixtures for E2E tests.
 */

export interface TestTransaction {
  id: string
  memo: string
  amount: string
  date: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  status?: 'UNCLEARED' | 'CLEARED' | 'RECONCILED'
  version?: number
  splits?: TestTransactionSplit[]
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
 * Sample transactions for testing.
 */
export const SAMPLE_TRANSACTIONS: TestTransaction[] = [
  {
    id: 'txn-1',
    memo: 'Grocery shopping',
    amount: '125.50',
    date: '2026-01-15',
    type: 'EXPENSE',
    status: 'UNCLEARED',
    version: 1,
    splits: [
      {
        id: 'split-1',
        categoryId: 'cat-groceries',
        categoryName: 'Groceries',
        amount: '125.50',
      },
    ],
  },
  {
    id: 'txn-2',
    memo: 'Monthly salary',
    amount: '5000.00',
    date: '2026-01-01',
    type: 'INCOME',
    status: 'CLEARED',
    version: 1,
    splits: [
      {
        id: 'split-2',
        categoryId: 'cat-salary',
        categoryName: 'Salary',
        amount: '5000.00',
      },
    ],
  },
  {
    id: 'txn-3',
    memo: 'Split expense - Restaurant and Entertainment',
    amount: '200.00',
    date: '2026-01-10',
    type: 'EXPENSE',
    status: 'UNCLEARED',
    version: 2,
    splits: [
      {
        id: 'split-3a',
        categoryId: 'cat-dining',
        categoryName: 'Dining Out',
        amount: '120.00',
      },
      {
        id: 'split-3b',
        categoryId: 'cat-entertainment',
        categoryName: 'Entertainment',
        amount: '80.00',
      },
    ],
  },
  {
    id: 'txn-reconciled',
    memo: 'Reconciled transaction - should not be editable',
    amount: '50.00',
    date: '2026-01-05',
    type: 'EXPENSE',
    status: 'RECONCILED',
    version: 1,
    splits: [
      {
        id: 'split-rec',
        categoryId: 'cat-utilities',
        categoryName: 'Utilities',
        amount: '50.00',
      },
    ],
  },
]

/**
 * Sample categories for testing.
 */
export const SAMPLE_CATEGORIES: TestCategory[] = [
  { id: 'cat-groceries', name: 'Groceries', type: 'EXPENSE' },
  { id: 'cat-salary', name: 'Salary', type: 'INCOME' },
  { id: 'cat-dining', name: 'Dining Out', type: 'EXPENSE' },
  { id: 'cat-entertainment', name: 'Entertainment', type: 'EXPENSE' },
  { id: 'cat-utilities', name: 'Utilities', type: 'EXPENSE' },
  { id: 'cat-rent', name: 'Rent', type: 'EXPENSE' },
  { id: 'cat-transportation', name: 'Transportation', type: 'EXPENSE' },
]

/**
 * Get a transaction by ID.
 */
export function getTransactionById(id: string): TestTransaction | undefined {
  return SAMPLE_TRANSACTIONS.find((txn) => txn.id === id)
}

/**
 * Get a category by ID.
 */
export function getCategoryById(id: string): TestCategory | undefined {
  return SAMPLE_CATEGORIES.find((cat) => cat.id === id)
}
