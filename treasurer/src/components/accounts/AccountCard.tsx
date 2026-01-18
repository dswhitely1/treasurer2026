import { memo } from 'react'
import { Link } from 'react-router-dom'
import type { Account, AccountType } from '@/types'
import { Card, Button } from '@/components/ui'

interface AccountCardProps {
  account: Account
  orgId: string
  onEdit?: (account: Account) => void
  onDelete?: (account: Account) => void
}

const accountTypeLabels: Record<AccountType, string> = {
  CHECKING: 'Checking',
  SAVINGS: 'Savings',
  CREDIT_CARD: 'Credit Card',
  CASH: 'Cash',
  INVESTMENT: 'Investment',
  OTHER: 'Other',
}

const accountTypeColors: Record<AccountType, string> = {
  CHECKING: 'bg-blue-100 text-blue-800',
  SAVINGS: 'bg-green-100 text-green-800',
  CREDIT_CARD: 'bg-purple-100 text-purple-800',
  CASH: 'bg-yellow-100 text-yellow-800',
  INVESTMENT: 'bg-indigo-100 text-indigo-800',
  OTHER: 'bg-gray-100 text-gray-800',
}

function formatCurrency(amount: string, currency: string): string {
  const num = parseFloat(amount)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(num)
}

export const AccountCard = memo(function AccountCard({
  account,
  orgId,
  onEdit,
  onDelete,
}: AccountCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${accountTypeColors[account.accountType]}`}
            >
              {accountTypeLabels[account.accountType]}
            </span>
            {!account.isActive && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                Inactive
              </span>
            )}
          </div>
          {account.institution && (
            <p className="mt-1 text-sm text-gray-500">{account.institution}</p>
          )}
          {account.description && (
            <p className="mt-2 text-sm text-gray-600">{account.description}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(account.balance, account.currency)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
        <Link to={`/organizations/${orgId}/accounts/${account.id}/transactions`}>
          <Button variant="outline" size="sm">
            View Transactions
          </Button>
        </Link>
        {(onEdit || onDelete) && (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(account)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(account)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
})
