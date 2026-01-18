/**
 * Tests for useBulkSelection hook
 *
 * Covers:
 * - Toggle individual selection
 * - Select multiple
 * - Toggle select all
 * - Clear selection
 * - Check if selected
 * - Get effective selected IDs
 * - Selection mode
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { useBulkSelection } from '../useBulkSelection'
import { createMockStore, createMockTransactionWithStatus } from '@/test/utils'
import type { PropsWithChildren } from 'react'

describe('useBulkSelection', () => {
  const createWrapper = () => {
    const store = createMockStore()
    return function Wrapper({ children }: PropsWithChildren) {
      return <Provider store={store}>{children}</Provider>
    }
  }

  beforeEach(() => {
    // Reset store state between tests if needed
  })

  describe('Initial State', () => {
    it('should start with empty selection', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      expect(result.current.selectedIds).toEqual([])
      expect(result.current.isSelectAllMode).toBe(false)
      expect(result.current.excludedIds).toEqual([])
      expect(result.current.selectionMode).toBe('none')
      expect(result.current.selectedCount).toBe(0)
    })
  })

  describe('toggle', () => {
    it('should add transaction to selection', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggle('txn-1')
      })

      expect(result.current.selectedIds).toContain('txn-1')
      expect(result.current.selectedCount).toBe(1)
    })

    it('should remove transaction from selection when already selected', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggle('txn-1')
      })

      expect(result.current.selectedIds).toContain('txn-1')

      act(() => {
        result.current.toggle('txn-1')
      })

      expect(result.current.selectedIds).not.toContain('txn-1')
      expect(result.current.selectedCount).toBe(0)
    })

    it('should toggle multiple different transactions', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggle('txn-1')
        result.current.toggle('txn-2')
        result.current.toggle('txn-3')
      })

      expect(result.current.selectedIds).toEqual(['txn-1', 'txn-2', 'txn-3'])
      expect(result.current.selectedCount).toBe(3)
    })

    it('should add to exclusions in select all mode', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggleAll()
      })

      expect(result.current.isSelectAllMode).toBe(true)

      act(() => {
        result.current.toggle('txn-1')
      })

      expect(result.current.excludedIds).toContain('txn-1')
    })

    it('should remove from exclusions when toggling again in select all mode', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggleAll()
        result.current.toggle('txn-1')
      })

      expect(result.current.excludedIds).toContain('txn-1')

      act(() => {
        result.current.toggle('txn-1')
      })

      expect(result.current.excludedIds).not.toContain('txn-1')
    })
  })

  describe('selectMany', () => {
    it('should select multiple transactions', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.selectMany(['txn-1', 'txn-2', 'txn-3'])
      })

      expect(result.current.selectedIds).toEqual(['txn-1', 'txn-2', 'txn-3'])
      expect(result.current.selectedCount).toBe(3)
    })

    it('should not duplicate already selected transactions', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.selectMany(['txn-1', 'txn-2'])
        result.current.selectMany(['txn-2', 'txn-3'])
      })

      expect(result.current.selectedIds).toEqual(['txn-1', 'txn-2', 'txn-3'])
    })
  })

  describe('toggleAll', () => {
    it('should enable select all mode', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggleAll()
      })

      expect(result.current.isSelectAllMode).toBe(true)
      expect(result.current.selectionMode).toBe('all')
    })

    it('should disable select all mode when toggled again', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggleAll()
      })

      expect(result.current.isSelectAllMode).toBe(true)

      act(() => {
        result.current.toggleAll()
      })

      expect(result.current.isSelectAllMode).toBe(false)
      expect(result.current.selectionMode).toBe('none')
    })

    it('should clear exclusions when disabling select all', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggleAll()
        result.current.toggle('txn-1')
      })

      expect(result.current.excludedIds).toContain('txn-1')

      act(() => {
        result.current.toggleAll()
      })

      expect(result.current.excludedIds).toEqual([])
    })
  })

  describe('clear', () => {
    it('should clear all selections', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.selectMany(['txn-1', 'txn-2', 'txn-3'])
      })

      expect(result.current.selectedCount).toBe(3)

      act(() => {
        result.current.clear()
      })

      expect(result.current.selectedIds).toEqual([])
      expect(result.current.selectedCount).toBe(0)
      expect(result.current.selectionMode).toBe('none')
    })

    it('should clear select all mode', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggleAll()
      })

      expect(result.current.isSelectAllMode).toBe(true)

      act(() => {
        result.current.clear()
      })

      expect(result.current.isSelectAllMode).toBe(false)
      expect(result.current.excludedIds).toEqual([])
    })
  })

  describe('setSelected', () => {
    it('should replace current selection', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.selectMany(['txn-1', 'txn-2'])
      })

      expect(result.current.selectedIds).toEqual(['txn-1', 'txn-2'])

      act(() => {
        result.current.setSelected(['txn-3', 'txn-4'])
      })

      expect(result.current.selectedIds).toEqual(['txn-3', 'txn-4'])
    })

    it('should disable select all mode', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggleAll()
      })

      expect(result.current.isSelectAllMode).toBe(true)

      act(() => {
        result.current.setSelected(['txn-1'])
      })

      expect(result.current.isSelectAllMode).toBe(false)
      expect(result.current.selectedIds).toEqual(['txn-1'])
    })
  })

  describe('isSelected', () => {
    it('should return true for selected transaction in normal mode', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggle('txn-1')
      })

      expect(result.current.isSelected('txn-1')).toBe(true)
      expect(result.current.isSelected('txn-2')).toBe(false)
    })

    it('should return true for non-excluded transaction in select all mode', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggleAll()
        result.current.toggle('txn-1')
      })

      expect(result.current.isSelected('txn-1')).toBe(false)
      expect(result.current.isSelected('txn-2')).toBe(true)
    })
  })

  describe('getEffectiveSelectedIds', () => {
    it('should return selected IDs in normal mode', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.selectMany(['txn-1', 'txn-2'])
      })

      const transactions = [
        createMockTransactionWithStatus({ id: 'txn-1' }),
        createMockTransactionWithStatus({ id: 'txn-2' }),
        createMockTransactionWithStatus({ id: 'txn-3' }),
      ]

      const effectiveIds = result.current.getEffectiveSelectedIds(transactions)
      expect(effectiveIds).toEqual(['txn-1', 'txn-2'])
    })

    it('should return all IDs except excluded in select all mode', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggleAll()
        result.current.toggle('txn-2')
      })

      const transactions = [
        createMockTransactionWithStatus({ id: 'txn-1' }),
        createMockTransactionWithStatus({ id: 'txn-2' }),
        createMockTransactionWithStatus({ id: 'txn-3' }),
      ]

      const effectiveIds = result.current.getEffectiveSelectedIds(transactions)
      expect(effectiveIds).toEqual(['txn-1', 'txn-3'])
    })

    it('should return all IDs when select all with no exclusions', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggleAll()
      })

      const transactions = [
        createMockTransactionWithStatus({ id: 'txn-1' }),
        createMockTransactionWithStatus({ id: 'txn-2' }),
        createMockTransactionWithStatus({ id: 'txn-3' }),
      ]

      const effectiveIds = result.current.getEffectiveSelectedIds(transactions)
      expect(effectiveIds).toEqual(['txn-1', 'txn-2', 'txn-3'])
    })
  })

  describe('selectionMode', () => {
    it('should be "none" when no selection', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      expect(result.current.selectionMode).toBe('none')
    })

    it('should be "some" when some transactions selected', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggle('txn-1')
      })

      expect(result.current.selectionMode).toBe('some')
    })

    it('should be "all" when select all mode with no exclusions', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggleAll()
      })

      expect(result.current.selectionMode).toBe('all')
    })

    it('should be "some" when select all mode with exclusions', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggleAll()
        result.current.toggle('txn-1')
      })

      expect(result.current.selectionMode).toBe('some')
    })
  })

  describe('selectedCount', () => {
    it('should count selected transactions in normal mode', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.selectMany(['txn-1', 'txn-2', 'txn-3'])
      })

      expect(result.current.selectedCount).toBe(3)
    })

    it('should be 0 in select all mode (count handled separately)', () => {
      const { result } = renderHook(() => useBulkSelection(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.toggleAll()
      })

      // selectedCount returns length of selectedIds array, which is 0 in select all mode
      expect(result.current.selectedCount).toBe(0)
    })
  })
})
