/**
 * useBulkSelection Hook
 *
 * Manages bulk selection state for transactions.
 */

import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  toggleSelection,
  selectMultiple,
  toggleSelectAll,
  clearSelection,
  setSelection,
  selectSelectedIds,
  selectIsSelectAllMode,
  selectExcludedIds,
  selectSelectionMode,
  selectSelectionCount,
} from '@/store/features/statusSlice'
import type { SelectionMode, TransactionWithStatus } from '../types'

/**
 * Hook return type.
 */
interface UseBulkSelectionReturn {
  /** Currently selected transaction IDs */
  selectedIds: string[]
  /** Whether select all mode is active */
  isSelectAllMode: boolean
  /** IDs excluded in select all mode */
  excludedIds: string[]
  /** Current selection mode (none, some, all) */
  selectionMode: SelectionMode
  /** Count of selected transactions */
  selectedCount: number
  /** Toggle selection of a single transaction */
  toggle: (transactionId: string) => void
  /** Select multiple transactions */
  selectMany: (transactionIds: string[]) => void
  /** Toggle select all mode */
  toggleAll: () => void
  /** Clear all selections */
  clear: () => void
  /** Set specific selection */
  setSelected: (transactionIds: string[]) => void
  /** Check if a specific transaction is selected */
  isSelected: (transactionId: string) => boolean
  /** Get effective selected IDs considering select all mode */
  getEffectiveSelectedIds: (allTransactions: TransactionWithStatus[]) => string[]
}

/**
 * useBulkSelection provides bulk selection state management.
 *
 * Features:
 * - Toggle individual selections
 * - Select all with exclusions
 * - Selection count
 * - Selection mode detection
 */
export function useBulkSelection(): UseBulkSelectionReturn {
  const dispatch = useAppDispatch()
  const selectedIds = useAppSelector(selectSelectedIds)
  const isSelectAllMode = useAppSelector(selectIsSelectAllMode)
  const excludedIds = useAppSelector(selectExcludedIds)
  const selectionMode = useAppSelector(selectSelectionMode)
  const selectedCount = useAppSelector(selectSelectionCount)

  /**
   * Toggle selection of a single transaction.
   */
  const toggle = useCallback(
    (transactionId: string): void => {
      dispatch(toggleSelection(transactionId))
    },
    [dispatch]
  )

  /**
   * Select multiple transactions.
   */
  const selectMany = useCallback(
    (transactionIds: string[]): void => {
      dispatch(selectMultiple(transactionIds))
    },
    [dispatch]
  )

  /**
   * Toggle select all mode.
   */
  const toggleAll = useCallback((): void => {
    dispatch(toggleSelectAll())
  }, [dispatch])

  /**
   * Clear all selections.
   */
  const clear = useCallback((): void => {
    dispatch(clearSelection())
  }, [dispatch])

  /**
   * Set specific selection.
   */
  const setSelected = useCallback(
    (transactionIds: string[]): void => {
      dispatch(setSelection(transactionIds))
    },
    [dispatch]
  )

  /**
   * Check if a specific transaction is selected.
   */
  const isSelected = useCallback(
    (transactionId: string): boolean => {
      if (isSelectAllMode) {
        return !excludedIds.includes(transactionId)
      }
      return selectedIds.includes(transactionId)
    },
    [isSelectAllMode, excludedIds, selectedIds]
  )

  /**
   * Get effective selected IDs considering select all mode.
   */
  const getEffectiveSelectedIds = useCallback(
    (allTransactions: TransactionWithStatus[]): string[] => {
      if (isSelectAllMode) {
        return allTransactions
          .map((t) => t.id)
          .filter((id) => !excludedIds.includes(id))
      }
      return selectedIds
    },
    [isSelectAllMode, excludedIds, selectedIds]
  )

  return {
    selectedIds,
    isSelectAllMode,
    excludedIds,
    selectionMode,
    selectedCount,
    toggle,
    selectMany,
    toggleAll,
    clear,
    setSelected,
    isSelected,
    getEffectiveSelectedIds,
  }
}

export type { UseBulkSelectionReturn }
