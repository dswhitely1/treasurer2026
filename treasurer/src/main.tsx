import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'

import { store } from '@/store'
import App from '@/App'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { initWebVitals, logNavigationTiming } from '@/utils/performance'
import { setupGlobalErrorHandlers } from '@/utils/logger'
import '@/styles/index.css'

// Initialize observability
setupGlobalErrorHandlers()
initWebVitals()
logNavigationTiming()

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Failed to find root element')
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  </StrictMode>
)
