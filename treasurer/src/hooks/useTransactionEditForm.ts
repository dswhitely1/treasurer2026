import { useCallback, useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  selectEditFormData,
  selectEditingTransaction,
  selectEditIsDirty,
  selectEditValidationErrors,
  selectEditIsSaving,
  selectEditError,
  selectHasConflict,
  selectConflictState,
  updateEditFormData,
  setEditValidationErrors,
  clearEditValidationErrors,
  saveTransactionEdit,
  forceSaveTransactionEdit,
  closeEditModal,
  clearConflictState,
} from '@/store/features/transactionSlice'
import type {
  TransactionEditFormData,
  TransactionEditValidationErrors,
  TransactionEditSplit,
  TransactionType,
} from '@/types'
import type { CategorySelection } from '@/components/categories'
import type { Vendor } from '@/types'

/**
 * Generate unique ID for new splits.
 */
let splitCounter = 0
const generateSplitId = () => `edit-split-${++splitCounter}`

/**
 * Props for useTransactionEditForm hook.
 */
interface UseTransactionEditFormProps {
  /** Organization ID */
  orgId: string
  /** Account ID */
  accountId: string
}

/**
 * Return type for useTransactionEditForm hook.
 */
interface UseTransactionEditFormReturn {
  /** Current form data */
  formData: TransactionEditFormData | null
  /** Whether form has unsaved changes */
  isDirty: boolean
  /** Validation errors */
  validationErrors: TransactionEditValidationErrors
  /** Whether save is in progress */
  isSaving: boolean
  /** Error message */
  error: string | null
  /** Whether there is a conflict */
  hasConflict: boolean
  /** Whether form is valid */
  isValid: boolean
  /** Remaining amount to allocate to splits */
  remainingAmount: number
  /** Update description field */
  updateDescription: (value: string) => void
  /** Update amount field */
  updateAmount: (value: string) => void
  /** Update transaction type field */
  updateTransactionType: (value: TransactionType) => void
  /** Update date field */
  updateDate: (value: string) => void
  /** Update apply fee field */
  updateApplyFee: (value: boolean) => void
  /** Update memo field */
  updateMemo: (value: string) => void
  /** Update vendor */
  updateVendor: (vendor: Vendor | null) => void
  /** Update a split's amount */
  updateSplitAmount: (index: number, value: string) => void
  /** Update a split's category */
  updateSplitCategory: (
    index: number,
    selection: CategorySelection | null
  ) => void
  /** Add a new split */
  addSplit: () => void
  /** Remove a split */
  removeSplit: (index: number) => void
  /** Auto-fill remaining amount into a split */
  autoFillRemaining: (index: number) => void
  /** Validate the form */
  validate: () => boolean
  /** Save the transaction */
  save: () => Promise<void>
  /** Force save (override conflict) */
  forceSave: () => Promise<void>
  /** Cancel editing */
  cancel: () => void
  /** Clear the conflict state */
  clearConflict: () => void
}

/**
 * Custom hook for managing transaction edit form state.
 * Handles form data updates, validation, and save operations.
 *
 * @example
 * ```tsx
 * const {
 *   formData,
 *   isDirty,
 *   validationErrors,
 *   updateDescription,
 *   save,
 *   cancel,
 * } = useTransactionEditForm({ orgId, accountId })
 * ```
 */
export function useTransactionEditForm({
  orgId,
  accountId,
}: UseTransactionEditFormProps): UseTransactionEditFormReturn {
  const dispatch = useAppDispatch()

  const formData = useAppSelector(selectEditFormData)
  const editingTransaction = useAppSelector(selectEditingTransaction)
  const isDirty = useAppSelector(selectEditIsDirty)
  const validationErrors = useAppSelector(selectEditValidationErrors)
  const isSaving = useAppSelector(selectEditIsSaving)
  const error = useAppSelector(selectEditError)
  const hasConflict = useAppSelector(selectHasConflict)
  const conflictState = useAppSelector(selectConflictState)

  // Calculate remaining amount
  const remainingAmount = useMemo(() => {
    if (!formData) return 0
    const totalAmount = parseFloat(formData.amount) || 0
    const splitTotal = formData.splits.reduce(
      (sum, split) => sum + (parseFloat(split.amount) || 0),
      0
    )
    return totalAmount - splitTotal
  }, [formData])

  // Check if form is valid
  const isValid = useMemo(() => {
    if (!formData) {
      return false
    }
    const amount = parseFloat(formData.amount)

    const validationChecks = {
      // Description field maps to backend 'memo' field (which is nullable), so validation is optional
      hasValidAmount: !isNaN(amount) && amount > 0,
      hasDate: !!formData.date,
      hasSplits: formData.splits.length > 0,
      splitsBalanced: Math.abs(remainingAmount) < 0.01,
      allSplitsValid: formData.splits.every(
        (split) => split.categoryName.trim() && parseFloat(split.amount) > 0
      ),
    }

    // Description is optional, so don't validate it
    if (!validationChecks.hasValidAmount) return false
    if (!validationChecks.hasDate) return false
    if (!validationChecks.hasSplits) return false
    if (!validationChecks.splitsBalanced) return false
    return validationChecks.allSplitsValid
  }, [formData, remainingAmount])

  // Update form field helpers
  const updateDescription = useCallback(
    (value: string) => {
      dispatch(updateEditFormData({ description: value }))
    },
    [dispatch]
  )

  const updateAmount = useCallback(
    (value: string) => {
      dispatch(updateEditFormData({ amount: value }))
    },
    [dispatch]
  )

  const updateTransactionType = useCallback(
    (value: TransactionType) => {
      dispatch(updateEditFormData({ transactionType: value }))
    },
    [dispatch]
  )

  const updateDate = useCallback(
    (value: string) => {
      dispatch(updateEditFormData({ date: value }))
    },
    [dispatch]
  )

  const updateApplyFee = useCallback(
    (value: boolean) => {
      dispatch(updateEditFormData({ applyFee: value }))
    },
    [dispatch]
  )

  const updateMemo = useCallback(
    (value: string) => {
      dispatch(updateEditFormData({ memo: value }))
    },
    [dispatch]
  )

  const updateVendor = useCallback(
    (vendor: Vendor | null) => {
      dispatch(updateEditFormData({ vendorId: vendor?.id ?? null }))
    },
    [dispatch]
  )

  const updateSplitAmount = useCallback(
    (index: number, value: string) => {
      if (!formData) return
      const newSplits = [...formData.splits]
      const currentSplit = newSplits[index]
      if (currentSplit) {
        newSplits[index] = { ...currentSplit, amount: value }
        dispatch(updateEditFormData({ splits: newSplits }))
      }
    },
    [dispatch, formData]
  )

  const updateSplitCategory = useCallback(
    (index: number, selection: CategorySelection | null) => {
      if (!formData) return
      const newSplits = [...formData.splits]
      const currentSplit = newSplits[index]
      if (currentSplit) {
        newSplits[index] = {
          ...currentSplit,
          categoryId: selection?.categoryId ?? null,
          categoryName: selection?.categoryName ?? '',
          categoryPath: selection?.path ?? '',
        }
        dispatch(updateEditFormData({ splits: newSplits }))
      }
    },
    [dispatch, formData]
  )

  const addSplit = useCallback(() => {
    if (!formData) return
    const newSplit: TransactionEditSplit = {
      id: generateSplitId(),
      amount: '',
      categoryId: null,
      categoryName: '',
      categoryPath: '',
    }
    dispatch(updateEditFormData({ splits: [...formData.splits, newSplit] }))
  }, [dispatch, formData])

  const removeSplit = useCallback(
    (index: number) => {
      if (!formData || formData.splits.length <= 1) return
      const newSplits = formData.splits.filter((_, i) => i !== index)
      dispatch(updateEditFormData({ splits: newSplits }))
    },
    [dispatch, formData]
  )

  const autoFillRemaining = useCallback(
    (index: number) => {
      if (remainingAmount > 0) {
        updateSplitAmount(index, remainingAmount.toFixed(2))
      }
    },
    [remainingAmount, updateSplitAmount]
  )

  // Validate form
  const validate = useCallback((): boolean => {
    if (!formData) return false

    const errors: TransactionEditValidationErrors = {}

    // Description is optional (memo is nullable in backend)
    // No validation needed for description

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      errors.amount = 'Amount must be greater than 0'
    }

    if (!formData.date) {
      errors.date = 'Date is required'
    }

    if (formData.splits.length === 0) {
      errors.splits = 'At least one category split is required'
    } else {
      const invalidSplits = formData.splits.some(
        (split) => !split.categoryName.trim() || parseFloat(split.amount) <= 0
      )
      if (invalidSplits) {
        errors.splits = 'All splits must have a category and amount'
      } else if (Math.abs(remainingAmount) >= 0.01) {
        errors.splits = 'Split amounts must equal the transaction amount'
      }
    }

    dispatch(setEditValidationErrors(errors))
    return Object.keys(errors).length === 0
  }, [dispatch, formData, remainingAmount])

  // Save transaction
  const save = useCallback(async (): Promise<void> => {
    if (!formData || !editingTransaction || !validate()) return

    await dispatch(
      saveTransactionEdit({
        orgId,
        accountId,
        transactionId: editingTransaction.id,
        data: {
          description: formData.description ?? undefined,
          amount: parseFloat(formData.amount),
          transactionType: formData.transactionType,
          date: formData.date
            ? new Date(formData.date + 'T12:00:00').toISOString()
            : new Date().toISOString(),
          applyFee: formData.applyFee,
          splits: formData.splits.map((split) => ({
            amount: parseFloat(split.amount),
            categoryName: split.categoryName,
          })),
          vendorId: formData.vendorId,
          memo: formData.memo || null,
          version: editingTransaction.version,
        },
      })
    )
  }, [dispatch, formData, editingTransaction, orgId, accountId, validate])

  // Force save (override conflict)
  const forceSave = useCallback(async (): Promise<void> => {
    if (!formData || !editingTransaction) return

    // Use server version from conflict state, or fallback to editing transaction version
    const versionToUse =
      conflictState.serverVersion ?? editingTransaction.version

    await dispatch(
      forceSaveTransactionEdit({
        orgId,
        accountId,
        transactionId: editingTransaction.id,
        data: {
          version: versionToUse,
          force: true,
          description: formData.description ?? undefined,
          amount: parseFloat(formData.amount),
          transactionType: formData.transactionType,
          date: formData.date
            ? new Date(formData.date + 'T12:00:00').toISOString()
            : new Date().toISOString(),
          applyFee: formData.applyFee,
          splits: formData.splits.map((split) => ({
            amount: parseFloat(split.amount),
            categoryName: split.categoryName,
          })),
          vendorId: formData.vendorId,
          memo: formData.memo || null,
        },
      })
    )
  }, [
    dispatch,
    formData,
    editingTransaction,
    orgId,
    accountId,
    conflictState.serverVersion,
  ])

  // Cancel editing
  const cancel = useCallback(() => {
    dispatch(closeEditModal())
  }, [dispatch])

  // Clear conflict state
  const clearConflict = useCallback(() => {
    dispatch(clearConflictState())
  }, [dispatch])

  // Clear validation errors when form data changes
  useEffect(() => {
    if (Object.keys(validationErrors).length > 0) {
      dispatch(clearEditValidationErrors())
    }
    // Only clear when formData changes, not validationErrors
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData])

  return {
    formData,
    isDirty,
    validationErrors,
    isSaving,
    error,
    hasConflict,
    isValid,
    remainingAmount,
    updateDescription,
    updateAmount,
    updateTransactionType,
    updateDate,
    updateApplyFee,
    updateMemo,
    updateVendor,
    updateSplitAmount,
    updateSplitCategory,
    addSplit,
    removeSplit,
    autoFillRemaining,
    validate,
    save,
    forceSave,
    cancel,
    clearConflict,
  }
}
