import { Outlet } from 'react-router-dom'

import { Header } from './Header'
import { Footer } from './Footer'

/**
 * Root layout component that wraps all pages with header and footer.
 */
export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
