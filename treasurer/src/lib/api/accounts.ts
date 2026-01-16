import { api } from '../api'
import type { Account, AccountType } from '@/types'

export interface CreateAccountInput {
  name: string
  description?: string
  institution?: string
  accountType?: AccountType
  balance?: number
  currency?: string
}

export interface UpdateAccountInput {
  name?: string
  description?: string
  institution?: string
  accountType?: AccountType
  balance?: number
  currency?: string
  isActive?: boolean
}

interface AccountResponse {
  success: boolean
  data: { account: Account }
  message?: string
}

interface AccountsListResponse {
  success: boolean
  data: { accounts: Account[] }
}

interface MessageResponse {
  success: boolean
  message: string
}

export const accountApi = {
  create: (orgId: string, data: CreateAccountInput) =>
    api.post<AccountResponse>(`/organizations/${orgId}/accounts`, data),

  list: (orgId: string, includeInactive = false) =>
    api.get<AccountsListResponse>(
      `/organizations/${orgId}/accounts`,
      includeInactive ? { params: { includeInactive: 'true' } } : undefined
    ),

  get: (orgId: string, accountId: string) =>
    api.get<AccountResponse>(`/organizations/${orgId}/accounts/${accountId}`),

  update: (orgId: string, accountId: string, data: UpdateAccountInput) =>
    api.patch<AccountResponse>(`/organizations/${orgId}/accounts/${accountId}`, data),

  delete: (orgId: string, accountId: string) =>
    api.delete<MessageResponse>(`/organizations/${orgId}/accounts/${accountId}`),
}
