/**
 * Tests for useTransactionStatus hook
 *
 * Covers:
 * - Status change operations
 * - Bulk status changes
 * - Optimistic updates
 * - Pending change tracking
 * - Error handling
 * - Loading states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { useTransactionStatus } from '../useTransactionStatus'
import {
  useChangeTransactionStatusMutation,
  useBulkChangeStatusMutation,
} from '../../api'
import { createMockStore } from '@/test/utils'
import type { PropsWithChildren } from 'react'

// Mock the API hooks
vi.mock('../../api', () => ({
  useChangeTransactionStatusMutation: vi.fn(),
  useBulkChangeStatusMutation: vi.fn(),
}))

describe('useTransactionStatus', () => {
  const mockChangeStatus = vi.fn()
  const mockBulkChangeStatus = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mocks
    vi.mocked(useChangeTransactionStatusMutation).mockReturnValue([
      mockChangeStatus,
      {
        isLoading: false,
        error: null,
        isSuccess: false,
        isError: false,
        reset: vi.fn(),
      },
    ] as any)

    vi.mocked(useBulkChangeStatusMutation).mockReturnValue([
      mockBulkChangeStatus,
      {
        isLoading: false,
        error: null,
        isSuccess: false,
        isError: false,
        reset: vi.fn(),
      },
    ] as any)
  })

  const createWrapper = () => {
    const store = createMockStore()
    return function Wrapper({ children }: PropsWithChildren) {
      return <Provider store={store}>{children}</Provider>
    }
  }

  describe('changeStatus', () => {
    it('should call mutation with correct parameters', async () => {
      mockChangeStatus.mockResolvedValue({ unwrap: () => Promise.resolve({}) })

      const { result } = renderHook(
        () => useTransactionStatus({ orgId: 'org-1', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      )

      await result.current.changeStatus('txn-1', 'CLEARED', 'UNCLEARED')

      expect(mockChangeStatus).toHaveBeenCalledWith({
        orgId: 'org-1',
        accountId: 'acc-1',
        transactionId: 'txn-1',
        newStatus: 'CLEARED',
        notes: undefined,
      })
    })

    it('should include notes when provided', async () => {
      mockChangeStatus.mockResolvedValue({ unwrap: () => Promise.resolve({}) })

      const { result } = renderHook(
        () => useTransactionStatus({ orgId: 'org-1', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      )

      await result.current.changeStatus('txn-1', 'CLEARED', 'UNCLEARED', 'Test notes')

      expect(mockChangeStatus).toHaveBeenCalledWith({
        orgId: 'org-1',
        accountId: 'acc-1',
        transactionId: 'txn-1',
        newStatus: 'CLEARED',
        notes: 'Test notes',
      })
    })

    it('should track pending change', async () => {
      mockChangeStatus.mockResolvedValue({ unwrap: () => Promise.resolve({}) })

      const { result } = renderHook(
        () => useTransactionStatus({ orgId: 'org-1', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      )

      const changePromise = result.current.changeStatus('txn-1', 'CLEARED', 'UNCLEARED')

      // Should be pending before resolution
      expect(result.current.isPending('txn-1')).toBe(true)

      await changePromise

      // Should be cleared after resolution
      await waitFor(() => {
        expect(result.current.isPending('txn-1')).toBe(false)
      })
    })

    it('should handle successful status change', async () => {
      mockChangeStatus.mockResolvedValue({ unwrap: () => Promise.resolve({}) })

      const { result } = renderHook(
        () => useTransactionStatus({ orgId: 'org-1', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      )

      await expect(
        result.current.changeStatus('txn-1', 'CLEARED', 'UNCLEARED')
      ).resolves.toBeUndefined()
    })

    it('should handle error and clear pending change', async () => {
      const error = new Error('Failed to update status')
      mockChangeStatus.mockResolvedValue({
        unwrap: () => Promise.reject(error),
      })

      const { result } = renderHook(
        () => useTransactionStatus({ orgId: 'org-1', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      )

      await expect(
        result.current.changeStatus('txn-1', 'CLEARED', 'UNCLEARED')
      ).rejects.toThrow('Failed to update status')

      // Pending change should be cleared on error
      await waitFor(() => {
        expect(result.current.isPending('txn-1')).toBe(false)
      })
    })
  })

  describe('bulkChangeStatus', () => {
    it('should call bulk mutation with correct parameters', async () => {
      mockBulkChangeStatus.mockResolvedValue({ unwrap: () => Promise.resolve({}) })

      const { result } = renderHook(
        () => useTransactionStatus({ orgId: 'org-1', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      )

      await result.current.bulkChangeStatus(['txn-1', 'txn-2'], 'CLEARED')

      expect(mockBulkChangeStatus).toHaveBeenCalledWith({
        orgId: 'org-1',
        accountId: 'acc-1',
        transactionIds: ['txn-1', 'txn-2'],
        newStatus: 'CLEARED',
        notes: undefined,
      })
    })

    it('should include notes in bulk change', async () => {
      mockBulkChangeStatus.mockResolvedValue({ unwrap: () => Promise.resolve({}) })

      const { result } = renderHook(
        () => useTransactionStatus({ orgId: 'org-1', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      )

      await result.current.bulkChangeStatus(['txn-1', 'txn-2'], 'CLEARED', 'Bulk update')

      expect(mockBulkChangeStatus).toHaveBeenCalledWith({
        orgId: 'org-1',
        accountId: 'acc-1',
        transactionIds: ['txn-1', 'txn-2'],
        newStatus: 'CLEARED',
        notes: 'Bulk update',
      })
    })

    it('should handle successful bulk change', async () => {
      mockBulkChangeStatus.mockResolvedValue({ unwrap: () => Promise.resolve({}) })

      const { result } = renderHook(
        () => useTransactionStatus({ orgId: 'org-1', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      )

      await expect(
        result.current.bulkChangeStatus(['txn-1', 'txn-2'], 'CLEARED')
      ).resolves.toBeUndefined()
    })

    it('should handle bulk change error', async () => {
      const error = new Error('Bulk update failed')
      mockBulkChangeStatus.mockResolvedValue({
        unwrap: () => Promise.reject(error),
      })

      const { result } = renderHook(
        () => useTransactionStatus({ orgId: 'org-1', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      )

      await expect(
        result.current.bulkChangeStatus(['txn-1', 'txn-2'], 'CLEARED')
      ).rejects.toThrow('Bulk update failed')
    })
  })

  describe('isPending', () => {
    it('should return false for non-pending transaction', () => {
      const { result } = renderHook(
        () => useTransactionStatus({ orgId: 'org-1', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      )

      expect(result.current.isPending('txn-1')).toBe(false)
    })

    it('should return true for pending transaction', async () => {
      let resolveChange: (value: any) => void
      const changePromise = new Promise((resolve) => {
        resolveChange = resolve
      })

      mockChangeStatus.mockResolvedValue({
        unwrap: () => changePromise,
      })

      const { result } = renderHook(
        () => useTransactionStatus({ orgId: 'org-1', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      )

      // Start the change
      const statusChangePromise = result.current.changeStatus('txn-1', 'CLEARED', 'UNCLEARED')

      // Should be pending
      await waitFor(() => {
        expect(result.current.isPending('txn-1')).toBe(true)
      })

      // Resolve the change
      resolveChange!({})
      await statusChangePromise

      // Should no longer be pending
      await waitFor(() => {
        expect(result.current.isPending('txn-1')).toBe(false)
      })
    })
  })

  describe('Loading states', () => {
    it('should expose isChanging from single mutation', () => {
      vi.mocked(useChangeTransactionStatusMutation).mockReturnValue([
        mockChangeStatus,
        {
          isLoading: true,
          error: null,
          isSuccess: false,
          isError: false,
          reset: vi.fn(),
        },
      ] as any)

      const { result } = renderHook(
        () => useTransactionStatus({ orgId: 'org-1', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      )

      expect(result.current.isChanging).toBe(true)
    })

    it('should expose isBulkChanging from bulk mutation', () => {
      vi.mocked(useBulkChangeStatusMutation).mockReturnValue([
        mockBulkChangeStatus,
        {
          isLoading: true,
          error: null,
          isSuccess: false,
          isError: false,
          reset: vi.fn(),
        },
      ] as any)

      const { result } = renderHook(
        () => useTransactionStatus({ orgId: 'org-1', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      )

      expect(result.current.isBulkChanging).toBe(true)
    })
  })

  describe('Error handling', () => {
    it('should expose error from change mutation', () => {
      const error = { data: { message: 'Update failed' } }
      vi.mocked(useChangeTransactionStatusMutation).mockReturnValue([
        mockChangeStatus,
        {
          isLoading: false,
          error,
          isSuccess: false,
          isError: true,
          reset: vi.fn(),
        },
      ] as any)

      const { result } = renderHook(
        () => useTransactionStatus({ orgId: 'org-1', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      )

      expect(result.current.error).toBe('Update failed')
    })

    it('should expose error from bulk mutation', () => {
      const error = { data: { message: 'Bulk update failed' } }
      vi.mocked(useBulkChangeStatusMutation).mockReturnValue([
        mockBulkChangeStatus,
        {
          isLoading: false,
          error,
          isSuccess: false,
          isError: true,
          reset: vi.fn(),
        },
      ] as any)

      const { result } = renderHook(
        () => useTransactionStatus({ orgId: 'org-1', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      )

      expect(result.current.error).toBe('Bulk update failed')
    })

    it('should return null when no error', () => {
      const { result } = renderHook(
        () => useTransactionStatus({ orgId: 'org-1', accountId: 'acc-1' }),
        { wrapper: createWrapper() }
      )

      expect(result.current.error).toBeNull()
    })
  })
})
