import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit'
import type { RootState } from '../index'
import type {
  AccountTransaction,
  TransactionCategory,
  VersionedTransaction,
  ConflictState,
  EditHistoryEntry,
  TransactionEditFormData,
  TransactionEditValidationErrors,
} from '@/types'
import {
  transactionApi,
  categoryApi,
  type CreateTransactionInput,
  type UpdateTransactionInput,
  type TransactionQueryParams,
} from '@/lib/api/transactions'
import { ApiError } from '@/lib/api'
import { logger } from '@/utils/logger'

/**
 * Edit state for the transaction being edited.
 */
interface EditState {
  /** Transaction currently being edited (null if modal closed) */
  editingTransaction: VersionedTransaction | null
  /** Current form data */
  editFormData: TransactionEditFormData | null
  /** Whether form has unsaved changes */
  isDirty: boolean
  /** Validation errors for the form */
  validationErrors: TransactionEditValidationErrors
  /** Whether the edit modal is open */
  isOpen: boolean
  /** Loading state for fetching transaction to edit */
  isFetching: boolean
  /** Loading state for saving */
  isSaving: boolean
  /** Error message from edit operations */
  error: string | null
}

/**
 * Redux state for transactions.
 */
interface TransactionState {
  transactions: AccountTransaction[]
  categories: TransactionCategory[]
  total: number
  selectedTransaction: AccountTransaction | null
  isLoading: boolean
  error: string | null
  /** Edit modal state */
  editState: EditState
  /** Conflict resolution state */
  conflictState: ConflictState
  /** Edit history for current transaction */
  editHistory: {
    entries: EditHistoryEntry[]
    total: number
    isLoading: boolean
    error: string | null
  }
}

const initialEditState: EditState = {
  editingTransaction: null,
  editFormData: null,
  isDirty: false,
  validationErrors: {},
  isOpen: false,
  isFetching: false,
  isSaving: false,
  error: null,
}

const initialConflictState: ConflictState = {
  hasConflict: false,
}

const initialState: TransactionState = {
  transactions: [],
  categories: [],
  total: 0,
  selectedTransaction: null,
  isLoading: false,
  error: null,
  editState: initialEditState,
  conflictState: initialConflictState,
  editHistory: {
    entries: [],
    total: 0,
    isLoading: false,
    error: null,
  },
}

/**
 * Fetch transactions for an account.
 */
export const fetchTransactions = createAsyncThunk(
  'transaction/fetchAll',
  async (
    {
      orgId,
      accountId,
      params,
    }: { orgId: string; accountId: string; params?: TransactionQueryParams },
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
    {
      orgId,
      accountId,
      data,
    }: { orgId: string; accountId: string; data: CreateTransactionInput },
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
    }: {
      orgId: string
      accountId: string
      transactionId: string
      data: UpdateTransactionInput
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await transactionApi.update(
        orgId,
        accountId,
        transactionId,
        data
      )
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
    {
      orgId,
      accountId,
      transactionId,
    }: { orgId: string; accountId: string; transactionId: string },
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
    {
      orgId,
      search,
      limit,
    }: { orgId: string; search?: string; limit?: number },
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

/**
 * Fetch a transaction for editing (includes version info).
 */
export const fetchTransactionForEdit = createAsyncThunk(
  'transaction/fetchForEdit',
  async (
    {
      orgId,
      accountId,
      transactionId,
    }: { orgId: string; accountId: string; transactionId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await transactionApi.getForEdit(
        orgId,
        accountId,
        transactionId
      )
      return response.data.transaction
    } catch (error) {
      logger.apiError('Failed to fetch transaction for edit', error, {
        orgId,
        accountId,
        transactionId,
      })
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to fetch transaction for editing')
    }
  }
)

/**
 * Result type for save operation.
 * Uses discriminated union to prevent invalid state combinations.
 */
type SaveEditResult =
  | {
      /** Save succeeded */
      success: true
      transaction: VersionedTransaction
    }
  | {
      /** Save failed due to version conflict */
      success: false
      conflict: true
      serverVersion: number
      serverData: VersionedTransaction
      clientVersion: number
    }

/**
 * Save transaction edit with optimistic locking.
 * Returns conflict state if version mismatch (409).
 */
export const saveTransactionEdit = createAsyncThunk<
  SaveEditResult,
  {
    orgId: string
    accountId: string
    transactionId: string
    data: UpdateTransactionInput
  },
  { rejectValue: string }
>(
  'transaction/saveEdit',
  async ({ orgId, accountId, transactionId, data }, { rejectWithValue }) => {
    try {
      const response = await transactionApi.updateWithVersion(
        orgId,
        accountId,
        transactionId,
        data
      )
      return {
        success: true,
        transaction: response.data.transaction,
      }
    } catch (error) {
      if (error instanceof ApiError) {
        // Handle 409 Conflict - conflict data is extracted by API client
        if (error.status === 409 && error.conflictData) {
          return {
            success: false,
            conflict: true,
            serverVersion: error.conflictData.serverVersion,
            serverData: error.conflictData.serverData as VersionedTransaction,
            clientVersion: error.conflictData.clientVersion,
          }
        }
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to save transaction')
    }
  }
)

/**
 * Force save transaction, overriding any version conflicts.
 */
export const forceSaveTransactionEdit = createAsyncThunk(
  'transaction/forceSaveEdit',
  async (
    {
      orgId,
      accountId,
      transactionId,
      data,
    }: {
      orgId: string
      accountId: string
      transactionId: string
      data: UpdateTransactionInput
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await transactionApi.forceSave(
        orgId,
        accountId,
        transactionId,
        {
          ...data,
          force: true,
        }
      )
      return response.data.transaction
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to force save transaction')
    }
  }
)

/**
 * Fetch edit history for a transaction.
 */
export const fetchEditHistory = createAsyncThunk(
  'transaction/fetchEditHistory',
  async (
    {
      orgId,
      accountId,
      transactionId,
      params,
    }: {
      orgId: string
      accountId: string
      transactionId: string
      params?: { limit?: number; offset?: number }
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await transactionApi.getEditHistory(
        orgId,
        accountId,
        transactionId,
        params
      )
      return response.data
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to fetch edit history')
    }
  }
)

const transactionSlice = createSlice({
  name: 'transaction',
  initialState,
  reducers: {
    selectTransaction: (
      state,
      action: PayloadAction<AccountTransaction | null>
    ) => {
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
    /**
     * Open the edit modal for a transaction.
     */
    openEditModal: (state, _action: PayloadAction<string>) => {
      state.editState.isOpen = true
      state.editState.error = null
      // The transaction will be fetched by fetchTransactionForEdit
      // Store the ID for reference
      state.editState.editingTransaction = null
      state.editState.editFormData = null
      state.editState.isDirty = false
      state.editState.validationErrors = {}
    },
    /**
     * Close the edit modal.
     */
    closeEditModal: (state) => {
      state.editState = initialEditState
      state.conflictState = initialConflictState
      state.editHistory = {
        entries: [],
        total: 0,
        isLoading: false,
        error: null,
      }
    },
    /**
     * Update the edit form data.
     */
    updateEditFormData: (
      state,
      action: PayloadAction<Partial<TransactionEditFormData>>
    ) => {
      if (state.editState.editFormData) {
        state.editState.editFormData = {
          ...state.editState.editFormData,
          ...action.payload,
        }
        state.editState.isDirty = true
      } else {
        console.warn(
          '[Redux] updateEditFormData called but editFormData is null'
        )
      }
    },
    /**
     * Set validation errors for the edit form.
     */
    setEditValidationErrors: (
      state,
      action: PayloadAction<TransactionEditValidationErrors>
    ) => {
      state.editState.validationErrors = action.payload
    },
    /**
     * Clear validation errors.
     */
    clearEditValidationErrors: (state) => {
      state.editState.validationErrors = {}
    },
    /**
     * Set conflict state (used when 409 is received).
     */
    setConflictState: (state, action: PayloadAction<ConflictState>) => {
      state.conflictState = action.payload
    },
    /**
     * Clear conflict state.
     */
    clearConflictState: (state) => {
      state.conflictState = initialConflictState
    },
    /**
     * Set the edit error message.
     */
    setEditError: (state, action: PayloadAction<string | null>) => {
      state.editState.error = action.payload
    },
    /**
     * Mark the form as clean (no unsaved changes).
     */
    markEditFormClean: (state) => {
      state.editState.isDirty = false
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
        const index = state.transactions.findIndex(
          (t) => t.id === action.payload.id
        )
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
        state.transactions = state.transactions.filter(
          (t) => t.id !== action.payload
        )
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
      // Fetch transaction for edit
      .addCase(fetchTransactionForEdit.pending, (state) => {
        state.editState.isFetching = true
        state.editState.error = null
      })
      .addCase(fetchTransactionForEdit.fulfilled, (state, action) => {
        state.editState.isFetching = false
        state.editState.editingTransaction = action.payload
        // Initialize form data from transaction
        const tx = action.payload

        const dateString = tx.date.split('T')[0] ?? tx.date
        state.editState.editFormData = {
          description: tx.description ?? tx.memo ?? '',
          amount: tx.amount,
          transactionType: tx.transactionType,
          date: dateString,
          applyFee: tx.feeAmount !== null && tx.feeAmount !== '0',
          splits: tx.splits.map((split, index) => ({
            id: `split-${index}`,
            amount: split.amount,
            categoryId: split.categoryId,
            categoryName: split.categoryName,
            categoryPath: split.categoryName,
          })),
          vendorId: tx.vendorId ?? null,
          memo: tx.memo ?? '',
        }

        state.editState.isDirty = false
      })
      .addCase(fetchTransactionForEdit.rejected, (state, action) => {
        logger.error('fetchTransactionForEdit rejected', {
          error: action.payload,
          meta: action.meta,
        })
        state.editState.isFetching = false
        state.editState.error = action.payload as string
      })
      // Save transaction edit
      .addCase(saveTransactionEdit.pending, (state) => {
        state.editState.isSaving = true
        state.editState.error = null
      })
      .addCase(saveTransactionEdit.fulfilled, (state, action) => {
        state.editState.isSaving = false

        // Use discriminated union to check result type
        if (!action.payload.success) {
          // Conflict response
          state.conflictState = {
            hasConflict: true,
            serverVersion: action.payload.serverVersion,
            serverData: action.payload.serverData,
            clientVersion: action.payload.clientVersion,
          }
        } else {
          // Success - update the transaction in the list
          const updated = action.payload.transaction
          const index = state.transactions.findIndex((t) => t.id === updated.id)
          if (index !== -1) {
            state.transactions[index] = updated
          }
          // Close modal on successful save
          state.editState.isOpen = false
          state.editState.editingTransaction = null
          state.editState.editFormData = null
          state.editState.isDirty = false
          state.editState.validationErrors = {}
          state.editState.isFetching = false
          state.editState.isSaving = false
          state.editState.error = null
          state.conflictState = initialConflictState
        }
      })
      .addCase(saveTransactionEdit.rejected, (state, action) => {
        state.editState.isSaving = false
        state.editState.error = action.payload as string
      })
      // Force save transaction edit
      .addCase(forceSaveTransactionEdit.pending, (state) => {
        state.editState.isSaving = true
        state.editState.error = null
      })
      .addCase(forceSaveTransactionEdit.fulfilled, (state, action) => {
        state.editState.isSaving = false
        // Update the transaction in the list
        const updated = action.payload
        const index = state.transactions.findIndex((t) => t.id === updated.id)
        if (index !== -1) {
          state.transactions[index] = updated
        }
        // Clear conflict state and close modal
        state.conflictState = initialConflictState
        state.editState = initialEditState
      })
      .addCase(forceSaveTransactionEdit.rejected, (state, action) => {
        state.editState.isSaving = false
        state.editState.error = action.payload as string
      })
      // Fetch edit history
      .addCase(fetchEditHistory.pending, (state) => {
        state.editHistory.isLoading = true
        state.editHistory.error = null
      })
      .addCase(fetchEditHistory.fulfilled, (state, action) => {
        state.editHistory.isLoading = false
        state.editHistory.entries = action.payload.history
        state.editHistory.total = action.payload.total
      })
      .addCase(fetchEditHistory.rejected, (state, action) => {
        state.editHistory.isLoading = false
        state.editHistory.error = action.payload as string
      })
  },
})

export const {
  selectTransaction,
  clearTransactions,
  clearTransactionError,
  clearCategories,
  openEditModal,
  closeEditModal,
  updateEditFormData,
  setEditValidationErrors,
  clearEditValidationErrors,
  setConflictState,
  clearConflictState,
  setEditError,
  markEditFormClean,
} = transactionSlice.actions

// Selectors
export const selectTransactions = (state: RootState) =>
  state.transaction.transactions
export const selectTransactionTotal = (state: RootState) =>
  state.transaction.total
export const selectSelectedTransaction = (state: RootState) =>
  state.transaction.selectedTransaction
export const selectTransactionLoading = (state: RootState) =>
  state.transaction.isLoading
export const selectTransactionError = (state: RootState) =>
  state.transaction.error
export const selectCategories = (state: RootState) =>
  state.transaction.categories

// Edit modal selectors
export const selectIsEditModalOpen = (state: RootState) =>
  state.transaction.editState.isOpen
export const selectEditingTransaction = (state: RootState) =>
  state.transaction.editState.editingTransaction
export const selectEditFormData = (state: RootState) =>
  state.transaction.editState.editFormData
export const selectEditIsDirty = (state: RootState) =>
  state.transaction.editState.isDirty
export const selectEditValidationErrors = (state: RootState) =>
  state.transaction.editState.validationErrors
export const selectEditIsFetching = (state: RootState) =>
  state.transaction.editState.isFetching
export const selectEditIsSaving = (state: RootState) =>
  state.transaction.editState.isSaving
export const selectEditError = (state: RootState) =>
  state.transaction.editState.error

// Conflict selectors
export const selectConflictState = (state: RootState) =>
  state.transaction.conflictState
export const selectHasConflict = (state: RootState) =>
  state.transaction.conflictState.hasConflict

// Edit history selectors
export const selectEditHistory = (state: RootState) =>
  state.transaction.editHistory.entries
export const selectEditHistoryTotal = (state: RootState) =>
  state.transaction.editHistory.total
export const selectEditHistoryLoading = (state: RootState) =>
  state.transaction.editHistory.isLoading
export const selectEditHistoryError = (state: RootState) =>
  state.transaction.editHistory.error

export default transactionSlice.reducer
