import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../../utils'
import { AccountCard } from '@/components/accounts'
import type { Account } from '@/types'

const mockAccount: Account = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Main Checking',
  description: 'Primary checking account',
  institution: 'Chase Bank',
  accountType: 'CHECKING',
  balance: '1500.50',
  currency: 'USD',
  isActive: true,
  organizationId: '123e4567-e89b-12d3-a456-426614174001',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

describe('AccountCard', () => {
  it('renders account name', () => {
    render(<AccountCard account={mockAccount} />)
    expect(screen.getByText('Main Checking')).toBeInTheDocument()
  })

  it('renders account type badge', () => {
    render(<AccountCard account={mockAccount} />)
    expect(screen.getByText('Checking')).toBeInTheDocument()
  })

  it('renders institution name when provided', () => {
    render(<AccountCard account={mockAccount} />)
    expect(screen.getByText('Chase Bank')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<AccountCard account={mockAccount} />)
    expect(screen.getByText('Primary checking account')).toBeInTheDocument()
  })

  it('formats balance as currency', () => {
    render(<AccountCard account={mockAccount} />)
    expect(screen.getByText('$1,500.50')).toBeInTheDocument()
  })

  it('shows inactive badge when account is inactive', () => {
    const inactiveAccount = { ...mockAccount, isActive: false }
    render(<AccountCard account={inactiveAccount} />)
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('does not show inactive badge when account is active', () => {
    render(<AccountCard account={mockAccount} />)
    expect(screen.queryByText('Inactive')).not.toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', () => {
    const handleEdit = vi.fn()
    render(<AccountCard account={mockAccount} onEdit={handleEdit} />)

    fireEvent.click(screen.getByText('Edit'))
    expect(handleEdit).toHaveBeenCalledWith(mockAccount)
  })

  it('calls onDelete when delete button is clicked', () => {
    const handleDelete = vi.fn()
    render(<AccountCard account={mockAccount} onDelete={handleDelete} />)

    fireEvent.click(screen.getByText('Delete'))
    expect(handleDelete).toHaveBeenCalledWith(mockAccount)
  })

  it('does not show edit button when onEdit is not provided', () => {
    render(<AccountCard account={mockAccount} />)
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('does not show delete button when onDelete is not provided', () => {
    render(<AccountCard account={mockAccount} />)
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('renders different account types with correct labels', () => {
    const savingsAccount = { ...mockAccount, accountType: 'SAVINGS' as const }
    const { rerender } = render(<AccountCard account={savingsAccount} />)
    expect(screen.getByText('Savings')).toBeInTheDocument()

    const creditCardAccount = { ...mockAccount, accountType: 'CREDIT_CARD' as const }
    rerender(<AccountCard account={creditCardAccount} />)
    expect(screen.getByText('Credit Card')).toBeInTheDocument()

    const cashAccount = { ...mockAccount, accountType: 'CASH' as const }
    rerender(<AccountCard account={cashAccount} />)
    expect(screen.getByText('Cash')).toBeInTheDocument()

    const investmentAccount = { ...mockAccount, accountType: 'INVESTMENT' as const }
    rerender(<AccountCard account={investmentAccount} />)
    expect(screen.getByText('Investment')).toBeInTheDocument()
  })
})
