import { describe, it, expect } from 'vitest'
import { render, screen } from '../../utils'
import { TransactionCard } from '@/components/transactions'
import type { AccountTransaction } from '@/types'

const mockTransaction: AccountTransaction = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  description: 'Grocery shopping',
  amount: '150.00',
  transactionType: 'EXPENSE',
  date: '2024-01-15T10:00:00.000Z',
  feeAmount: null,
  vendorId: null,
  vendorName: null,
  accountId: '123e4567-e89b-12d3-a456-426614174001',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  splits: [
    {
      id: 'split-1',
      amount: '100.00',
      categoryId: 'cat-1',
      categoryName: 'Food',
    },
    {
      id: 'split-2',
      amount: '50.00',
      categoryId: 'cat-2',
      categoryName: 'Household',
    },
  ],
}

describe('TransactionCard', () => {
  it('renders transaction description', () => {
    render(<TransactionCard transaction={mockTransaction} />)
    expect(screen.getByText('Grocery shopping')).toBeInTheDocument()
  })

  it('renders transaction amount as currency with sign', () => {
    render(<TransactionCard transaction={mockTransaction} />)
    // Expense shows negative sign
    expect(screen.getByText('-$150.00')).toBeInTheDocument()
  })

  it('renders transaction type badge', () => {
    render(<TransactionCard transaction={mockTransaction} />)
    expect(screen.getByText('Expense')).toBeInTheDocument()
  })

  it('renders formatted date', () => {
    render(<TransactionCard transaction={mockTransaction} />)
    // The date format may vary by locale, check for the presence of some date text
    expect(screen.getByText(/Jan/i)).toBeInTheDocument()
  })

  it('renders category splits', () => {
    render(<TransactionCard transaction={mockTransaction} />)
    // Category splits are displayed as "categoryName: $amount"
    expect(screen.getByText('Food: $100.00')).toBeInTheDocument()
    expect(screen.getByText('Household: $50.00')).toBeInTheDocument()
  })

  it('renders different transaction types correctly', () => {
    const incomeTransaction = {
      ...mockTransaction,
      transactionType: 'INCOME' as const,
    }
    const { rerender } = render(
      <TransactionCard transaction={incomeTransaction} />
    )
    expect(screen.getByText('Income')).toBeInTheDocument()

    const transferTransaction = {
      ...mockTransaction,
      transactionType: 'TRANSFER' as const,
    }
    rerender(<TransactionCard transaction={transferTransaction} />)
    expect(screen.getByText('Transfer')).toBeInTheDocument()
  })

  it('renders fee amount when present', () => {
    const transactionWithFee = { ...mockTransaction, feeAmount: '2.50' }
    render(<TransactionCard transaction={transactionWithFee} />)
    expect(screen.getByText(/Fee: \$2\.50/)).toBeInTheDocument()
  })

  it('does not render fee when not present', () => {
    render(<TransactionCard transaction={mockTransaction} />)
    expect(screen.queryByText(/Fee:/)).not.toBeInTheDocument()
  })
})
