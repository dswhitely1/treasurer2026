import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

import { useAppDispatch } from '@/store/hooks'
import { initializeAuth } from '@/store/features/authSlice'
import { RootLayout } from '@/components/layout/RootLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RequireOrganization } from '@/components/auth/RequireOrganization'

// Lazy load pages for code splitting
const HomePage = lazy(() => import('@/pages/HomePage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const CreateOrganizationPage = lazy(() => import('@/pages/CreateOrganizationPage'))
const OrganizationDashboardPage = lazy(() => import('@/pages/OrganizationDashboardPage'))
const AccountsPage = lazy(() => import('@/pages/AccountsPage'))
const TransactionsPage = lazy(() => import('@/pages/TransactionsPage'))
const ReconciliationPage = lazy(() => import('@/pages/ReconciliationPage'))
const VendorsPage = lazy(() => import('@/pages/VendorsPage'))
const CategoriesPage = lazy(() => import('@/pages/CategoriesPage'))

// Loading component for Suspense fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

function App() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    void dispatch(initializeAuth())
  }, [dispatch])

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Organization creation - requires auth but not org */}
          <Route
            path="/organizations/new"
            element={
              <ProtectedRoute>
                <CreateOrganizationPage />
              </ProtectedRoute>
            }
          />

          {/* Organization-scoped routes */}
          <Route
            path="/organizations/:orgId/dashboard"
            element={
              <ProtectedRoute>
                <RequireOrganization>
                  <OrganizationDashboardPage />
                </RequireOrganization>
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizations/:orgId/accounts"
            element={
              <ProtectedRoute>
                <RequireOrganization>
                  <AccountsPage />
                </RequireOrganization>
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizations/:orgId/accounts/:accountId/transactions"
            element={
              <ProtectedRoute>
                <RequireOrganization>
                  <TransactionsPage />
                </RequireOrganization>
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizations/:orgId/accounts/:accountId/reconcile"
            element={
              <ProtectedRoute>
                <RequireOrganization>
                  <ReconciliationPage />
                </RequireOrganization>
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizations/:orgId/vendors"
            element={
              <ProtectedRoute>
                <RequireOrganization>
                  <VendorsPage />
                </RequireOrganization>
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizations/:orgId/categories"
            element={
              <ProtectedRoute>
                <RequireOrganization>
                  <CategoriesPage />
                </RequireOrganization>
              </ProtectedRoute>
            }
          />

          {/* Legacy dashboard redirect */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RequireOrganization>
                  <DashboardPage />
                </RequireOrganization>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
