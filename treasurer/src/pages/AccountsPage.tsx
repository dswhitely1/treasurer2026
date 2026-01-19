import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchAccounts,
  createAccount,
  deleteAccount,
  selectAccounts,
  selectAccountLoading,
  selectAccountError,
  selectTotalBalance,
  clearAccountError,
} from '@/store/features/accountSlice'
import { selectCurrentOrganization, selectIsOrgAdmin } from '@/store/features/organizationSlice'
import { Card, Button } from '@/components/ui'
import { AccountCard, CreateAccountForm, type CreateAccountData } from '@/components/accounts'
import type { Account } from '@/types'

export function AccountsPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const dispatch = useAppDispatch()
  const currentOrg = useAppSelector(selectCurrentOrganization)
  const accounts = useAppSelector(selectAccounts)
  const isLoading = useAppSelector(selectAccountLoading)
  const error = useAppSelector(selectAccountError)
  const totalBalance = useAppSelector(selectTotalBalance)
  const isAdmin = useAppSelector(selectIsOrgAdmin)

  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    if (orgId) {
      void dispatch(fetchAccounts({ orgId }))
    }
  }, [dispatch, orgId])

  const handleCreateAccount = (data: CreateAccountData) => {
    if (!orgId) return

    void dispatch(createAccount({ orgId, data })).then((result) => {
      if (createAccount.fulfilled.match(result)) {
        setShowCreateForm(false)
      }
    })
  }

  const handleDeleteAccount = async (account: Account) => {
    if (!orgId) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${account.name}"? This action cannot be undone.`
    )
    if (confirmed) {
      await dispatch(deleteAccount({ orgId, accountId: account.id }))
    }
  }

  const handleCancelCreate = () => {
    setShowCreateForm(false)
    dispatch(clearAccountError())
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="mx-auto max-w-7xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
          <p className="mt-1 text-gray-600">
            Manage financial accounts for {currentOrg?.name}
          </p>
        </div>
        {isAdmin && !showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>Add Account</Button>
        )}
      </div>

      {/* Summary Card */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <h2 className="text-sm font-medium text-gray-500">Total Balance</h2>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {formatCurrency(totalBalance)}
          </p>
        </Card>
        <Card className="p-6">
          <h2 className="text-sm font-medium text-gray-500">Active Accounts</h2>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {accounts.filter((a) => a.isActive).length}
          </p>
        </Card>
        <Card className="p-6">
          <h2 className="text-sm font-medium text-gray-500">Total Accounts</h2>
          <p className="mt-2 text-3xl font-bold text-gray-900">{accounts.length}</p>
        </Card>
      </div>

      {/* Create Account Form */}
      {showCreateForm && (
        <Card className="mb-8 p-6">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Create New Account</h2>
          <CreateAccountForm
            isLoading={isLoading}
            error={error}
            onSubmit={handleCreateAccount}
            onCancel={handleCancelCreate}
          />
        </Card>
      )}

      {/* Accounts List */}
      {isLoading && accounts.length === 0 ? (
        <div className="text-center text-gray-500">Loading accounts...</div>
      ) : accounts.length === 0 ? (
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900">No accounts yet</h3>
          <p className="mt-2 text-gray-600">
            Get started by creating your first account to track your finances.
          </p>
          {isAdmin && !showCreateForm && (
            <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
              Create First Account
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              orgId={orgId!}
              onEdit={undefined}
              onDelete={isAdmin ? handleDeleteAccount : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default AccountsPage
