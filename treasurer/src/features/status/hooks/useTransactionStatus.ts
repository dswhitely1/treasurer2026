/**
 * useTransactionStatus Hook
 *
 * Provides status change functionality with optimistic updates
 * and error handling.
 */

import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  trackPendingChange,
  clearPendingChange,
  selectPendingChanges,
} from '@/store/features/statusSlice'
import {
  useChangeTransactionStatusMutation,
  useBulkChangeStatusMutation,
} from '../api'
import type { TransactionStatus } from '../types'

/**
 * Hook options.
 */
interface UseTransactionStatusOptions {
  orgId: string
  accountId: string
}

/**
 * Hook return type.
 */
interface UseTransactionStatusReturn {
  /** Change status of a single transaction */
  changeStatus: (
    transactionId: string,
    newStatus: TransactionStatus,
    previousStatus: TransactionStatus,
    notes?: string
  ) => Promise<void>
  /** Change status of multiple transactions */
  bulkChangeStatus: (
    transactionIds: string[],
    newStatus: TransactionStatus,
    notes?: string
  ) => Promise<void>
  /** Check if a transaction has a pending status change */
  isPending: (transactionId: string) => boolean
  /** Loading state for single status change */
  isChanging: boolean
  /** Loading state for bulk status change */
  isBulkChanging: boolean
  /** Error from last status change */
  error: string | null
}

/**
 * useTransactionStatus provides optimistic status updates with rollback.
 *
 * Features:
 * - Optimistic updates via RTK Query
 * - Pending change tracking for UI feedback
 * - Error handling with rollback
 * - Bulk operations support
 */
export function useTransactionStatus({
  orgId,
  accountId,
}: UseTransactionStatusOptions): UseTransactionStatusReturn {
  const dispatch = useAppDispatch()
  const pendingChanges = useAppSelector(selectPendingChanges)

  const [
    changeTransactionStatus,
    { isLoading: isChanging, error: changeError },
  ] = useChangeTransactionStatusMutation()

  const [bulkChangeStatusMutation, { isLoading: isBulkChanging, error: bulkError }] =
    useBulkChangeStatusMutation()

  /**
   * Change status of a single transaction.
   */
  const changeStatus = useCallback(
    async (
      transactionId: string,
      newStatus: TransactionStatus,
      previousStatus: TransactionStatus,
      notes?: string
    ): Promise<void> => {
      // Track pending change for UI feedback
      dispatch(
        trackPendingChange({
          transactionId,
          previousStatus,
          newStatus,
        })
      )

      try {
        await changeTransactionStatus({
          orgId,
          accountId,
          transactionId,
          newStatus,
          notes,
        }).unwrap()

        // Clear pending on success
        dispatch(clearPendingChange(transactionId))
      } catch (error) {
        // Clear pending on error (RTK Query handles rollback)
        dispatch(clearPendingChange(transactionId))
        throw error
      }
    },
    [dispatch, changeTransactionStatus, orgId, accountId]
  )

  /**
   * Change status of multiple transactions.
   */
  const bulkChangeStatus = useCallback(
    async (
      transactionIds: string[],
      newStatus: TransactionStatus,
      notes?: string
    ): Promise<void> => {
      await bulkChangeStatusMutation({
        orgId,
        accountId,
        transactionIds,
        newStatus,
        notes,
      }).unwrap()
    },
    [bulkChangeStatusMutation, orgId, accountId]
  )

  /**
   * Check if a transaction has a pending status change.
   */
  const isPending = useCallback(
    (transactionId: string): boolean => {
      return transactionId in pendingChanges
    },
    [pendingChanges]
  )

  // Get error message
  const error =
    (changeError as { data?: { message?: string } })?.data?.message ??
    (bulkError as { data?: { message?: string } })?.data?.message ??
    null

  return {
    changeStatus,
    bulkChangeStatus,
    isPending,
    isChanging,
    isBulkChanging,
    error,
  }
}

export type { UseTransactionStatusOptions, UseTransactionStatusReturn }
