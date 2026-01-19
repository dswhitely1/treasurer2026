import { api } from '../api'
import type {
  AccountTransaction,
  TransactionType,
  TransactionCategory,
  VersionedTransaction,
  EditHistoryEntry,
} from '@/types'

export interface TransactionSplitInput {
  amount: number
  categoryName: string
}

export interface CreateTransactionInput {
  description: string
  amount: number
  transactionType?: TransactionType
  date?: string
  applyFee?: boolean
  splits: TransactionSplitInput[]
  /** Vendor ID for payee/merchant tracking */
  vendorId?: string | null
  /** Additional notes/memo for the transaction */
  memo?: string | null
}

export interface UpdateTransactionInput {
  description?: string
  amount?: number
  transactionType?: TransactionType
  date?: string
  applyFee?: boolean
  splits?: TransactionSplitInput[]
  /** Vendor ID for payee/merchant tracking */
  vendorId?: string | null
  /** Additional notes/memo for the transaction */
  memo?: string | null
  /** Version for optimistic locking (required when updating) */
  version?: number
}

/**
 * Input for force-saving a transaction (overrides conflict).
 */
export interface ForceSaveTransactionInput extends UpdateTransactionInput {
  /** Force save even if version conflicts exist */
  force: true
}

export interface TransactionQueryParams {
  startDate?: string
  endDate?: string
  type?: TransactionType
  category?: string
  vendorId?: string
  limit?: number
  offset?: number
}

interface TransactionResponse {
  success: boolean
  data: { transaction: AccountTransaction }
  message?: string
}

interface TransactionsListResponse {
  success: boolean
  data: {
    transactions: AccountTransaction[]
    total: number
  }
}

interface CategoriesListResponse {
  success: boolean
  data: { categories: TransactionCategory[] }
}

interface MessageResponse {
  success: boolean
  message: string
}

interface VersionedTransactionResponse {
  success: boolean
  data: { transaction: VersionedTransaction }
  message?: string
}

interface EditHistoryResponse {
  success: boolean
  data: {
    history: EditHistoryEntry[]
    total: number
  }
}

export const transactionApi = {
  create: (orgId: string, accountId: string, data: CreateTransactionInput) =>
    api.post<TransactionResponse>(
      `/organizations/${orgId}/accounts/${accountId}/transactions`,
      data
    ),

  list: (orgId: string, accountId: string, params?: TransactionQueryParams) => {
    const queryParams: Record<string, string> = {}
    if (params) {
      if (params.startDate) queryParams.startDate = params.startDate
      if (params.endDate) queryParams.endDate = params.endDate
      if (params.type) queryParams.type = params.type
      if (params.category) queryParams.category = params.category
      if (params.vendorId) queryParams.vendorId = params.vendorId
      if (params.limit !== undefined) queryParams.limit = String(params.limit)
      if (params.offset !== undefined)
        queryParams.offset = String(params.offset)
    }
    return api.get<TransactionsListResponse>(
      `/organizations/${orgId}/accounts/${accountId}/transactions`,
      Object.keys(queryParams).length > 0 ? { params: queryParams } : undefined
    )
  },

  get: (orgId: string, accountId: string, transactionId: string) =>
    api.get<TransactionResponse>(
      `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`
    ),

  update: (
    orgId: string,
    accountId: string,
    transactionId: string,
    data: UpdateTransactionInput
  ) =>
    api.patch<TransactionResponse>(
      `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
      data
    ),

  delete: (orgId: string, accountId: string, transactionId: string) =>
    api.delete<MessageResponse>(
      `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`
    ),

  /**
   * Get a single transaction with version info for editing.
   *
   * NOTE: This uses the same endpoint as `get()`, but the type annotation (VersionedTransactionResponse)
   * documents that the response includes the version field needed for optimistic locking.
   * The backend GET endpoint always returns version info; this method name clarifies intent.
   */
  getForEdit: (orgId: string, accountId: string, transactionId: string) =>
    api.get<VersionedTransactionResponse>(
      `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`
    ),

  /**
   * Update transaction with optimistic locking.
   * Throws ApiError with status 409 if version mismatch (conflict data included in error.conflictData).
   */
  updateWithVersion: (
    orgId: string,
    accountId: string,
    transactionId: string,
    data: UpdateTransactionInput
  ) =>
    api.patch<VersionedTransactionResponse>(
      `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
      data
    ),

  /**
   * Force save transaction, overriding any version conflicts.
   */
  forceSave: (
    orgId: string,
    accountId: string,
    transactionId: string,
    data: ForceSaveTransactionInput
  ) =>
    api.patch<VersionedTransactionResponse>(
      `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
      data
    ),

  /**
   * Get edit history for a transaction.
   */
  getEditHistory: (
    orgId: string,
    accountId: string,
    transactionId: string,
    params?: { limit?: number; offset?: number }
  ) => {
    const queryParams: Record<string, string> = {}
    if (params?.limit !== undefined) queryParams.limit = String(params.limit)
    if (params?.offset !== undefined) queryParams.offset = String(params.offset)
    return api.get<EditHistoryResponse>(
      `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/history`,
      Object.keys(queryParams).length > 0 ? { params: queryParams } : undefined
    )
  },
}

export const categoryApi = {
  list: (orgId: string, search?: string, limit?: number) => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (limit !== undefined) params.limit = String(limit)
    return api.get<CategoriesListResponse>(
      `/organizations/${orgId}/categories`,
      Object.keys(params).length > 0 ? { params } : undefined
    )
  },
}
