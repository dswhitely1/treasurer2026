/**
 * Test utilities for Vitest + React Testing Library
 *
 * Provides helpers for testing Redux-connected components and custom hooks.
 */

import { PropsWithChildren, ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

import counterReducer from '@/store/features/counterSlice'
import authReducer from '@/store/features/authSlice'
import organizationReducer from '@/store/features/organizationSlice'
import accountReducer from '@/store/features/accountSlice'
import transactionReducer from '@/store/features/transactionSlice'
import statusReducer from '@/store/features/statusSlice'
import { statusApi } from '@/features/status/api'
import type { RootState } from '@/store'

/**
 * Create a mock Redux store with optional preloaded state.
 */
export function createMockStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: {
      counter: counterReducer,
      auth: authReducer,
      organization: organizationReducer,
      account: accountReducer,
      transaction: transactionReducer,
      status: statusReducer,
      [statusApi.reducerPath]: statusApi.reducer,
    } as any,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(statusApi.middleware) as any,
    preloadedState: preloadedState as any,
  })
}

/**
 * Extended render options with store and routing.
 */
interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>
  store?: ReturnType<typeof createMockStore>
  withRouter?: boolean
}

/**
 * Render a component with Redux Provider and optional Router.
 *
 * @example
 * ```tsx
 * const { store } = renderWithProviders(<MyComponent />, {
 *   preloadedState: { status: customStatusState }
 * })
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState,
    store = createMockStore(preloadedState),
    withRouter = false,
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: PropsWithChildren) {
    const content = <Provider store={store}>{children}</Provider>
    return withRouter ? <BrowserRouter>{content}</BrowserRouter> : content
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

/**
 * Create mock transaction data for tests.
 */
export function createMockTransaction(overrides = {}) {
  return {
    id: 'txn-1',
    accountId: 'acc-1',
    transactionType: 'EXPENSE' as const,
    amount: '100.00',
    description: 'Test transaction',
    date: '2026-01-15',
    feeAmount: null,
    splits: [],
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
    ...overrides,
  }
}

/**
 * Create mock transaction with status for tests.
 */
export function createMockTransactionWithStatus(overrides = {}) {
  return {
    ...createMockTransaction(),
    status: 'UNCLEARED' as const,
    statusChangedAt: '2026-01-15T10:00:00Z',
    statusChangedBy: 'user-1',
    ...overrides,
  }
}

/**
 * Create mock status history entry.
 */
export function createMockStatusHistoryEntry(overrides = {}) {
  return {
    id: 'history-1',
    transactionId: 'txn-1',
    previousStatus: null,
    newStatus: 'UNCLEARED' as const,
    changedAt: '2026-01-15T10:00:00Z',
    changedBy: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
    },
    notes: undefined,
    ...overrides,
  }
}

/**
 * Create mock reconciliation summary.
 */
export function createMockReconciliationSummary(overrides = {}) {
  return {
    accountId: 'acc-1',
    accountName: 'Test Account',
    currentBalance: 1000,
    clearedBalance: 800,
    reconciledBalance: 500,
    unclearedBalance: 200,
    pendingTransactionCount: 5,
    clearedTransactionCount: 10,
    reconciledTransactionCount: 15,
    lastReconciledAt: '2026-01-10T10:00:00Z',
    lastReconciledBy: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
    },
    balancesByStatus: [
      { status: 'UNCLEARED' as const, count: 5, income: 100, expense: 300, net: -200 },
      { status: 'CLEARED' as const, count: 10, income: 500, expense: 200, net: 300 },
      { status: 'RECONCILED' as const, count: 15, income: 800, expense: 300, net: 500 },
    ],
    difference: 0,
    ...overrides,
  }
}

/**
 * Wait for async operations to complete.
 */
export async function waitForAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Create a mock RTK Query response.
 */
export function createMockQueryResponse<T>(data: T, error?: unknown) {
  return {
    data: error ? undefined : data,
    error,
    isLoading: false,
    isSuccess: !error,
    isError: !!error,
    isFetching: false,
    refetch: vi.fn(),
  }
}

/**
 * Create a mock RTK Query mutation result.
 */
export function createMockMutationResult(isLoading = false, error?: unknown) {
  return [
    vi.fn().mockResolvedValue({ data: {} }),
    {
      isLoading,
      isSuccess: !error && !isLoading,
      isError: !!error,
      error,
      reset: vi.fn(),
    },
  ] as const
}
