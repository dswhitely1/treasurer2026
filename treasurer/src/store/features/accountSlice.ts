import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import type { Account } from '@/types'
import { accountApi, type CreateAccountInput, type UpdateAccountInput } from '@/lib/api/accounts'
import { ApiError } from '@/lib/api'

interface AccountState {
  accounts: Account[]
  selectedAccount: Account | null
  isLoading: boolean
  error: string | null
}

const initialState: AccountState = {
  accounts: [],
  selectedAccount: null,
  isLoading: false,
  error: null,
}

/**
 * Fetch all accounts for the current organization.
 */
export const fetchAccounts = createAsyncThunk(
  'account/fetchAll',
  async (
    { orgId, includeInactive = false }: { orgId: string; includeInactive?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const response = await accountApi.list(orgId, includeInactive)
      return response.data.accounts
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to fetch accounts')
    }
  }
)

/**
 * Create a new account.
 */
export const createAccount = createAsyncThunk(
  'account/create',
  async (
    { orgId, data }: { orgId: string; data: CreateAccountInput },
    { rejectWithValue }
  ) => {
    try {
      const response = await accountApi.create(orgId, data)
      return response.data.account
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to create account')
    }
  }
)

/**
 * Update an existing account.
 */
export const updateAccount = createAsyncThunk(
  'account/update',
  async (
    { orgId, accountId, data }: { orgId: string; accountId: string; data: UpdateAccountInput },
    { rejectWithValue }
  ) => {
    try {
      const response = await accountApi.update(orgId, accountId, data)
      return response.data.account
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to update account')
    }
  }
)

/**
 * Delete an account.
 */
export const deleteAccount = createAsyncThunk(
  'account/delete',
  async (
    { orgId, accountId }: { orgId: string; accountId: string },
    { rejectWithValue }
  ) => {
    try {
      await accountApi.delete(orgId, accountId)
      return accountId
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to delete account')
    }
  }
)

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    selectAccount: (state, action: PayloadAction<Account | null>) => {
      state.selectedAccount = action.payload
    },
    clearAccounts: (state) => {
      state.accounts = []
      state.selectedAccount = null
      state.error = null
    },
    clearAccountError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch accounts
      .addCase(fetchAccounts.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.isLoading = false
        state.accounts = action.payload
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Create account
      .addCase(createAccount.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.isLoading = false
        state.accounts.push(action.payload)
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Update account
      .addCase(updateAccount.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateAccount.fulfilled, (state, action) => {
        state.isLoading = false
        const index = state.accounts.findIndex((a) => a.id === action.payload.id)
        if (index !== -1) {
          state.accounts[index] = action.payload
        }
        if (state.selectedAccount?.id === action.payload.id) {
          state.selectedAccount = action.payload
        }
      })
      .addCase(updateAccount.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Delete account
      .addCase(deleteAccount.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.isLoading = false
        state.accounts = state.accounts.filter((a) => a.id !== action.payload)
        if (state.selectedAccount?.id === action.payload) {
          state.selectedAccount = null
        }
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { selectAccount, clearAccounts, clearAccountError } = accountSlice.actions

// Selectors
export const selectAccounts = (state: RootState) => state.account.accounts
export const selectSelectedAccount = (state: RootState) => state.account.selectedAccount
export const selectAccountLoading = (state: RootState) => state.account.isLoading
export const selectAccountError = (state: RootState) => state.account.error
export const selectActiveAccounts = (state: RootState) =>
  state.account.accounts.filter((a) => a.isActive)
export const selectTotalBalance = (state: RootState) =>
  state.account.accounts
    .filter((a) => a.isActive)
    .reduce((sum, a) => sum + parseFloat(a.balance), 0)

export default accountSlice.reducer
