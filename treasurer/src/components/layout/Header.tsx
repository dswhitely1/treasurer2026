import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  logout,
  selectIsAuthenticated,
  selectCurrentUser,
} from '@/store/features/authSlice'
import { clearOrganizations, selectCurrentOrganization } from '@/store/features/organizationSlice'
import { Button } from '@/components/ui'
import { OrganizationSwitcher } from '@/components/organization'

/**
 * Application header with auth-aware navigation links and organization switcher.
 */
export function Header() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const user = useAppSelector(selectCurrentUser)
  const currentOrg = useAppSelector(selectCurrentOrganization)

  const handleLogout = () => {
    dispatch(logout())
    dispatch(clearOrganizations())
    navigate('/')
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-xl font-bold text-gray-900">
          Treasurer
        </Link>

        <nav className="flex items-center gap-4">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`
            }
          >
            Home
          </NavLink>

          {isAuthenticated ? (
            <>
              <OrganizationSwitcher />
              <NavLink
                to={currentOrg ? `/organizations/${currentOrg.id}/dashboard` : '/organizations/new'}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <span className="text-sm text-gray-500">
                {user?.name || user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`
                }
              >
                Login
              </NavLink>
              <NavLink to="/register">
                <Button variant="primary" size="sm">
                  Register
                </Button>
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
