import { useState, useEffect, type FormEvent, useCallback } from 'react'
import { Button, Input, Label, CategoryPath } from '@/components/ui'
import { VendorSelector } from '@/components/vendors'
import {
  HierarchicalCategorySelector,
  type CategorySelection,
} from '@/components/categories'
import type { TransactionType, Account, Vendor } from '@/types'

/**
 * Split item with category selection.
 */
interface SplitItem {
  id: string
  amount: string
  categoryId: string | null
  categoryName: string
  categoryPath: string
}

/**
 * Props for the EnhancedTransactionForm component.
 */
interface EnhancedTransactionFormProps {
  /** Organization ID */
  orgId: string
  /** Account for the transaction */
  account: Account
  /** Whether the form is in a loading state */
  isLoading?: boolean
  /** Error message to display */
  error?: string | null
  /** Callback when form is submitted */
  onSubmit: (data: EnhancedTransactionData) => void
  /** Callback when cancel is clicked */
  onCancel?: () => void
  /** Transaction to edit (for edit mode) */
  editTransaction?: EnhancedTransactionData | null
}

/**
 * Transaction data with vendor and memo support.
 */
export interface EnhancedTransactionData {
  /** Transaction description (required) */
  description: string
  /** Transaction amount */
  amount: number
  /** Transaction type */
  transactionType: TransactionType
  /** Transaction date */
  date: string
  /** Whether to apply account transaction fee */
  applyFee: boolean
  /** Category splits */
  splits: {
    amount: number
    categoryName: string
    categoryId?: string
  }[]
  /** Vendor ID */
  vendorId: string | null
  /** Additional memo/notes */
  memo: string | null
}

const transactionTypes: { value: TransactionType; label: string }[] = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
  { value: 'TRANSFER', label: 'Transfer' },
]

let splitIdCounter = 0
const generateSplitId = () => `split-${++splitIdCounter}`

/**
 * Enhanced transaction form with vendor selection and hierarchical categories.
 * Replaces the original CreateTransactionForm with new features.
 *
 * Features:
 * - Vendor selection with autocomplete
 * - Hierarchical category selection (cascading dropdowns)
 * - Memo field for additional notes
 * - Category splits with amounts
 * - Transaction fee support
 *
 * @example
 * ```tsx
 * <EnhancedTransactionForm
 *   orgId={currentOrgId}
 *   account={currentAccount}
 *   onSubmit={(data) => createTransaction(data)}
 *   onCancel={() => closeForm()}
 *   isLoading={isSaving}
 *   error={saveError}
 * />
 * ```
 */
export function EnhancedTransactionForm({
  orgId,
  account,
  isLoading = false,
  error,
  onSubmit,
  onCancel,
  editTransaction,
}: EnhancedTransactionFormProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [transactionType, setTransactionType] =
    useState<TransactionType>('EXPENSE')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [applyFee, setApplyFee] = useState(false)
  const [splits, setSplits] = useState<SplitItem[]>([
    {
      id: generateSplitId(),
      amount: '',
      categoryId: null,
      categoryName: '',
      categoryPath: '',
    },
  ])
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [memo, setMemo] = useState('')

  const isEditMode = Boolean(editTransaction)

  // Initialize form with edit data
  useEffect(() => {
    if (editTransaction) {
      setDescription(editTransaction.description)
      setAmount(editTransaction.amount.toString())
      setTransactionType(editTransaction.transactionType)
      setDate(editTransaction.date.split('T')[0])
      setApplyFee(editTransaction.applyFee)
      setMemo(editTransaction.memo || '')

      // Initialize splits
      if (editTransaction.splits.length > 0) {
        setSplits(
          editTransaction.splits.map((s) => ({
            id: generateSplitId(),
            amount: s.amount.toString(),
            categoryId: s.categoryId || null,
            categoryName: s.categoryName,
            categoryPath: s.categoryName,
          }))
        )
      }
    }
  }, [editTransaction])

  // Calculate totals
  const totalSplitAmount = splits.reduce(
    (sum, split) => sum + (parseFloat(split.amount) || 0),
    0
  )
  const transactionAmount = parseFloat(amount) || 0
  const remainingAmount = transactionAmount - totalSplitAmount

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()

      const validSplits = splits.filter(
        (split) => split.categoryName.trim() && parseFloat(split.amount) > 0
      )

      if (validSplits.length === 0) {
        return
      }

      onSubmit({
        description,
        amount: transactionAmount,
        transactionType,
        date: date
          ? new Date(date + 'T12:00:00').toISOString()
          : new Date().toISOString(),
        applyFee,
        splits: validSplits.map((split) => ({
          amount: parseFloat(split.amount),
          categoryName: split.categoryName.trim(),
          categoryId: split.categoryId || undefined,
        })),
        vendorId: selectedVendor?.id ?? null,
        memo: memo.trim() || null,
      })
    },
    [
      description,
      transactionAmount,
      transactionType,
      date,
      applyFee,
      splits,
      selectedVendor,
      memo,
      onSubmit,
    ]
  )

  const handleVendorChange = useCallback((vendor: Vendor | null) => {
    setSelectedVendor(vendor)

    // If vendor has a default category, apply it to the first split
    if (vendor?.defaultCategory) {
      const cat = vendor.defaultCategory
      const path = cat.parent ? `${cat.parent.name} > ${cat.name}` : cat.name

      setSplits((prev) => {
        // Only update if there are splits and first split has no category
        if (prev.length > 0 && !prev[0]?.categoryId) {
          const newSplits = [...prev]
          const current = newSplits[0]
          if (current) {
            newSplits[0] = {
              ...current,
              categoryId: cat.id,
              categoryName: cat.name,
              categoryPath: path,
            }
          }
          return newSplits
        }
        return prev
      })
    }
  }, [])

  const handleCategoryChange = useCallback(
    (index: number, selection: CategorySelection | null) => {
      setSplits((prev) => {
        const newSplits = [...prev]
        const current = newSplits[index]
        if (current) {
          newSplits[index] = {
            ...current,
            categoryId: selection?.categoryId ?? null,
            categoryName: selection?.categoryName ?? '',
            categoryPath: selection?.path ?? '',
          }
        }
        return newSplits
      })
    },
    []
  )

  const updateSplitAmount = useCallback((index: number, value: string) => {
    setSplits((prev) => {
      const newSplits = [...prev]
      const current = newSplits[index]
      if (current) {
        newSplits[index] = { ...current, amount: value }
      }
      return newSplits
    })
  }, [])

  const addSplit = useCallback(() => {
    setSplits((prev) => [
      ...prev,
      {
        id: generateSplitId(),
        amount: '',
        categoryId: null,
        categoryName: '',
        categoryPath: '',
      },
    ])
  }, [])

  const removeSplit = useCallback((index: number) => {
    setSplits((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
    )
  }, [])

  const autoFillRemaining = useCallback(
    (index: number) => {
      if (remainingAmount > 0) {
        updateSplitAmount(index, remainingAmount.toFixed(2))
      }
    },
    [remainingAmount, updateSplitAmount]
  )

  const isValid =
    description.trim() &&
    transactionAmount > 0 &&
    Math.abs(remainingAmount) < 0.01 &&
    splits.every(
      (split) => split.categoryName.trim() && parseFloat(split.amount) > 0
    )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="rounded-md bg-red-50 p-4 text-sm text-red-600"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Vendor selection */}
      <VendorSelector
        orgId={orgId}
        value={selectedVendor?.id ?? null}
        onChange={handleVendorChange}
        label="Vendor / Payee"
        placeholder="Search or create vendor..."
        disabled={isLoading}
        allowCreate
      />

      {/* Description and Amount */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="description" required>
            Description
          </Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Spring Gala Tickets"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <Label htmlFor="amount" required>
            Amount
          </Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Type and Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="transactionType">Type</Label>
          <select
            id="transactionType"
            value={transactionType}
            onChange={(e) =>
              setTransactionType(e.target.value as TransactionType)
            }
            disabled={isLoading}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {transactionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Transaction fee */}
      {account.transactionFee && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="applyFee"
            checked={applyFee}
            onChange={(e) => setApplyFee(e.target.checked)}
            disabled={isLoading}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <Label htmlFor="applyFee" className="!mt-0">
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
          >
            {remainingAmount > 0
              ? `$${remainingAmount.toFixed(2)} remaining`
              : remainingAmount < 0
                ? `$${Math.abs(remainingAmount).toFixed(2)} over`
                : 'Balanced'}
          </span>
        </div>

        <div className="space-y-4">
          {splits.map((split, index) => (
            <div
              key={split.id}
              className="rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <div className="mb-3 flex items-start justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Split {index + 1}
                </span>
                {splits.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSplit(index)}
                    disabled={isLoading}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
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
                    onChange={(selection) =>
                      handleCategoryChange(index, selection)
                    }
                    label="Category"
                    required
                    disabled={isLoading}
                    allowCreate
                    layout="horizontal"
                  />
                </div>

                {/* Amount */}
                <div>
                  <Label htmlFor={`split-amount-${index}`} required>
                    Amount
                  </Label>
                  <Input
                    id={`split-amount-${index}`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={split.amount}
                    onChange={(e) => updateSplitAmount(index, e.target.value)}
                    onDoubleClick={() => autoFillRemaining(index)}
                    disabled={isLoading}
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
            disabled={isLoading}
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
        <Label htmlFor="memo">
          Memo / Notes{' '}
          <span className="text-sm font-normal text-gray-500">(optional)</span>
        </Label>
        <textarea
          id="memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="Additional notes about this transaction..."
          disabled={isLoading}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50"
        />
      </div>

      {/* Form actions */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isLoading} disabled={!isValid}>
          {isEditMode ? 'Save Changes' : 'Create Transaction'}
        </Button>
      </div>
    </form>
  )
}
