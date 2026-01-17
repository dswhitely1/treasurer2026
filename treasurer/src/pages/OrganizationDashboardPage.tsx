import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectCurrentOrganization } from '@/store/features/organizationSlice'
import {
  fetchAccounts,
  selectAccounts,
  selectTotalBalance,
} from '@/store/features/accountSlice'
import { Card, Button } from '@/components/ui'

export function OrganizationDashboardPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const dispatch = useAppDispatch()
  const currentOrg = useAppSelector(selectCurrentOrganization)
  const accounts = useAppSelector(selectAccounts)
  const totalBalance = useAppSelector(selectTotalBalance)

  useEffect(() => {
    if (orgId) {
      void dispatch(fetchAccounts({ orgId }))
    }
  }, [dispatch, orgId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="mx-auto max-w-7xl py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">
        {currentOrg?.name || 'Organization'} Dashboard
      </h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Total Balance</h2>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalBalance)}</p>
          <p className="mt-1 text-sm text-gray-500">
            Across {accounts.filter((a) => a.isActive).length} active accounts
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Your Role</h2>
          <p className="text-gray-600">
            You are a <span className="font-medium">{currentOrg?.role}</span> in this organization.
          </p>
        </Card>

        <Link to={`/organizations/${orgId}/accounts`} className="block">
          <Card className="h-full p-6 transition-colors hover:bg-gray-50">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Accounts</h2>
            <p className="text-3xl font-bold text-blue-600">{accounts.length}</p>
            <p className="mt-1 text-sm text-gray-500">View and manage accounts</p>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Quick Actions</h2>
        <div className="flex gap-4">
          <Link to={`/organizations/${orgId}/accounts`}>
            <Button>Manage Accounts</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default OrganizationDashboardPage
