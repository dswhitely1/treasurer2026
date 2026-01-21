import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchTransactions,
  createTransaction,
  deleteTransaction,
  clearTransactionError,
  selectTransactions,
  selectTransactionTotal,
  selectTransactionLoading,
  selectTransactionError,
} from '@/store/features/transactionSlice'
import {
  selectStatusFilter,
  selectSelectionCount,
  clearSelection,
} from '@/store/features/statusSlice'
import { selectIsOrgAdmin } from '@/store/features/organizationSlice'
import { Card, Button } from '@/components/ui'
import {
  TransactionCard,
  EnhancedTransactionForm,
  TransactionEditModal,
  type CreateTransactionData,
} from '@/components/transactions'
import { ExportTransactionsPanel } from '@/components/export'
import {
  StatusFilterControls,
  TransactionBulkActions,
  SelectAllCheckbox,
  useBulkSelection,
  useTransactionStatus,
  useStatusKeyboardShortcuts,
} from '@/features/status'
import type { Account, AccountTransaction } from '@/types'
import type {
  TransactionStatus,
  StatusFilterState,
} from '@/features/status/types'
import { accountApi } from '@/lib/api/accounts'
import { logger } from '@/utils/logger'

/**
 * Enhanced Transaction Card with status and selection.
 */
interface EnhancedTransactionCardProps {
  transaction: AccountTransaction
  isSelected: boolean
  onToggleSelect: (id: string) => void
  onStatusChange: (id: string, status: TransactionStatus) => void
  onEdit?: (transaction: AccountTransaction) => void
  onDelete?: (transaction: AccountTransaction) => void
  isStatusChanging?: boolean
}

function EnhancedTransactionCard({
  transaction,
  isSelected,
  onToggleSelect,
  onStatusChange,
  onEdit,
  onDelete,
  isStatusChanging,
}: EnhancedTransactionCardProps) {
  // Default status if not present (for backwards compatibility)
  const status =
    (transaction as AccountTransaction & { status?: TransactionStatus })
      .status || 'UNCLEARED'

  return (
    <div className="flex items-start gap-3">
      {/* Selection checkbox */}
      <div className="pt-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(transaction.id)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          aria-label={`Select transaction: ${transaction.description}`}
        />
      </div>

      {/* Transaction card */}
      <div className="flex-1">
        <TransactionCard
          transaction={transaction}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      {/* Status badge - quick status indicator */}
      <div className="pt-4">
        <button
          type="button"
          onClick={() => {
            // Cycle through statuses: UNCLEARED -> CLEARED -> UNCLEARED
            const nextStatus = status === 'UNCLEARED' ? 'CLEARED' : 'UNCLEARED'
            onStatusChange(transaction.id, nextStatus)
          }}
          disabled={isStatusChanging}
          className={`
            inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium
            transition-colors
            ${status === 'UNCLEARED' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : ''}
            ${status === 'CLEARED' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : ''}
            ${status === 'RECONCILED' ? 'bg-green-100 text-green-700' : ''}
            ${isStatusChanging ? 'cursor-wait opacity-50' : 'cursor-pointer'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          `}
          title={`Status: ${status}. Click to toggle.`}
        >
          {status === 'UNCLEARED' && (
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          )}
          {status === 'CLEARED' && (
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8L6.5 11.5L13 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
          {status === 'RECONCILED' && (
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
              <path
                d="M1 8L4 11L9 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M6 8L9 11L15 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
          <span className="sr-only md:not-sr-only">
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </span>
        </button>
      </div>
    </div>
  )
}

export function TransactionsPage() {
  const { orgId, accountId } = useParams<{ orgId: string; accountId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const dispatch = useAppDispatch()
  const transactions = useAppSelector(selectTransactions)
  const total = useAppSelector(selectTransactionTotal)
  const isLoading = useAppSelector(selectTransactionLoading)
  const error = useAppSelector(selectTransactionError)
  const isAdmin = useAppSelector(selectIsOrgAdmin)
  const statusFilter = useAppSelector(selectStatusFilter)
  const selectedCount = useAppSelector(selectSelectionCount)

  const [account, setAccount] = useState<Account | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [statusCounts, setStatusCounts] = useState<
    Record<TransactionStatus, number>
  >({
    UNCLEARED: 0,
    CLEARED: 0,
    RECONCILED: 0,
  })

  // Handle opening edit modal via URL param
  const handleEditTransaction = useCallback(
    (transaction: AccountTransaction) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('edit', transaction.id)
      setSearchParams(newParams)
      // Note: Don't call openEditModal here - let TransactionEditModal's useEffect handle it
    },
    [searchParams, setSearchParams]
  )

  // Custom hooks for status management
  const bulkSelection = useBulkSelection()
  const { changeStatus, bulkChangeStatus, isChanging, isBulkChanging } =
    useTransactionStatus({
      orgId: orgId || '',
      accountId: accountId || '',
    })

  // Keyboard shortcuts
  useStatusKeyboardShortcuts({
    enabled: selectedCount > 0,
    onStatusChange: (status) => {
      if (selectedCount > 0) {
        void handleBulkStatusChange(status)
      }
    },
    onEscape: () => {
      dispatch(clearSelection())
    },
    onSelectAll: () => {
      bulkSelection.toggleAll()
    },
  })

  useEffect(() => {
    if (orgId && accountId) {
      void dispatch(fetchTransactions({ orgId, accountId }))

      // Fetch account details
      accountApi
        .get(orgId, accountId)
        .then((response) => {
          setAccount(response.data.account)
        })
        .catch(() => {
          setAccountError('Failed to load account details')
        })
    }
  }, [dispatch, orgId, accountId])

  // Calculate status counts from transactions
  useEffect(() => {
    const counts: Record<TransactionStatus, number> = {
      UNCLEARED: 0,
      CLEARED: 0,
      RECONCILED: 0,
    }
    transactions.forEach((t) => {
      const status =
        (t as AccountTransaction & { status?: TransactionStatus }).status ||
        'UNCLEARED'
      counts[status]++
    })
    setStatusCounts(counts)
  }, [transactions])

  const handleCreateTransaction = (data: CreateTransactionData) => {
    if (!orgId || !accountId) return

    void dispatch(createTransaction({ orgId, accountId, data })).then(
      (result) => {
        if (createTransaction.fulfilled.match(result)) {
          setShowCreateForm(false)
          // Refresh account to get updated balance
          void accountApi.get(orgId, accountId).then((response) => {
            setAccount(response.data.account)
          })
        }
      }
    )
  }

  const handleDeleteTransaction = async (transaction: AccountTransaction) => {
    if (!orgId || !accountId) return

    const confirmed = window.confirm(
      `Are you sure you want to delete this transaction? This action cannot be undone.`
    )
    if (confirmed) {
      await dispatch(
        deleteTransaction({ orgId, accountId, transactionId: transaction.id })
      )
      // Refresh account to get updated balance
      void accountApi.get(orgId, accountId).then((response) => {
        setAccount(response.data.account)
      })
    }
  }

  const handleCancelCreate = () => {
    setShowCreateForm(false)
    dispatch(clearTransactionError())
  }

  const handleStatusChange = async (
    transactionId: string,
    newStatus: TransactionStatus
  ) => {
    const transaction = transactions.find((t) => t.id === transactionId)
    if (!transaction) return

    const currentStatus =
      (transaction as AccountTransaction & { status?: TransactionStatus })
        .status || 'UNCLEARED'
    try {
      await changeStatus(transactionId, newStatus, currentStatus)
    } catch (err) {
      logger.apiError('Failed to change transaction status', err, {
        transactionId,
        newStatus,
        currentStatus,
      })
    }
  }

  const handleBulkStatusChange = async (newStatus: TransactionStatus) => {
    if (selectedCount === 0) return

    try {
      await bulkChangeStatus(bulkSelection.selectedIds, newStatus)
      dispatch(clearSelection())
    } catch (err) {
      logger.apiError('Failed to bulk change transaction status', err, {
        selectedIds: bulkSelection.selectedIds,
        newStatus,
        count: bulkSelection.selectedIds.length,
      })
    }
  }

  const handleFilterChange = (filters: StatusFilterState) => {
    // This would update the filter and refetch transactions
    // For now, we handle filtering client-side
    dispatch({ type: 'status/setStatusFilter', payload: filters })
  }

  const formatCurrency = (amount: string | number) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  // Filter transactions based on status filter
  const filteredTransactions = transactions.filter((t) => {
    const status =
      (t as AccountTransaction & { status?: TransactionStatus }).status ||
      'UNCLEARED'
    if (status === 'UNCLEARED' && !statusFilter.uncleared) return false
    if (status === 'CLEARED' && !statusFilter.cleared) return false
    if (status === 'RECONCILED' && !statusFilter.reconciled) return false
    return true
  })

  if (accountError) {
    return (
      <div className="mx-auto max-w-7xl py-8">
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium text-red-600">{accountError}</h3>
          <Link
            to={`/organizations/${orgId}/accounts`}
            className="mt-4 inline-block"
          >
            <Button variant="outline">Back to Accounts</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl py-8">
      <div className="mb-8">
        <Link
          to={`/organizations/${orgId}/accounts`}
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          &#8592; Back to Accounts
        </Link>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {account?.name ?? 'Transactions'}
          </h1>
          {account && (
            <p className="mt-1 text-gray-600">
              Balance: {formatCurrency(account.balance)}
              {account.transactionFee && (
                <span className="ml-2 text-sm text-gray-500">
                  (Fee: {formatCurrency(account.transactionFee)} per
                  transaction)
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/organizations/${orgId}/accounts/${accountId}/reconcile`}>
            <Button variant="outline">Reconcile</Button>
          </Link>
          {isAdmin && !showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)}>
              Add Transaction
            </Button>
          )}
        </div>
      </div>

      {/* Export Panel */}
      {account && (
        <div className="mb-8">
          <ExportTransactionsPanel
            orgId={orgId!}
            accountId={accountId!}
            accountName={account.name}
          />
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <h2 className="text-sm font-medium text-gray-500">
            Total Transactions
          </h2>
          <p className="mt-2 text-3xl font-bold text-gray-900">{total}</p>
        </Card>
        <Card className="p-6">
          <h2 className="text-sm font-medium text-gray-500">Income</h2>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {formatCurrency(
              transactions
                .filter((t) => t.transactionType === 'INCOME')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0)
            )}
          </p>
        </Card>
        <Card className="p-6">
          <h2 className="text-sm font-medium text-gray-500">Expenses</h2>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {formatCurrency(
              transactions
                .filter((t) => t.transactionType === 'EXPENSE')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0)
            )}
          </p>
        </Card>
      </div>

      {/* Status Filter Controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <StatusFilterControls
          filters={statusFilter}
          onFilterChange={handleFilterChange}
          counts={statusCounts}
        />
        <div className="flex items-center gap-4">
          <SelectAllCheckbox
            selectionMode={bulkSelection.selectionMode}
            onToggle={bulkSelection.toggleAll}
            totalCount={filteredTransactions.length}
            selectedCount={selectedCount}
          />
        </div>
      </div>

      {/* Create Transaction Form */}
      {showCreateForm && account && orgId && (
        <Card className="mb-8 p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Add Transaction
          </h2>
          <EnhancedTransactionForm
            account={account}
            orgId={orgId}
            isLoading={isLoading}
            error={error}
            onSubmit={handleCreateTransaction}
            onCancel={handleCancelCreate}
          />
        </Card>
      )}

      {/* Transactions List */}
      {isLoading && transactions.length === 0 ? (
        <div className="text-center text-gray-500">Loading transactions...</div>
      ) : filteredTransactions.length === 0 ? (
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900">
            {transactions.length === 0
              ? 'No transactions yet'
              : 'No transactions match filters'}
          </h3>
          <p className="mt-2 text-gray-600">
            {transactions.length === 0
              ? 'Get started by adding your first transaction.'
              : 'Try adjusting your status filters to see more transactions.'}
          </p>
          {transactions.length === 0 && isAdmin && !showCreateForm && (
            <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
              Add First Transaction
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map((transaction) => (
            <EnhancedTransactionCard
              key={transaction.id}
              transaction={transaction}
              isSelected={bulkSelection.isSelected(transaction.id)}
              onToggleSelect={bulkSelection.toggle}
              onStatusChange={(id, status) =>
                void handleStatusChange(id, status)
              }
              onEdit={
                isAdmin ? () => handleEditTransaction(transaction) : undefined
              }
              onDelete={isAdmin ? handleDeleteTransaction : undefined}
              isStatusChanging={isChanging}
            />
          ))}
        </div>
      )}

      {/* Bulk Actions Toolbar */}
      <TransactionBulkActions
        selectedCount={selectedCount}
        onStatusChange={(status) => void handleBulkStatusChange(status)}
        onClearSelection={() => dispatch(clearSelection())}
        isLoading={isBulkChanging}
      />

      {/* Transaction Edit Modal */}
      {orgId && accountId && (
        <TransactionEditModal orgId={orgId} accountId={accountId} />
      )}
    </div>
  )
}

export default TransactionsPage
