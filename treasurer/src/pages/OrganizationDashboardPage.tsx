import { useParams } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentOrganization } from '@/store/features/organizationSlice'
import { Card } from '@/components/ui'

export function OrganizationDashboardPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const currentOrg = useAppSelector(selectCurrentOrganization)

  return (
    <div className="mx-auto max-w-7xl py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">
        {currentOrg?.name || 'Organization'} Dashboard
      </h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Welcome</h2>
          <p className="text-gray-600">
            This is your organization dashboard. Financial features will be added here.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Your Role</h2>
          <p className="text-gray-600">
            You are a <span className="font-medium">{currentOrg?.role}</span> in this organization.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Organization ID</h2>
          <p className="font-mono text-sm text-gray-500">{orgId}</p>
        </Card>
      </div>
    </div>
  )
}
