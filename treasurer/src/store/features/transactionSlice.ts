import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import type { AccountTransaction, TransactionCategory } from '@/types'
import {
  transactionApi,
  categoryApi,
  type CreateTransactionInput,
  type UpdateTransactionInput,
  type TransactionQueryParams,
} from '@/lib/api/transactions'
import { ApiError } from '@/lib/api'

interface TransactionState {
  transactions: AccountTransaction[]
  categories: TransactionCategory[]
  total: number
  selectedTransaction: AccountTransaction | null
  isLoading: boolean
  error: string | null
}

const initialState: TransactionState = {
  transactions: [],
  categories: [],
  total: 0,
  selectedTransaction: null,
  isLoading: false,
  error: null,
}

/**
 * Fetch transactions for an account.
 */
export const fetchTransactions = createAsyncThunk(
  'transaction/fetchAll',
  async (
    { orgId, accountId, params }: { orgId: string; accountId: string; params?: TransactionQueryParams },
    { rejectWithValue }
  ) => {
    try {
      const response = await transactionApi.list(orgId, accountId, params)
      return response.data
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to fetch transactions')
    }
  }
)

/**
 * Create a new transaction.
 */
export const createTransaction = createAsyncThunk(
  'transaction/create',
  async (
    { orgId, accountId, data }: { orgId: string; accountId: string; data: CreateTransactionInput },
    { rejectWithValue }
  ) => {
    try {
      const response = await transactionApi.create(orgId, accountId, data)
      return response.data.transaction
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to create transaction')
    }
  }
)

/**
 * Update an existing transaction.
 */
export const updateTransaction = createAsyncThunk(
  'transaction/update',
  async (
    {
      orgId,
      accountId,
      transactionId,
      data,
    }: { orgId: string; accountId: string; transactionId: string; data: UpdateTransactionInput },
    { rejectWithValue }
  ) => {
    try {
      const response = await transactionApi.update(orgId, accountId, transactionId, data)
      return response.data.transaction
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to update transaction')
    }
  }
)

/**
 * Delete a transaction.
 */
export const deleteTransaction = createAsyncThunk(
  'transaction/delete',
  async (
    { orgId, accountId, transactionId }: { orgId: string; accountId: string; transactionId: string },
    { rejectWithValue }
  ) => {
    try {
      await transactionApi.delete(orgId, accountId, transactionId)
      return transactionId
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to delete transaction')
    }
  }
)

/**
 * Fetch categories for autocomplete.
 */
export const fetchCategories = createAsyncThunk(
  'transaction/fetchCategories',
  async (
    { orgId, search, limit }: { orgId: string; search?: string; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await categoryApi.list(orgId, search, limit)
      return response.data.categories
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to fetch categories')
    }
  }
)

const transactionSlice = createSlice({
  name: 'transaction',
  initialState,
  reducers: {
    selectTransaction: (state, action: PayloadAction<AccountTransaction | null>) => {
      state.selectedTransaction = action.payload
    },
    clearTransactions: (state) => {
      state.transactions = []
      state.total = 0
      state.selectedTransaction = null
      state.error = null
    },
    clearTransactionError: (state) => {
      state.error = null
    },
    clearCategories: (state) => {
      state.categories = []
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch transactions
      .addCase(fetchTransactions.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.isLoading = false
        state.transactions = action.payload.transactions
        state.total = action.payload.total
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Create transaction
      .addCase(createTransaction.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.isLoading = false
        state.transactions.unshift(action.payload)
        state.total += 1
      })
      .addCase(createTransaction.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Update transaction
      .addCase(updateTransaction.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateTransaction.fulfilled, (state, action) => {
        state.isLoading = false
        const index = state.transactions.findIndex((t) => t.id === action.payload.id)
        if (index !== -1) {
          state.transactions[index] = action.payload
        }
        if (state.selectedTransaction?.id === action.payload.id) {
          state.selectedTransaction = action.payload
        }
      })
      .addCase(updateTransaction.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Delete transaction
      .addCase(deleteTransaction.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.isLoading = false
        state.transactions = state.transactions.filter((t) => t.id !== action.payload)
        state.total -= 1
        if (state.selectedTransaction?.id === action.payload) {
          state.selectedTransaction = null
        }
      })
      .addCase(deleteTransaction.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Fetch categories
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload
      })
  },
})

export const {
  selectTransaction,
  clearTransactions,
  clearTransactionError,
  clearCategories,
} = transactionSlice.actions

// Selectors
export const selectTransactions = (state: RootState) => state.transaction.transactions
export const selectTransactionTotal = (state: RootState) => state.transaction.total
export const selectSelectedTransaction = (state: RootState) => state.transaction.selectedTransaction
export const selectTransactionLoading = (state: RootState) => state.transaction.isLoading
export const selectTransactionError = (state: RootState) => state.transaction.error
export const selectCategories = (state: RootState) => state.transaction.categories

export default transactionSlice.reducer
