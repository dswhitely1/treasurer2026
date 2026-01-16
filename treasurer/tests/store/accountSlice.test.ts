import { describe, it, expect } from 'vitest'
import accountReducer, {
  selectAccount,
  clearAccounts,
  clearAccountError,
} from '@/store/features/accountSlice'
import type { Account } from '@/types'

const mockAccount1: Account = {
  id: '1',
  name: 'Checking',
  description: null,
  institution: 'Bank A',
  accountType: 'CHECKING',
  balance: '1000',
  currency: 'USD',
  isActive: true,
  organizationId: 'org-1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

const mockAccount2: Account = {
  id: '2',
  name: 'Savings',
  description: 'Emergency fund',
  institution: 'Bank B',
  accountType: 'SAVINGS',
  balance: '5000',
  currency: 'USD',
  isActive: true,
  organizationId: 'org-1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

const initialState = {
  accounts: [] as Account[],
  selectedAccount: null as Account | null,
  isLoading: false,
  error: null as string | null,
}

describe('accountSlice', () => {
  describe('reducers', () => {
    it('should return initial state', () => {
      const result = accountReducer(undefined, { type: 'unknown' })

      expect(result.accounts).toEqual([])
      expect(result.selectedAccount).toBeNull()
      expect(result.isLoading).toBe(false)
      expect(result.error).toBeNull()
    })

    it('should handle selectAccount', () => {
      const result = accountReducer(initialState, selectAccount(mockAccount1))

      expect(result.selectedAccount).toEqual(mockAccount1)
    })

    it('should handle selectAccount with null', () => {
      const stateWithSelection = {
        ...initialState,
        selectedAccount: mockAccount1,
      }

      const result = accountReducer(stateWithSelection, selectAccount(null))

      expect(result.selectedAccount).toBeNull()
    })

    it('should handle clearAccounts', () => {
      const stateWithData = {
        accounts: [mockAccount1, mockAccount2],
        selectedAccount: mockAccount1,
        isLoading: false,
        error: 'Some error',
      }

      const result = accountReducer(stateWithData, clearAccounts())

      expect(result.accounts).toEqual([])
      expect(result.selectedAccount).toBeNull()
      expect(result.error).toBeNull()
    })

    it('should handle clearAccountError', () => {
      const stateWithError = {
        ...initialState,
        error: 'Some error',
      }

      const result = accountReducer(stateWithError, clearAccountError())

      expect(result.error).toBeNull()
    })
  })

  describe('state transitions', () => {
    it('should preserve accounts when selecting account', () => {
      const stateWithAccounts = {
        ...initialState,
        accounts: [mockAccount1, mockAccount2],
      }

      const result = accountReducer(stateWithAccounts, selectAccount(mockAccount1))

      expect(result.accounts).toEqual([mockAccount1, mockAccount2])
      expect(result.selectedAccount).toEqual(mockAccount1)
    })

    it('should preserve loading state when clearing error', () => {
      const stateLoadingWithError = {
        ...initialState,
        isLoading: true,
        error: 'Some error',
      }

      const result = accountReducer(stateLoadingWithError, clearAccountError())

      expect(result.isLoading).toBe(true)
      expect(result.error).toBeNull()
    })
  })
})
