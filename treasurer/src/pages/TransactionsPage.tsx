import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchTransactions,
  createTransaction,
  deleteTransaction,
  fetchCategories,
  clearTransactionError,
  selectTransactions,
  selectTransactionTotal,
  selectTransactionLoading,
  selectTransactionError,
  selectCategories,
} from '@/store/features/transactionSlice'
import { selectIsOrgAdmin } from '@/store/features/organizationSlice'
import { Card, Button } from '@/components/ui'
import { TransactionCard, CreateTransactionForm, type CreateTransactionData } from '@/components/transactions'
import type { Account, AccountTransaction } from '@/types'
import { accountApi } from '@/lib/api/accounts'

export function TransactionsPage() {
  const { orgId, accountId } = useParams<{ orgId: string; accountId: string }>()
  const dispatch = useAppDispatch()
  const transactions = useAppSelector(selectTransactions)
  const total = useAppSelector(selectTransactionTotal)
  const isLoading = useAppSelector(selectTransactionLoading)
  const error = useAppSelector(selectTransactionError)
  const categories = useAppSelector(selectCategories)
  const isAdmin = useAppSelector(selectIsOrgAdmin)

  const [account, setAccount] = useState<Account | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)

  useEffect(() => {
    if (orgId && accountId) {
      void dispatch(fetchTransactions({ orgId, accountId }))
      void dispatch(fetchCategories({ orgId }))

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

  const handleCategorySearch = useCallback(
    (search: string) => {
      if (orgId) {
        void dispatch(fetchCategories({ orgId, search, limit: 10 }))
      }
    },
    [dispatch, orgId]
  )

  const handleCreateTransaction = (data: CreateTransactionData) => {
    if (!orgId || !accountId) return

    void dispatch(createTransaction({ orgId, accountId, data })).then((result) => {
      if (createTransaction.fulfilled.match(result)) {
        setShowCreateForm(false)
        // Refresh account to get updated balance
        void accountApi.get(orgId, accountId).then((response) => {
          setAccount(response.data.account)
        })
      }
    })
  }

  const handleDeleteTransaction = async (transaction: AccountTransaction) => {
    if (!orgId || !accountId) return

    const confirmed = window.confirm(
      `Are you sure you want to delete this transaction? This action cannot be undone.`
    )
    if (confirmed) {
      await dispatch(deleteTransaction({ orgId, accountId, transactionId: transaction.id }))
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

  const formatCurrency = (amount: string | number) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  if (accountError) {
    return (
      <div className="mx-auto max-w-7xl py-8">
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium text-red-600">{accountError}</h3>
          <Link to={`/organizations/${orgId}/accounts`} className="mt-4 inline-block">
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
          &larr; Back to Accounts
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
                  (Fee: {formatCurrency(account.transactionFee)} per transaction)
                </span>
              )}
            </p>
          )}
        </div>
        {isAdmin && !showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>Add Transaction</Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <h2 className="text-sm font-medium text-gray-500">Total Transactions</h2>
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

      {/* Create Transaction Form */}
      {showCreateForm && account && (
        <Card className="mb-8 p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Add Transaction</h2>
          <CreateTransactionForm
            account={account}
            categories={categories}
            isLoading={isLoading}
            error={error}
            onSubmit={handleCreateTransaction}
            onCancel={handleCancelCreate}
            onCategorySearch={handleCategorySearch}
          />
        </Card>
      )}

      {/* Transactions List */}
      {isLoading && transactions.length === 0 ? (
        <div className="text-center text-gray-500">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900">No transactions yet</h3>
          <p className="mt-2 text-gray-600">
            Get started by adding your first transaction.
          </p>
          {isAdmin && !showCreateForm && (
            <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
              Add First Transaction
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              onEdit={isAdmin ? () => console.log('Edit', transaction) : undefined}
              onDelete={isAdmin ? handleDeleteTransaction : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
