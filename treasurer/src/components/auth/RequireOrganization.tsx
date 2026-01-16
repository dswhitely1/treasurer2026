import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { selectHasOrganizations, selectCurrentOrganization } from '@/store/features/organizationSlice'
import { selectAuthInitialized } from '@/store/features/authSlice'

interface RequireOrganizationProps {
  children: React.ReactNode
}

export function RequireOrganization({ children }: RequireOrganizationProps) {
  const isInitialized = useAppSelector(selectAuthInitialized)
  const hasOrgs = useAppSelector(selectHasOrganizations)
  const currentOrg = useAppSelector(selectCurrentOrganization)

  if (!isInitialized) {
    return null // or loading spinner
  }

  if (!hasOrgs) {
    return <Navigate to="/organizations/new" replace />
  }

  // If on a generic protected route, redirect to current org dashboard
  if (currentOrg && window.location.pathname === '/dashboard') {
    return <Navigate to={`/organizations/${currentOrg.id}/dashboard`} replace />
  }

  return <>{children}</>
}
