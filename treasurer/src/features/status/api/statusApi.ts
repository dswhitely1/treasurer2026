/**
 * RTK Query API for Transaction Status Management
 *
 * This module provides typed API endpoints for:
 * - Changing individual transaction status
 * - Bulk status changes
 * - Status history retrieval
 * - Reconciliation summary with polling
 * - Completing reconciliation
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { getAuthToken } from '@/lib/api'
import type {
  TransactionStatus,
  TransactionWithStatus,
  StatusChangeRequest,
  StatusChangeResponse,
  BulkStatusChangeRequest,
  BulkStatusChangeResponse,
  StatusHistoryEntry,
  StatusHistoryResponse,
  ReconciliationSummary,
  ReconciliationSummaryResponse,
  CompleteReconciliationRequest,
  CompleteReconciliationResponse,
  ActiveStatusFilters,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

/**
 * Cache tag types for invalidation.
 */
type StatusTagTypes =
  | 'Transaction'
  | 'TransactionStatus'
  | 'StatusHistory'
  | 'ReconciliationSummary'

/**
 * Parameters for fetching transactions with status.
 */
interface GetTransactionsWithStatusParams {
  orgId: string
  accountId: string
  statusFilter?: ActiveStatusFilters
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

/**
 * Response from fetching transactions with status.
 */
interface GetTransactionsWithStatusResponse {
  success: boolean
  data: {
    transactions: TransactionWithStatus[]
    total: number
    counts: Record<TransactionStatus, number>
  }
}

/**
 * Parameters for status change.
 */
interface ChangeStatusParams {
  orgId: string
  accountId: string
  transactionId: string
  newStatus: TransactionStatus
  notes?: string
}

/**
 * Parameters for bulk status change.
 */
interface BulkChangeStatusParams {
  orgId: string
  accountId: string
  transactionIds: string[]
  newStatus: TransactionStatus
  notes?: string
}

/**
 * Parameters for fetching status history.
 */
interface GetStatusHistoryParams {
  orgId: string
  accountId: string
  transactionId: string
}

/**
 * Parameters for fetching reconciliation summary.
 */
interface GetReconciliationSummaryParams {
  orgId: string
  accountId: string
}

/**
 * Status API slice with RTK Query.
 */
export const statusApi = createApi({
  reducerPath: 'statusApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = getAuthToken()
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
  tagTypes: [
    'Transaction',
    'TransactionStatus',
    'StatusHistory',
    'ReconciliationSummary',
  ] as const satisfies readonly StatusTagTypes[],
  endpoints: (builder) => ({
    /**
     * Get transactions with status for an account.
     * Supports filtering by status, date range, and pagination.
     */
    getTransactionsWithStatus: builder.query<
      GetTransactionsWithStatusResponse['data'],
      GetTransactionsWithStatusParams
    >({
      query: ({
        orgId,
        accountId,
        statusFilter,
        startDate,
        endDate,
        limit,
        offset,
      }) => {
        const params = new URLSearchParams()
        if (statusFilter && statusFilter.length > 0) {
          params.set('status', statusFilter.join(','))
        }
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
        if (limit !== undefined) params.set('limit', String(limit))
        if (offset !== undefined) params.set('offset', String(offset))

        const queryString = params.toString()
        return {
          url: `/organizations/${orgId}/accounts/${accountId}/transactions${
            queryString ? `?${queryString}` : ''
          }`,
          method: 'GET',
        }
      },
      transformResponse: (response: GetTransactionsWithStatusResponse) =>
        response.data,
      providesTags: (result, _error, { accountId }) =>
        result
          ? [
              ...result.transactions.map((t) => ({
                type: 'TransactionStatus' as const,
                id: t.id,
              })),
              { type: 'TransactionStatus' as const, id: `LIST-${accountId}` },
            ]
          : [{ type: 'TransactionStatus' as const, id: `LIST-${accountId}` }],
    }),

    /**
     * Change the status of a single transaction.
     * Supports optimistic updates via onQueryStarted.
     */
    changeTransactionStatus: builder.mutation<
      StatusChangeResponse,
      ChangeStatusParams
    >({
      query: ({ orgId, accountId, transactionId, newStatus, notes }) => ({
        url: `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
        method: 'PATCH',
        body: { status: newStatus, notes } satisfies StatusChangeRequest,
      }),
      invalidatesTags: (_result, _error, { transactionId, accountId }) => [
        { type: 'TransactionStatus', id: transactionId },
        { type: 'TransactionStatus', id: `LIST-${accountId}` },
        { type: 'StatusHistory', id: transactionId },
        { type: 'ReconciliationSummary', id: accountId },
      ],
      async onQueryStarted(
        { orgId, accountId, transactionId, newStatus },
        { dispatch, queryFulfilled }
      ) {
        // Optimistic update - find and update the transaction in cache
        const patchResult = dispatch(
          statusApi.util.updateQueryData(
            'getTransactionsWithStatus',
            { orgId, accountId },
            (draft) => {
              const transaction = draft.transactions.find(
                (t) => t.id === transactionId
              )
              if (transaction) {
                transaction.status = newStatus
                transaction.statusChangedAt = new Date().toISOString()
              }
            }
          )
        )
        try {
          await queryFulfilled
        } catch {
          // Rollback on error
          patchResult.undo()
        }
      },
    }),

    /**
     * Change the status of multiple transactions.
     * Supports optimistic updates for all affected transactions.
     */
    bulkChangeStatus: builder.mutation<
      BulkStatusChangeResponse,
      BulkChangeStatusParams
    >({
      query: ({ orgId, accountId, transactionIds, newStatus, notes }) => ({
        url: `/organizations/${orgId}/accounts/${accountId}/transactions/status/bulk`,
        method: 'POST',
        body: {
          transactionIds,
          status: newStatus,
          notes,
        } satisfies BulkStatusChangeRequest,
      }),
      invalidatesTags: (_result, _error, { transactionIds, accountId }) => [
        ...transactionIds.map((id) => ({
          type: 'TransactionStatus' as const,
          id,
        })),
        { type: 'TransactionStatus', id: `LIST-${accountId}` },
        ...transactionIds.map((id) => ({
          type: 'StatusHistory' as const,
          id,
        })),
        { type: 'ReconciliationSummary', id: accountId },
      ],
      async onQueryStarted(
        { orgId, accountId, transactionIds, newStatus },
        { dispatch, queryFulfilled }
      ) {
        // Optimistic update for all selected transactions
        const patchResult = dispatch(
          statusApi.util.updateQueryData(
            'getTransactionsWithStatus',
            { orgId, accountId },
            (draft) => {
              const now = new Date().toISOString()
              transactionIds.forEach((id) => {
                const transaction = draft.transactions.find((t) => t.id === id)
                if (transaction) {
                  transaction.status = newStatus
                  transaction.statusChangedAt = now
                }
              })
            }
          )
        )
        try {
          await queryFulfilled
        } catch {
          // Rollback on error
          patchResult.undo()
        }
      },
    }),

    /**
     * Get the status change history for a transaction.
     */
    getStatusHistory: builder.query<
      StatusHistoryEntry[],
      GetStatusHistoryParams
    >({
      query: ({ orgId, accountId, transactionId }) => ({
        url: `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status/history`,
        method: 'GET',
      }),
      transformResponse: (response: StatusHistoryResponse) =>
        response.data.history,
      providesTags: (_result, _error, { transactionId }) => [
        { type: 'StatusHistory', id: transactionId },
      ],
    }),

    /**
     * Get the reconciliation summary for an account.
     * Supports polling for real-time updates during reconciliation.
     */
    getReconciliationSummary: builder.query<
      ReconciliationSummary,
      GetReconciliationSummaryParams
    >({
      query: ({ orgId, accountId }) => ({
        url: `/organizations/${orgId}/accounts/${accountId}/transactions/status/summary`,
        method: 'GET',
      }),
      transformResponse: (response: ReconciliationSummaryResponse) =>
        response.data,
      providesTags: (_result, _error, { accountId }) => [
        { type: 'ReconciliationSummary', id: accountId },
      ],
    }),

    /**
     * Complete a reconciliation, marking all cleared transactions as reconciled.
     */
    completeReconciliation: builder.mutation<
      CompleteReconciliationResponse,
      CompleteReconciliationRequest
    >({
      query: ({ orgId, accountId, ...body }) => ({
        url: `/organizations/${orgId}/accounts/${accountId}/transactions/status/reconcile`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { accountId, transactionIds }) => [
        ...transactionIds.map((id) => ({
          type: 'TransactionStatus' as const,
          id,
        })),
        { type: 'TransactionStatus', id: `LIST-${accountId}` },
        { type: 'ReconciliationSummary', id: accountId },
      ],
    }),
  }),
})

// Export generated hooks
export const {
  useGetTransactionsWithStatusQuery,
  useChangeTransactionStatusMutation,
  useBulkChangeStatusMutation,
  useGetStatusHistoryQuery,
  useGetReconciliationSummaryQuery,
  useCompleteReconciliationMutation,
} = statusApi

// Export API for store configuration
export default statusApi
