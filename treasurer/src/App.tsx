import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'

import { useAppDispatch } from '@/store/hooks'
import { initializeAuth } from '@/store/features/authSlice'
import { RootLayout } from '@/components/layout/RootLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { HomePage, DashboardPage, NotFoundPage, LoginPage, RegisterPage } from '@/pages'

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
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
