/**
 * Tests for statusSlice Redux slice
 *
 * Covers:
 * - Status filter actions and selectors
 * - Bulk selection actions and selectors
 * - Reconciliation actions and selectors
 * - Optimistic update tracking
 */

import { describe, it, expect } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import statusReducer, {
  // Status filter actions
  setStatusFilter,
  toggleStatusFilter,
  resetStatusFilters,
  setActiveStatusFilters,
  // Bulk selection actions
  toggleSelection,
  selectMultiple,
  toggleSelectAll,
  setSelectAllWithExclusions,
  clearSelection,
  setSelection,
  // Reconciliation actions
  startReconciliation,
  setStatementBalance,
  setStatementDate,
  cancelReconciliation,
  completeReconciliation,
  // Optimistic update actions
  trackPendingChange,
  clearPendingChange,
  clearAllPendingChanges,
  resetStatusState,
  // Base selectors
  selectStatusFilter,
  selectSelectedIds,
  selectIsSelectAllMode,
  selectExcludedIds,
  selectReconciliation,
  selectPendingChanges,
  // Derived selectors
  selectActiveStatusFilters,
  selectAllFiltersActive,
  selectNoFiltersActive,
  selectSelectionCount,
  makeSelectIsSelected,
  selectSelectionMode,
  selectIsReconciliationActive,
  selectIsReconciliationReady,
  selectReconciliationDifference,
  makeSelectHasPendingChange,
  selectBulkOperationIds,
  makeSelectFilteredTransactions,
  makeSelectEffectiveSelectedCount,
} from '../statusSlice'
import type { RootState } from '@/store'
import type { TransactionWithStatus } from '@/features/status/types'

// Helper to create a test store
function createTestStore() {
  return configureStore({
    reducer: {
      status: statusReducer,
    },
  })
}

// Helper to get status state
function getStatusState(store: ReturnType<typeof createTestStore>) {
  return (store.getState() as unknown as RootState).status
}

describe('statusSlice', () => {
  describe('Status Filter Actions', () => {
    it('should set status filter', () => {
      const store = createTestStore()
      store.dispatch(
        setStatusFilter({ uncleared: false, cleared: true, reconciled: true })
      )

      const state = getStatusState(store)
      expect(state.statusFilter).toEqual({
        uncleared: false,
        cleared: true,
        reconciled: true,
      })
    })

    it('should toggle status filter', () => {
      const store = createTestStore()

      // Initially all are true
      expect(getStatusState(store).statusFilter.uncleared).toBe(true)

      // Toggle to false
      store.dispatch(toggleStatusFilter('uncleared'))
      expect(getStatusState(store).statusFilter.uncleared).toBe(false)

      // Toggle back to true
      store.dispatch(toggleStatusFilter('uncleared'))
      expect(getStatusState(store).statusFilter.uncleared).toBe(true)
    })

    it('should reset status filters to all true', () => {
      const store = createTestStore()

      // Set some filters to false
      store.dispatch(setStatusFilter({ uncleared: false, cleared: false, reconciled: false }))

      // Reset
      store.dispatch(resetStatusFilters())

      const state = getStatusState(store)
      expect(state.statusFilter).toEqual({
        uncleared: true,
        cleared: true,
        reconciled: true,
      })
    })

    it('should set active status filters from array', () => {
      const store = createTestStore()

      store.dispatch(setActiveStatusFilters(['CLEARED', 'RECONCILED']))

      const state = getStatusState(store)
      expect(state.statusFilter).toEqual({
        uncleared: false,
        cleared: true,
        reconciled: true,
      })
    })

    it('should set active status filters to single status', () => {
      const store = createTestStore()

      store.dispatch(setActiveStatusFilters(['UNCLEARED']))

      const state = getStatusState(store)
      expect(state.statusFilter).toEqual({
        uncleared: true,
        cleared: false,
        reconciled: false,
      })
    })
  })

  describe('Bulk Selection Actions', () => {
    it('should toggle individual selection in normal mode', () => {
      const store = createTestStore()

      // Add transaction
      store.dispatch(toggleSelection('txn-1'))
      expect(getStatusState(store).selectedIds).toContain('txn-1')

      // Remove transaction
      store.dispatch(toggleSelection('txn-1'))
      expect(getStatusState(store).selectedIds).not.toContain('txn-1')
    })

    it('should toggle exclusion in select all mode', () => {
      const store = createTestStore()

      // Enable select all mode
      store.dispatch(toggleSelectAll())
      expect(getStatusState(store).isSelectAllMode).toBe(true)

      // Toggle should exclude the transaction
      store.dispatch(toggleSelection('txn-1'))
      expect(getStatusState(store).excludedIds).toContain('txn-1')

      // Toggle again should un-exclude
      store.dispatch(toggleSelection('txn-1'))
      expect(getStatusState(store).excludedIds).not.toContain('txn-1')
    })

    it('should select multiple transactions', () => {
      const store = createTestStore()

      store.dispatch(selectMultiple(['txn-1', 'txn-2', 'txn-3']))

      const state = getStatusState(store)
      expect(state.selectedIds).toEqual(['txn-1', 'txn-2', 'txn-3'])
    })

    it('should not duplicate when selecting already selected transactions', () => {
      const store = createTestStore()

      store.dispatch(selectMultiple(['txn-1', 'txn-2']))
      store.dispatch(selectMultiple(['txn-2', 'txn-3']))

      const state = getStatusState(store)
      expect(state.selectedIds).toEqual(['txn-1', 'txn-2', 'txn-3'])
    })

    it('should toggle select all mode on', () => {
      const store = createTestStore()

      store.dispatch(toggleSelectAll())

      const state = getStatusState(store)
      expect(state.isSelectAllMode).toBe(true)
      expect(state.excludedIds).toEqual([])
      expect(state.selectedIds).toEqual([])
    })

    it('should toggle select all mode off and clear state', () => {
      const store = createTestStore()

      // Turn on
      store.dispatch(toggleSelectAll())
      // Exclude some
      store.dispatch(toggleSelection('txn-1'))

      // Turn off
      store.dispatch(toggleSelectAll())

      const state = getStatusState(store)
      expect(state.isSelectAllMode).toBe(false)
      expect(state.excludedIds).toEqual([])
      expect(state.selectedIds).toEqual([])
    })

    it('should set select all with exclusions', () => {
      const store = createTestStore()

      store.dispatch(setSelectAllWithExclusions(['txn-1', 'txn-2']))

      const state = getStatusState(store)
      expect(state.isSelectAllMode).toBe(true)
      expect(state.excludedIds).toEqual(['txn-1', 'txn-2'])
      expect(state.selectedIds).toEqual([])
    })

    it('should clear all selections', () => {
      const store = createTestStore()

      // Set up some selections
      store.dispatch(selectMultiple(['txn-1', 'txn-2']))
      store.dispatch(clearSelection())

      const state = getStatusState(store)
      expect(state.selectedIds).toEqual([])
      expect(state.isSelectAllMode).toBe(false)
      expect(state.excludedIds).toEqual([])
    })

    it('should set specific selection', () => {
      const store = createTestStore()

      // Set initial selection
      store.dispatch(selectMultiple(['txn-1', 'txn-2']))

      // Replace with new selection
      store.dispatch(setSelection(['txn-3', 'txn-4']))

      const state = getStatusState(store)
      expect(state.selectedIds).toEqual(['txn-3', 'txn-4'])
      expect(state.isSelectAllMode).toBe(false)
    })
  })

  describe('Reconciliation Actions', () => {
    it('should start reconciliation', () => {
      const store = createTestStore()

      store.dispatch(startReconciliation())

      const state = getStatusState(store)
      expect(state.reconciliation.isActive).toBe(true)
    })

    it('should set statement balance', () => {
      const store = createTestStore()

      store.dispatch(setStatementBalance(5000.50))

      const state = getStatusState(store)
      expect(state.reconciliation.statementBalance).toBe(5000.50)
    })

    it('should set statement date', () => {
      const store = createTestStore()

      store.dispatch(setStatementDate('2026-01-15'))

      const state = getStatusState(store)
      expect(state.reconciliation.statementDate).toBe('2026-01-15')
    })

    it('should cancel reconciliation and clear state', () => {
      const store = createTestStore()

      // Set up reconciliation state
      store.dispatch(startReconciliation())
      store.dispatch(setStatementBalance(5000))
      store.dispatch(setStatementDate('2026-01-15'))
      store.dispatch(selectMultiple(['txn-1', 'txn-2']))

      // Cancel
      store.dispatch(cancelReconciliation())

      const state = getStatusState(store)
      expect(state.reconciliation).toEqual({
        isActive: false,
        statementBalance: null,
        statementDate: null,
      })
      expect(state.selectedIds).toEqual([])
      expect(state.isSelectAllMode).toBe(false)
      expect(state.excludedIds).toEqual([])
    })

    it('should complete reconciliation and reset state', () => {
      const store = createTestStore()

      // Set up reconciliation state
      store.dispatch(startReconciliation())
      store.dispatch(setStatementBalance(5000))
      store.dispatch(setStatementDate('2026-01-15'))
      store.dispatch(selectMultiple(['txn-1', 'txn-2']))

      // Complete
      store.dispatch(completeReconciliation())

      const state = getStatusState(store)
      expect(state.reconciliation).toEqual({
        isActive: false,
        statementBalance: null,
        statementDate: null,
      })
      expect(state.selectedIds).toEqual([])
    })
  })

  describe('Optimistic Update Actions', () => {
    it('should track pending change', () => {
      const store = createTestStore()

      store.dispatch(
        trackPendingChange({
          transactionId: 'txn-1',
          previousStatus: 'UNCLEARED',
          newStatus: 'CLEARED',
        })
      )

      const state = getStatusState(store)
      expect(state.pendingChanges['txn-1']).toBeDefined()
      expect(state.pendingChanges['txn-1']?.previousStatus).toBe('UNCLEARED')
      expect(state.pendingChanges['txn-1']?.newStatus).toBe('CLEARED')
      expect(state.pendingChanges['txn-1']?.timestamp).toBeGreaterThan(0)
    })

    it('should clear pending change', () => {
      const store = createTestStore()

      // Track change
      store.dispatch(
        trackPendingChange({
          transactionId: 'txn-1',
          previousStatus: 'UNCLEARED',
          newStatus: 'CLEARED',
        })
      )

      // Clear it
      store.dispatch(clearPendingChange('txn-1'))

      const state = getStatusState(store)
      expect(state.pendingChanges['txn-1']).toBeUndefined()
    })

    it('should clear all pending changes', () => {
      const store = createTestStore()

      // Track multiple changes
      store.dispatch(
        trackPendingChange({
          transactionId: 'txn-1',
          previousStatus: 'UNCLEARED',
          newStatus: 'CLEARED',
        })
      )
      store.dispatch(
        trackPendingChange({
          transactionId: 'txn-2',
          previousStatus: 'CLEARED',
          newStatus: 'RECONCILED',
        })
      )

      // Clear all
      store.dispatch(clearAllPendingChanges())

      const state = getStatusState(store)
      expect(Object.keys(state.pendingChanges)).toHaveLength(0)
    })

    it('should reset entire status state', () => {
      const store = createTestStore()

      // Make various changes
      store.dispatch(setStatusFilter({ uncleared: false, cleared: true, reconciled: true }))
      store.dispatch(selectMultiple(['txn-1', 'txn-2']))
      store.dispatch(startReconciliation())
      store.dispatch(trackPendingChange({
        transactionId: 'txn-1',
        previousStatus: 'UNCLEARED',
        newStatus: 'CLEARED',
      }))

      // Reset
      store.dispatch(resetStatusState())

      const state = getStatusState(store)
      expect(state.statusFilter).toEqual({
        uncleared: true,
        cleared: true,
        reconciled: true,
      })
      expect(state.selectedIds).toEqual([])
      expect(state.reconciliation.isActive).toBe(false)
      expect(Object.keys(state.pendingChanges)).toHaveLength(0)
    })
  })

  describe('Selectors', () => {
    describe('Base Selectors', () => {
      it('should select status filter', () => {
        const store = createTestStore()
        store.dispatch(setStatusFilter({ uncleared: false, cleared: true, reconciled: true }))

        const state = store.getState() as unknown as RootState
        const filter = selectStatusFilter(state)
        expect(filter).toEqual({ uncleared: false, cleared: true, reconciled: true })
      })

      it('should select selected IDs', () => {
        const store = createTestStore()
        store.dispatch(selectMultiple(['txn-1', 'txn-2']))

        const state = store.getState() as unknown as RootState
        const ids = selectSelectedIds(state)
        expect(ids).toEqual(['txn-1', 'txn-2'])
      })

      it('should select is select all mode', () => {
        const store = createTestStore()
        store.dispatch(toggleSelectAll())

        const state = store.getState() as unknown as RootState
        const isSelectAll = selectIsSelectAllMode(state)
        expect(isSelectAll).toBe(true)
      })

      it('should select excluded IDs', () => {
        const store = createTestStore()
        store.dispatch(setSelectAllWithExclusions(['txn-1', 'txn-2']))

        const state = store.getState() as unknown as RootState
        const excludedIds = selectExcludedIds(state)
        expect(excludedIds).toEqual(['txn-1', 'txn-2'])
      })

      it('should select reconciliation state', () => {
        const store = createTestStore()
        store.dispatch(startReconciliation())
        store.dispatch(setStatementBalance(5000))

        const state = store.getState() as unknown as RootState
        const reconciliation = selectReconciliation(state)
        expect(reconciliation.isActive).toBe(true)
        expect(reconciliation.statementBalance).toBe(5000)
      })

      it('should select pending changes', () => {
        const store = createTestStore()
        store.dispatch(
          trackPendingChange({
            transactionId: 'txn-1',
            previousStatus: 'UNCLEARED',
            newStatus: 'CLEARED',
          })
        )

        const state = store.getState() as unknown as RootState
        const pendingChanges = selectPendingChanges(state)
        expect(pendingChanges['txn-1']).toBeDefined()
      })
    })

    describe('Derived Selectors', () => {
      it('should select active status filters as array', () => {
        const store = createTestStore()
        store.dispatch(setActiveStatusFilters(['CLEARED', 'RECONCILED']))

        const state = store.getState() as unknown as RootState
        const activeFilters = selectActiveStatusFilters(state)
        expect(activeFilters).toEqual(['CLEARED', 'RECONCILED'])
      })

      it('should select all filters active', () => {
        const store = createTestStore()

        const state = store.getState() as unknown as RootState
        const allActive = selectAllFiltersActive(state)
        expect(allActive).toBe(true)
      })

      it('should select no filters active', () => {
        const store = createTestStore()
        store.dispatch(setStatusFilter({ uncleared: false, cleared: false, reconciled: false }))

        const state = store.getState() as unknown as RootState
        const noneActive = selectNoFiltersActive(state)
        expect(noneActive).toBe(true)
      })

      it('should select selection count', () => {
        const store = createTestStore()
        store.dispatch(selectMultiple(['txn-1', 'txn-2', 'txn-3']))

        const state = store.getState() as unknown as RootState
        const count = selectSelectionCount(state)
        expect(count).toBe(3)
      })

      it('should make selector to check if transaction is selected in normal mode', () => {
        const store = createTestStore()
        store.dispatch(selectMultiple(['txn-1', 'txn-2']))

        const state = store.getState() as unknown as RootState
        const selectIsSelected = makeSelectIsSelected()

        expect(selectIsSelected(state, 'txn-1')).toBe(true)
        expect(selectIsSelected(state, 'txn-3')).toBe(false)
      })

      it('should make selector to check if transaction is selected in select all mode', () => {
        const store = createTestStore()
        store.dispatch(setSelectAllWithExclusions(['txn-1']))

        const state = store.getState() as unknown as RootState
        const selectIsSelected = makeSelectIsSelected()

        expect(selectIsSelected(state, 'txn-1')).toBe(false)
        expect(selectIsSelected(state, 'txn-2')).toBe(true)
      })

      it('should select selection mode as none', () => {
        const store = createTestStore()

        const state = store.getState() as unknown as RootState
        const mode = selectSelectionMode(state)
        expect(mode).toBe('none')
      })

      it('should select selection mode as some', () => {
        const store = createTestStore()
        store.dispatch(selectMultiple(['txn-1']))

        const state = store.getState() as unknown as RootState
        const mode = selectSelectionMode(state)
        expect(mode).toBe('some')
      })

      it('should select selection mode as all', () => {
        const store = createTestStore()
        store.dispatch(toggleSelectAll())

        const state = store.getState() as unknown as RootState
        const mode = selectSelectionMode(state)
        expect(mode).toBe('all')
      })

      it('should select is reconciliation active', () => {
        const store = createTestStore()
        store.dispatch(startReconciliation())

        const state = store.getState() as unknown as RootState
        const isActive = selectIsReconciliationActive(state)
        expect(isActive).toBe(true)
      })

      it('should select is reconciliation ready when all conditions met', () => {
        const store = createTestStore()
        store.dispatch(startReconciliation())
        store.dispatch(setStatementBalance(5000))
        store.dispatch(setStatementDate('2026-01-15'))
        store.dispatch(selectMultiple(['txn-1']))

        const state = store.getState() as unknown as RootState
        const isReady = selectIsReconciliationReady(state)
        expect(isReady).toBe(true)
      })

      it('should select is reconciliation not ready when conditions not met', () => {
        const store = createTestStore()
        store.dispatch(startReconciliation())

        const state = store.getState() as unknown as RootState
        const isReady = selectIsReconciliationReady(state)
        expect(isReady).toBe(false)
      })

      it('should select reconciliation difference', () => {
        const store = createTestStore()
        store.dispatch(setStatementBalance(5000))

        const state = store.getState() as unknown as RootState
        const difference = selectReconciliationDifference(state)
        expect(difference).toBe(5000)
      })

      it('should select reconciliation difference as null when not set', () => {
        const store = createTestStore()

        const state = store.getState() as unknown as RootState
        const difference = selectReconciliationDifference(state)
        expect(difference).toBeNull()
      })

      it('should make selector to check if transaction has pending change', () => {
        const store = createTestStore()
        store.dispatch(
          trackPendingChange({
            transactionId: 'txn-1',
            previousStatus: 'UNCLEARED',
            newStatus: 'CLEARED',
          })
        )

        const state = store.getState() as unknown as RootState
        const selectHasPending = makeSelectHasPendingChange()

        expect(selectHasPending(state, 'txn-1')).toBe(true)
        expect(selectHasPending(state, 'txn-2')).toBe(false)
      })

      it('should select bulk operation IDs in specific mode', () => {
        const store = createTestStore()
        store.dispatch(selectMultiple(['txn-1', 'txn-2']))

        const state = store.getState() as unknown as RootState
        const bulkIds = selectBulkOperationIds(state)
        expect(bulkIds).toEqual({ mode: 'specific', ids: ['txn-1', 'txn-2'] })
      })

      it('should select bulk operation IDs in all mode', () => {
        const store = createTestStore()
        store.dispatch(setSelectAllWithExclusions(['txn-1']))

        const state = store.getState() as unknown as RootState
        const bulkIds = selectBulkOperationIds(state)
        expect(bulkIds).toEqual({ mode: 'all', ids: ['txn-1'] })
      })

      it('should make selector to filter transactions by status', () => {
        const store = createTestStore()
        store.dispatch(setActiveStatusFilters(['CLEARED']))

        const transactions: TransactionWithStatus[] = [
          { id: 'txn-1', status: 'UNCLEARED' } as TransactionWithStatus,
          { id: 'txn-2', status: 'CLEARED' } as TransactionWithStatus,
          { id: 'txn-3', status: 'RECONCILED' } as TransactionWithStatus,
        ]

        const state = store.getState() as unknown as RootState
        const selectFiltered = makeSelectFilteredTransactions()
        const filtered = selectFiltered(state, transactions)

        expect(filtered).toHaveLength(1)
        expect(filtered[0]?.id).toBe('txn-2')
      })

      it('should make selector to calculate effective selected count in normal mode', () => {
        const store = createTestStore()
        store.dispatch(selectMultiple(['txn-1', 'txn-2']))

        const state = store.getState() as unknown as RootState
        const selectEffectiveCount = makeSelectEffectiveSelectedCount()
        const count = selectEffectiveCount(state, 10)

        expect(count).toBe(2)
      })

      it('should make selector to calculate effective selected count in select all mode', () => {
        const store = createTestStore()
        store.dispatch(setSelectAllWithExclusions(['txn-1', 'txn-2']))

        const state = store.getState() as unknown as RootState
        const selectEffectiveCount = makeSelectEffectiveSelectedCount()
        const count = selectEffectiveCount(state, 10)

        expect(count).toBe(8)
      })
    })
  })
})
