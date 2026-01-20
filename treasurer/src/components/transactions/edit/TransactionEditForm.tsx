import { useEffect, useCallback, useState } from 'react'
import { Button, Input, Label, CategoryPath } from '@/components/ui'
import { VendorSelector } from '@/components/vendors'
import {
  HierarchicalCategorySelector,
  type CategorySelection,
} from '@/components/categories'
import { useTransactionEditForm } from '@/hooks'
import { useAppSelector } from '@/store/hooks'
import { selectEditingTransaction } from '@/store/features/transactionSlice'
import type { TransactionType, Account, Vendor } from '@/types'
import { accountApi } from '@/lib/api/accounts'

/**
 * Props for TransactionEditForm component.
 */
interface TransactionEditFormProps {
  /** Organization ID */
  orgId: string
  /** Account ID */
  accountId: string
  /** Callback when form is closed */
  onClose: () => void
}

const transactionTypes: { value: TransactionType; label: string }[] = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
  { value: 'TRANSFER', label: 'Transfer' },
]

/**
 * Form component for editing transaction details.
 * Uses useTransactionEditForm hook for state management.
 *
 * Features:
 * - All transaction fields (description, amount, date, type, vendor, splits)
 * - Category splits with hierarchical selection
 * - Form validation with error display
 * - Keyboard shortcut (Cmd/Ctrl+S) to save
 * - Accessible form controls with proper labels
 *
 * @example
 * ```tsx
 * <TransactionEditForm
 *   orgId={orgId}
 *   accountId={accountId}
 *   onClose={handleClose}
 * />
 * ```
 */
export function TransactionEditForm({
  orgId,
  accountId,
  onClose,
}: TransactionEditFormProps) {
  const editingTransaction = useAppSelector(selectEditingTransaction)
  const [account, setAccount] = useState<Account | null>(null)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)

  const {
    formData,
    isDirty,
    validationErrors,
    isSaving,
    error,
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
    save,
    cancel,
  } = useTransactionEditForm({ orgId, accountId })

  // Fetch account details for transaction fee
  useEffect(() => {
    if (orgId && accountId) {
      accountApi
        .get(orgId, accountId)
        .then((response) => {
          setAccount(response.data.account)
        })
        .catch(() => {
          // Ignore account fetch errors
        })
    }
  }, [orgId, accountId])

  // Initialize vendor from transaction
  useEffect(() => {
    if (editingTransaction?.vendor) {
      setSelectedVendor(editingTransaction.vendor)
    }
  }, [editingTransaction])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (isValid && !isSaving) {
          void save()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [save, isValid, isSaving])

  // Handle vendor change
  const handleVendorChange = useCallback(
    (vendor: Vendor | null) => {
      setSelectedVendor(vendor)
      updateVendor(vendor)
    },
    [updateVendor]
  )

  // Handle form submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      void save()
    },
    [save]
  )

  // Handle cancel with unsaved changes warning
  const handleCancel = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      )
      if (!confirmed) return
    }
    cancel()
    onClose()
  }, [isDirty, cancel, onClose])

  if (!formData) {
    return null
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error display */}
      {error && (
        <div
          className="rounded-md bg-red-50 p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex">
            <svg
              className="h-5 w-5 flex-shrink-0 text-red-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Vendor selection */}
      <VendorSelector
        id="edit-vendor"
        orgId={orgId}
        value={selectedVendor?.id ?? formData.vendorId}
        onChange={handleVendorChange}
        label="Vendor / Payee"
        placeholder="Search or create vendor..."
        disabled={isSaving}
        allowCreate
      />

      {/* Description and Amount */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="edit-description">
            Description{' '}
            <span className="text-sm font-normal text-gray-500">
              (optional)
            </span>
          </Label>
          <Input
            id="edit-description"
            value={formData.description ?? ''}
            onChange={(e) => updateDescription(e.target.value)}
            placeholder="e.g., Spring Gala Tickets"
            disabled={isSaving}
            error={!!validationErrors.description}
            errorMessage={validationErrors.description}
            aria-describedby={
              validationErrors.description
                ? 'edit-description-error'
                : undefined
            }
          />
        </div>

        <div>
          <Label htmlFor="edit-amount" required>
            Amount
          </Label>
          <Input
            id="edit-amount"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.amount}
            onChange={(e) => updateAmount(e.target.value)}
            placeholder="0.00"
            required
            disabled={isSaving}
            error={!!validationErrors.amount}
            errorMessage={validationErrors.amount}
            aria-describedby={
              validationErrors.amount ? 'edit-amount-error' : undefined
            }
          />
        </div>
      </div>

      {/* Type and Date */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="edit-transactionType">Type</Label>
          <select
            id="edit-transactionType"
            value={formData.transactionType}
            onChange={(e) =>
              updateTransactionType(e.target.value as TransactionType)
            }
            disabled={isSaving}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50"
          >
            {transactionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="edit-date" required>
            Date
          </Label>
          <Input
            id="edit-date"
            type="date"
            value={formData.date}
            onChange={(e) => updateDate(e.target.value)}
            disabled={isSaving}
            required
            error={!!validationErrors.date}
            errorMessage={validationErrors.date}
          />
        </div>
      </div>

      {/* Transaction fee */}
      {account?.transactionFee && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="edit-applyFee"
            checked={formData.applyFee}
            onChange={(e) => updateApplyFee(e.target.checked)}
            disabled={isSaving}
            className="h-4 min-h-[44px] w-4 min-w-[44px] cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500 sm:h-4 sm:min-h-0 sm:w-4 sm:min-w-0"
          />
          <Label htmlFor="edit-applyFee" className="!mt-0 cursor-pointer">
            Apply transaction fee ($
            {parseFloat(account.transactionFee).toFixed(2)})
          </Label>
        </div>
      )}

      {/* Category Splits */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label required>Category Splits</Label>
          <span
            className={`text-sm ${
              Math.abs(remainingAmount) < 0.01
                ? 'text-green-600'
                : 'text-orange-600'
            }`}
            aria-live="polite"
          >
            {remainingAmount > 0
              ? `$${remainingAmount.toFixed(2)} remaining`
              : remainingAmount < 0
                ? `$${Math.abs(remainingAmount).toFixed(2)} over`
                : 'Balanced'}
          </span>
        </div>

        {validationErrors.splits && (
          <p
            className="mb-2 text-sm text-red-600"
            role="alert"
            aria-live="assertive"
          >
            {validationErrors.splits}
          </p>
        )}

        <div className="space-y-4">
          {formData.splits.map((split, index) => (
            <div
              key={split.id}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <div className="mb-3 flex items-start justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Split {index + 1}
                </span>
                {formData.splits.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSplit(index)}
                    disabled={isSaving}
                    className="min-h-[44px] text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Remove
                  </Button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {/* Category selector */}
                <div className="sm:col-span-2">
                  <HierarchicalCategorySelector
                    orgId={orgId}
                    value={split.categoryId}
                    onChange={(selection: CategorySelection | null) =>
                      updateSplitCategory(index, selection)
                    }
                    label="Category"
                    required
                    disabled={isSaving}
                    allowCreate
                    layout="horizontal"
                  />
                </div>

                {/* Amount */}
                <div>
                  <Label htmlFor={`edit-split-amount-${index}`} required>
                    Amount
                  </Label>
                  <Input
                    id={`edit-split-amount-${index}`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={split.amount}
                    onChange={(e) => updateSplitAmount(index, e.target.value)}
                    onDoubleClick={() => autoFillRemaining(index)}
                    disabled={isSaving}
                  />
                </div>
              </div>

              {/* Category path display */}
              {split.categoryPath && (
                <div className="mt-2">
                  <CategoryPath path={split.categoryPath} size="sm" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSplit}
            disabled={isSaving}
            className="min-h-[44px]"
          >
            <svg
              className="-ml-0.5 mr-1.5 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Split
          </Button>
          <p className="text-xs text-gray-500">
            Double-click amount to auto-fill remaining
          </p>
        </div>
      </div>

      {/* Memo field */}
      <div>
        <Label htmlFor="edit-memo">
          Memo / Notes{' '}
          <span className="text-sm font-normal text-gray-500">(optional)</span>
        </Label>
        <textarea
          id="edit-memo"
          value={formData.memo}
          onChange={(e) => updateMemo(e.target.value)}
          placeholder="Additional notes about this transaction..."
          disabled={isSaving}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50"
        />
      </div>

      {/* Form actions */}
      <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSaving}
          className="min-h-[44px]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSaving}
          disabled={!isValid}
          className="min-h-[44px]"
        >
          Save Changes
          <span className="ml-2 hidden text-xs opacity-75 sm:inline">
            ({navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+S)
          </span>
        </Button>
      </div>
    </form>
  )
}
