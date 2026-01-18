/**
 * useReconciliation Hook
 *
 * Manages the reconciliation workflow state and operations.
 */

import { useCallback, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  startReconciliation as startReconciliationAction,
  cancelReconciliation as cancelReconciliationAction,
  completeReconciliation as completeReconciliationAction,
  setStatementBalance,
  setStatementDate,
  selectReconciliation,
  selectIsReconciliationActive,
  selectIsReconciliationReady,
  clearSelection,
} from '@/store/features/statusSlice'
import {
  useGetReconciliationSummaryQuery,
  useCompleteReconciliationMutation,
} from '../api'
import type { ReconciliationSummary } from '../types'

/**
 * Hook options.
 */
interface UseReconciliationOptions {
  orgId: string
  accountId: string
  /** Enable polling for summary updates */
  enablePolling?: boolean
  /** Polling interval in ms */
  pollingInterval?: number
}

/**
 * Hook return type.
 */
interface UseReconciliationReturn {
  /** Whether reconciliation is active */
  isActive: boolean
  /** Whether reconciliation is ready to complete */
  isReady: boolean
  /** Statement balance entered by user */
  statementBalance: number | null
  /** Statement date entered by user */
  statementDate: string | null
  /** Reconciliation summary data */
  summary: ReconciliationSummary | null
  /** Summary loading state */
  isSummaryLoading: boolean
  /** Summary error */
  summaryError: unknown
  /** Completing reconciliation loading state */
  isCompleting: boolean
  /** Difference between statement and cleared balance */
  difference: number
  /** Whether balances match */
  isBalanced: boolean
  /** Start the reconciliation workflow */
  start: () => void
  /** Cancel the reconciliation workflow */
  cancel: () => void
  /** Update statement balance */
  updateBalance: (balance: number) => void
  /** Update statement date */
  updateDate: (date: string) => void
  /** Complete reconciliation with selected transactions */
  complete: (transactionIds: string[], notes?: string) => Promise<void>
  /** Refresh summary data */
  refetchSummary: () => Promise<void>
}

/**
 * useReconciliation provides reconciliation workflow management.
 *
 * Features:
 * - Start/cancel reconciliation
 * - Statement balance/date management
 * - Summary polling during reconciliation
 * - Complete reconciliation operation
 * - Balance difference calculation
 */
export function useReconciliation({
  orgId,
  accountId,
  enablePolling = true,
  pollingInterval = 5000,
}: UseReconciliationOptions): UseReconciliationReturn {
  const dispatch = useAppDispatch()
  const reconciliation = useAppSelector(selectReconciliation)
  const isActive = useAppSelector(selectIsReconciliationActive)
  const isReady = useAppSelector(selectIsReconciliationReady)

  // Fetch summary with optional polling
  const {
    data: summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useGetReconciliationSummaryQuery(
    { orgId, accountId },
    {
      skip: !orgId || !accountId,
      pollingInterval: enablePolling && isActive ? pollingInterval : undefined,
    }
  )

  // Complete reconciliation mutation
  const [completeReconciliationMutation, { isLoading: isCompleting }] =
    useCompleteReconciliationMutation()

  // Calculate difference
  const clearedBalance = summary?.clearedBalance ?? 0
  const statementBalance = reconciliation.statementBalance
  const difference = useMemo(() => {
    if (statementBalance === null) return 0
    return statementBalance - clearedBalance
  }, [statementBalance, clearedBalance])

  const isBalanced = useMemo(() => {
    return statementBalance !== null && Math.abs(difference) < 0.01
  }, [statementBalance, difference])

  /**
   * Start the reconciliation workflow.
   */
  const start = useCallback((): void => {
    dispatch(startReconciliationAction())
  }, [dispatch])

  /**
   * Cancel the reconciliation workflow.
   */
  const cancel = useCallback((): void => {
    dispatch(cancelReconciliationAction())
    dispatch(clearSelection())
  }, [dispatch])

  /**
   * Update the statement balance.
   */
  const updateBalance = useCallback(
    (balance: number): void => {
      dispatch(setStatementBalance(balance))
    },
    [dispatch]
  )

  /**
   * Update the statement date.
   */
  const updateDate = useCallback(
    (date: string): void => {
      dispatch(setStatementDate(date))
    },
    [dispatch]
  )

  /**
   * Complete the reconciliation.
   */
  const complete = useCallback(
    async (transactionIds: string[], notes?: string): Promise<void> => {
      if (statementBalance === null || reconciliation.statementDate === null) {
        throw new Error('Statement balance and date are required')
      }

      await completeReconciliationMutation({
        orgId,
        accountId,
        statementBalance,
        statementDate: reconciliation.statementDate,
        transactionIds,
        notes,
      }).unwrap()

      // Reset reconciliation state on success
      dispatch(completeReconciliationAction())
      dispatch(clearSelection())
    },
    [
      dispatch,
      completeReconciliationMutation,
      orgId,
      accountId,
      statementBalance,
      reconciliation.statementDate,
    ]
  )

  return {
    isActive,
    isReady,
    statementBalance,
    statementDate: reconciliation.statementDate,
    summary: summary ?? null,
    isSummaryLoading,
    summaryError,
    isCompleting,
    difference,
    isBalanced,
    start,
    cancel,
    updateBalance,
    updateDate,
    complete,
    refetchSummary: async () => {
      await refetchSummary()
    },
  }
}

export type { UseReconciliationOptions, UseReconciliationReturn }
