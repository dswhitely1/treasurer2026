import { useState, useEffect, type FormEvent, useCallback } from 'react'
import { Button, Input, Label } from '@/components/ui'
import type { TransactionType, TransactionCategory, Account } from '@/types'

interface SplitItem {
  id: string
  amount: string
  categoryName: string
}

interface CreateTransactionFormProps {
  account: Account
  categories: TransactionCategory[]
  isLoading?: boolean
  error?: string | null
  onSubmit: (data: CreateTransactionData) => void
  onCancel?: () => void
  onCategorySearch?: (search: string) => void
}

export interface CreateTransactionData {
  description: string
  amount: number
  transactionType: TransactionType
  date: string
  applyFee: boolean
  splits: { amount: number; categoryName: string }[]
}

const transactionTypes: { value: TransactionType; label: string }[] = [
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'INCOME', label: 'Income' },
  { value: 'TRANSFER', label: 'Transfer' },
]

let splitIdCounter = 0
const generateSplitId = () => `split-${++splitIdCounter}`

export function CreateTransactionForm({
  account,
  categories,
  isLoading,
  error,
  onSubmit,
  onCancel,
  onCategorySearch,
}: CreateTransactionFormProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [transactionType, setTransactionType] = useState<TransactionType>('EXPENSE')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [applyFee, setApplyFee] = useState(false)
  const [splits, setSplits] = useState<SplitItem[]>([
    { id: generateSplitId(), amount: '', categoryName: '' },
  ])
  const [activeSplitIndex, setActiveSplitIndex] = useState<number | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const totalSplitAmount = splits.reduce(
    (sum, split) => sum + (parseFloat(split.amount) || 0),
    0
  )
  const transactionAmount = parseFloat(amount) || 0
  const remainingAmount = transactionAmount - totalSplitAmount

  // Debounced category search
  useEffect(() => {
    if (activeSplitIndex !== null && showSuggestions) {
      const categoryName = splits[activeSplitIndex]?.categoryName ?? ''
      const timer = setTimeout(() => {
        onCategorySearch?.(categoryName)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [activeSplitIndex, splits, showSuggestions, onCategorySearch])

  const handleSubmit = (e: FormEvent) => {
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
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      applyFee,
      splits: validSplits.map((split) => ({
        amount: parseFloat(split.amount),
        categoryName: split.categoryName.trim(),
      })),
    })
  }

  const addSplit = () => {
    setSplits([...splits, { id: generateSplitId(), amount: '', categoryName: '' }])
  }

  const removeSplit = (index: number) => {
    if (splits.length > 1) {
      setSplits(splits.filter((_, i) => i !== index))
    }
  }

  const updateSplit = (index: number, field: 'amount' | 'categoryName', value: string) => {
    setSplits(prevSplits => {
      const newSplits = [...prevSplits]
      const currentSplit = newSplits[index]
      if (currentSplit) {
        newSplits[index] = { ...currentSplit, [field]: value }
      }
      return newSplits
    })
  }

  const selectCategory = useCallback((index: number, categoryName: string) => {
    updateSplit(index, 'categoryName', categoryName)
    setShowSuggestions(false)
    setActiveSplitIndex(null)
  }, [])

  const autoFillRemaining = (index: number) => {
    if (remainingAmount > 0) {
      updateSplit(index, 'amount', remainingAmount.toFixed(2))
    }
  }

  const isValid =
    description.trim() &&
    transactionAmount > 0 &&
    Math.abs(remainingAmount) < 0.01 &&
    splits.every((split) => split.categoryName.trim() && parseFloat(split.amount) > 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="description" required>
            Description
          </Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Grocery shopping"
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="transactionType">Type</Label>
          <select
            id="transactionType"
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value as TransactionType)}
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
            Apply transaction fee (${parseFloat(account.transactionFee).toFixed(2)})
          </Label>
        </div>
      )}

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

        <div className="space-y-2">
          {splits.map((split, index) => (
            <div key={split.id} className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Category name"
                  value={split.categoryName}
                  onChange={(e) => {
                    updateSplit(index, 'categoryName', e.target.value)
                    setActiveSplitIndex(index)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => {
                    setActiveSplitIndex(index)
                    setShowSuggestions(true)
                  }}
                  onBlur={() => {
                    // Delay to allow click on suggestion
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                  disabled={isLoading}
                />
                {showSuggestions &&
                  activeSplitIndex === index &&
                  categories.length > 0 && (
                    <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                          onMouseDown={() => selectCategory(index, category.name)}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Amount"
                  value={split.amount}
                  onChange={(e) => updateSplit(index, 'amount', e.target.value)}
                  onDoubleClick={() => autoFillRemaining(index)}
                  disabled={isLoading}
                />
              </div>
              {splits.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSplit(index)}
                  disabled={isLoading}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSplit}
          className="mt-2"
          disabled={isLoading}
        >
          Add Split
        </Button>
        <p className="mt-1 text-xs text-gray-500">
          Double-click amount field to auto-fill remaining balance
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isLoading} disabled={!isValid}>
          Create Transaction
        </Button>
      </div>
    </form>
  )
}
