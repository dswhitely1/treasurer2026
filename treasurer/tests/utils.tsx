import type { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'

import { store as appStore } from '@/store'

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  store?: typeof appStore
}

/**
 * Custom render function that wraps components with providers.
 */
export function renderWithProviders(
  ui: ReactElement,
  { store = appStore, ...renderOptions }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <BrowserRouter>{children}</BrowserRouter>
      </Provider>
    )
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

export * from '@testing-library/react'
export { renderWithProviders as render }
