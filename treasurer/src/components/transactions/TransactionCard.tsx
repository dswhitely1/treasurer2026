import { memo } from 'react'
import { Card } from '@/components/ui'
import type { AccountTransaction } from '@/types'

interface TransactionCardProps {
  transaction: AccountTransaction
  onEdit?: (transaction: AccountTransaction) => void
  onDelete?: (transaction: AccountTransaction) => void
}

const transactionTypeLabels: Record<string, string> = {
  INCOME: 'Income',
  EXPENSE: 'Expense',
  TRANSFER: 'Transfer',
}

const transactionTypeColors: Record<string, string> = {
  INCOME: 'bg-green-100 text-green-800',
  EXPENSE: 'bg-red-100 text-red-800',
  TRANSFER: 'bg-blue-100 text-blue-800',
}

export const TransactionCard = memo(function TransactionCard({
  transaction,
  onEdit,
  onDelete,
}: TransactionCardProps) {
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const isExpense = transaction.transactionType === 'EXPENSE'

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{transaction.description}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                transactionTypeColors[transaction.transactionType]
              }`}
            >
              {transactionTypeLabels[transaction.transactionType]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{formatDate(transaction.date)}</p>

          {transaction.splits.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {transaction.splits.map((split) => (
                <span
                  key={split.id}
                  className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                >
                  {split.categoryName}: {formatCurrency(split.amount)}
                </span>
              ))}
            </div>
          )}

          {transaction.feeAmount && (
            <p className="mt-1 text-xs text-gray-500">
              Fee: {formatCurrency(transaction.feeAmount)}
            </p>
          )}
        </div>

        <div className="ml-4 text-right">
          <p
            className={`text-lg font-semibold ${
              isExpense ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {isExpense ? '-' : '+'}
            {formatCurrency(transaction.amount)}
          </p>
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="mt-3 flex justify-end gap-2 border-t border-gray-100 pt-3">
          {onEdit && (
            <button
              onClick={() => onEdit(transaction)}
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(transaction)}
              className="text-sm font-medium text-red-600 hover:text-red-500"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </Card>
  )
})
