import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'

import { useAppDispatch } from '@/store/hooks'
import { initializeAuth } from '@/store/features/authSlice'
import { RootLayout } from '@/components/layout/RootLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RequireOrganization } from '@/components/auth/RequireOrganization'
import {
  HomePage,
  DashboardPage,
  NotFoundPage,
  LoginPage,
  RegisterPage,
  CreateOrganizationPage,
  OrganizationDashboardPage,
} from '@/pages'

function App() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    void dispatch(initializeAuth())
  }, [dispatch])

  return (
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
  )
}

export default App
