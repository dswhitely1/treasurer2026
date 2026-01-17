/**
 * Redux slice for Transaction Status Management
 *
 * This slice manages:
 * - Status filtering state
 * - Bulk selection state
 * - Reconciliation workflow state
 * - Optimistic update tracking for rollback
 */

import { createSlice, createSelector, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import type {
  TransactionStatus,
  StatusFilterState,
  SelectionMode,
  TransactionWithStatus,
} from '@/features/status/types'

/**
 * Status slice state shape.
 */
interface StatusState {
  /** Current status filter selections */
  statusFilter: StatusFilterState
  /** Bulk selection state */
  selectedIds: string[]
  isSelectAllMode: boolean
  excludedIds: string[]
  /** Reconciliation workflow state */
  reconciliation: {
    isActive: boolean
    statementBalance: number | null
    statementDate: string | null
  }
  /** Pending optimistic status changes for rollback tracking */
  pendingChanges: Record<
    string,
    {
      previousStatus: TransactionStatus
      newStatus: TransactionStatus
      timestamp: number
    }
  >
}

/**
 * Initial state for status slice.
 */
const initialState: StatusState = {
  statusFilter: {
    uncleared: true,
    cleared: true,
    reconciled: true,
  },
  selectedIds: [],
  isSelectAllMode: false,
  excludedIds: [],
  reconciliation: {
    isActive: false,
    statementBalance: null,
    statementDate: null,
  },
  pendingChanges: {},
}

/**
 * Status slice with reducers.
 */
const statusSlice = createSlice({
  name: 'status',
  initialState,
  reducers: {
    // ==========================================================================
    // Status Filter Actions
    // ==========================================================================

    /**
     * Set the complete status filter state.
     */
    setStatusFilter: (state, action: PayloadAction<StatusFilterState>) => {
      state.statusFilter = action.payload
    },

    /**
     * Toggle a single status filter.
     */
    toggleStatusFilter: (
      state,
      action: PayloadAction<keyof StatusFilterState>
    ) => {
      const key = action.payload
      state.statusFilter[key] = !state.statusFilter[key]
    },

    /**
     * Reset status filters to show all.
     */
    resetStatusFilters: (state) => {
      state.statusFilter = {
        uncleared: true,
        cleared: true,
        reconciled: true,
      }
    },

    /**
     * Set status filter to show only specific statuses.
     */
    setActiveStatusFilters: (
      state,
      action: PayloadAction<TransactionStatus[]>
    ) => {
      state.statusFilter = {
        uncleared: action.payload.includes('UNCLEARED'),
        cleared: action.payload.includes('CLEARED'),
        reconciled: action.payload.includes('RECONCILED'),
      }
    },

    // ==========================================================================
    // Bulk Selection Actions
    // ==========================================================================

    /**
     * Toggle selection of a single transaction.
     */
    toggleSelection: (state, action: PayloadAction<string>) => {
      const id = action.payload
      const index = state.selectedIds.indexOf(id)

      if (state.isSelectAllMode) {
        // In select all mode, toggle exclusion
        const excludeIndex = state.excludedIds.indexOf(id)
        if (excludeIndex === -1) {
          state.excludedIds.push(id)
        } else {
          state.excludedIds.splice(excludeIndex, 1)
        }
      } else {
        // Normal selection mode
        if (index === -1) {
          state.selectedIds.push(id)
        } else {
          state.selectedIds.splice(index, 1)
        }
      }
    },

    /**
     * Select multiple transactions at once.
     */
    selectMultiple: (state, action: PayloadAction<string[]>) => {
      const ids = action.payload
      ids.forEach((id) => {
        if (!state.selectedIds.includes(id)) {
          state.selectedIds.push(id)
        }
      })
    },

    /**
     * Toggle select all mode.
     */
    toggleSelectAll: (state) => {
      if (state.isSelectAllMode) {
        // Turn off select all
        state.isSelectAllMode = false
        state.excludedIds = []
        state.selectedIds = []
      } else {
        // Turn on select all
        state.isSelectAllMode = true
        state.excludedIds = []
        state.selectedIds = []
      }
    },

    /**
     * Set select all with specific exclusions.
     */
    setSelectAllWithExclusions: (state, action: PayloadAction<string[]>) => {
      state.isSelectAllMode = true
      state.excludedIds = action.payload
      state.selectedIds = []
    },

    /**
     * Clear all selections.
     */
    clearSelection: (state) => {
      state.selectedIds = []
      state.isSelectAllMode = false
      state.excludedIds = []
    },

    /**
     * Select specific transaction IDs (replaces current selection).
     */
    setSelection: (state, action: PayloadAction<string[]>) => {
      state.selectedIds = action.payload
      state.isSelectAllMode = false
      state.excludedIds = []
    },

    // ==========================================================================
    // Reconciliation Actions
    // ==========================================================================

    /**
     * Start the reconciliation workflow.
     */
    startReconciliation: (state) => {
      state.reconciliation.isActive = true
    },

    /**
     * Set the statement balance for reconciliation.
     */
    setStatementBalance: (state, action: PayloadAction<number>) => {
      state.reconciliation.statementBalance = action.payload
    },

    /**
     * Set the statement date for reconciliation.
     */
    setStatementDate: (state, action: PayloadAction<string>) => {
      state.reconciliation.statementDate = action.payload
    },

    /**
     * Cancel the reconciliation workflow.
     */
    cancelReconciliation: (state) => {
      state.reconciliation = {
        isActive: false,
        statementBalance: null,
        statementDate: null,
      }
      // Also clear selections when canceling
      state.selectedIds = []
      state.isSelectAllMode = false
      state.excludedIds = []
    },

    /**
     * Complete the reconciliation workflow (reset state).
     */
    completeReconciliation: (state) => {
      state.reconciliation = {
        isActive: false,
        statementBalance: null,
        statementDate: null,
      }
      state.selectedIds = []
      state.isSelectAllMode = false
      state.excludedIds = []
    },

    // ==========================================================================
    // Optimistic Update Actions
    // ==========================================================================

    /**
     * Track a pending optimistic status change.
     */
    trackPendingChange: (
      state,
      action: PayloadAction<{
        transactionId: string
        previousStatus: TransactionStatus
        newStatus: TransactionStatus
      }>
    ) => {
      const { transactionId, previousStatus, newStatus } = action.payload
      state.pendingChanges[transactionId] = {
        previousStatus,
        newStatus,
        timestamp: Date.now(),
      }
    },

    /**
     * Clear a pending change after successful update.
     */
    clearPendingChange: (state, action: PayloadAction<string>) => {
      delete state.pendingChanges[action.payload]
    },

    /**
     * Clear all pending changes.
     */
    clearAllPendingChanges: (state) => {
      state.pendingChanges = {}
    },

    /**
     * Reset the entire status state.
     */
    resetStatusState: () => initialState,
  },
})

// Export actions
export const {
  setStatusFilter,
  toggleStatusFilter,
  resetStatusFilters,
  setActiveStatusFilters,
  toggleSelection,
  selectMultiple,
  toggleSelectAll,
  setSelectAllWithExclusions,
  clearSelection,
  setSelection,
  startReconciliation,
  setStatementBalance,
  setStatementDate,
  cancelReconciliation,
  completeReconciliation,
  trackPendingChange,
  clearPendingChange,
  clearAllPendingChanges,
  resetStatusState,
} = statusSlice.actions

// =============================================================================
// Base Selectors
// =============================================================================

/**
 * Select the status filter state.
 */
export const selectStatusFilter = (state: RootState) => state.status.statusFilter

/**
 * Select the selected transaction IDs.
 */
export const selectSelectedIds = (state: RootState) => state.status.selectedIds

/**
 * Select whether select all mode is active.
 */
export const selectIsSelectAllMode = (state: RootState) =>
  state.status.isSelectAllMode

/**
 * Select the excluded IDs (for select all mode).
 */
export const selectExcludedIds = (state: RootState) => state.status.excludedIds

/**
 * Select the reconciliation state.
 */
export const selectReconciliation = (state: RootState) =>
  state.status.reconciliation

/**
 * Select the pending changes map.
 */
export const selectPendingChanges = (state: RootState) =>
  state.status.pendingChanges

// =============================================================================
// Derived Selectors
// =============================================================================

/**
 * Select active status filters as an array.
 */
export const selectActiveStatusFilters = createSelector(
  [selectStatusFilter],
  (filter): TransactionStatus[] => {
    const active: TransactionStatus[] = []
    if (filter.uncleared) active.push('UNCLEARED')
    if (filter.cleared) active.push('CLEARED')
    if (filter.reconciled) active.push('RECONCILED')
    return active
  }
)

/**
 * Check if all status filters are active.
 */
export const selectAllFiltersActive = createSelector(
  [selectStatusFilter],
  (filter): boolean => filter.uncleared && filter.cleared && filter.reconciled
)

/**
 * Check if no status filters are active.
 */
export const selectNoFiltersActive = createSelector(
  [selectStatusFilter],
  (filter): boolean => !filter.uncleared && !filter.cleared && !filter.reconciled
)

/**
 * Get the selection count (for normal mode).
 */
export const selectSelectionCount = createSelector(
  [selectSelectedIds],
  (selectedIds): number => selectedIds.length
)

/**
 * Create a selector to check if a specific transaction is selected.
 */
export const makeSelectIsSelected = () =>
  createSelector(
    [
      selectSelectedIds,
      selectIsSelectAllMode,
      selectExcludedIds,
      (_state: RootState, transactionId: string) => transactionId,
    ],
    (selectedIds, isSelectAllMode, excludedIds, transactionId): boolean => {
      if (isSelectAllMode) {
        return !excludedIds.includes(transactionId)
      }
      return selectedIds.includes(transactionId)
    }
  )

/**
 * Determine the selection mode for select all checkbox.
 */
export const selectSelectionMode = createSelector(
  [selectSelectedIds, selectIsSelectAllMode, selectExcludedIds],
  (selectedIds, isSelectAllMode, excludedIds): SelectionMode => {
    if (isSelectAllMode && excludedIds.length === 0) {
      return 'all'
    }
    if (isSelectAllMode || selectedIds.length > 0) {
      return 'some'
    }
    return 'none'
  }
)

/**
 * Check if reconciliation is active.
 */
export const selectIsReconciliationActive = createSelector(
  [selectReconciliation],
  (reconciliation): boolean => reconciliation.isActive
)

/**
 * Check if reconciliation is ready to complete.
 */
export const selectIsReconciliationReady = createSelector(
  [selectReconciliation, selectSelectionCount],
  (reconciliation, selectionCount): boolean =>
    reconciliation.isActive &&
    reconciliation.statementBalance !== null &&
    reconciliation.statementDate !== null &&
    selectionCount > 0
)

/**
 * Get the difference between statement balance and cleared balance.
 * Returns null if statement balance is not set.
 */
export const selectReconciliationDifference = createSelector(
  [selectReconciliation],
  (reconciliation): number | null => {
    if (reconciliation.statementBalance === null) {
      return null
    }
    // Note: actual cleared balance would come from the reconciliation summary API
    return reconciliation.statementBalance
  }
)

/**
 * Check if a transaction has a pending status change.
 */
export const makeSelectHasPendingChange = () =>
  createSelector(
    [
      selectPendingChanges,
      (_state: RootState, transactionId: string) => transactionId,
    ],
    (pendingChanges, transactionId): boolean =>
      transactionId in pendingChanges
  )

/**
 * Get selected transaction IDs for bulk operations.
 * In select all mode, this returns null to indicate all should be selected.
 */
export const selectBulkOperationIds = createSelector(
  [selectSelectedIds, selectIsSelectAllMode, selectExcludedIds],
  (
    selectedIds,
    isSelectAllMode,
    excludedIds
  ): { mode: 'specific' | 'all'; ids: string[] } => {
    if (isSelectAllMode) {
      return { mode: 'all', ids: excludedIds }
    }
    return { mode: 'specific', ids: selectedIds }
  }
)

/**
 * Filter transactions by status filter.
 */
export const makeSelectFilteredTransactions = () =>
  createSelector(
    [
      selectStatusFilter,
      (
        _state: RootState,
        transactions: TransactionWithStatus[]
      ) => transactions,
    ],
    (filter, transactions): TransactionWithStatus[] => {
      return transactions.filter((t) => {
        switch (t.status) {
          case 'UNCLEARED':
            return filter.uncleared
          case 'CLEARED':
            return filter.cleared
          case 'RECONCILED':
            return filter.reconciled
          default:
            return true
        }
      })
    }
  )

/**
 * Calculate effective selected count considering all transactions.
 */
export const makeSelectEffectiveSelectedCount = () =>
  createSelector(
    [
      selectSelectedIds,
      selectIsSelectAllMode,
      selectExcludedIds,
      (_state: RootState, totalCount: number) => totalCount,
    ],
    (selectedIds, isSelectAllMode, excludedIds, totalCount): number => {
      if (isSelectAllMode) {
        return totalCount - excludedIds.length
      }
      return selectedIds.length
    }
  )

export default statusSlice.reducer
