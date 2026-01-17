import { api } from '../api'
import type { AccountTransaction, TransactionType, TransactionCategory } from '@/types'

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
}

export interface UpdateTransactionInput {
  description?: string
  amount?: number
  transactionType?: TransactionType
  date?: string
  applyFee?: boolean
  splits?: TransactionSplitInput[]
}

export interface TransactionQueryParams {
  startDate?: string
  endDate?: string
  type?: TransactionType
  category?: string
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
      if (params.limit !== undefined) queryParams.limit = String(params.limit)
      if (params.offset !== undefined) queryParams.offset = String(params.offset)
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

  update: (orgId: string, accountId: string, transactionId: string, data: UpdateTransactionInput) =>
    api.patch<TransactionResponse>(
      `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
      data
    ),

  delete: (orgId: string, accountId: string, transactionId: string) =>
    api.delete<MessageResponse>(
      `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`
    ),
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
