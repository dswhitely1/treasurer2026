import { useState, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  selectEditHistory,
  selectEditHistoryLoading,
  selectEditHistoryError,
  fetchEditHistory,
} from '@/store/features/transactionSlice'
import { Button } from '@/components/ui'
import type { EditHistoryEntry, EditHistoryChange } from '@/types'

/**
 * Props for EditHistoryPanel component.
 */
interface EditHistoryPanelProps {
  /** Organization ID */
  orgId: string
  /** Account ID */
  accountId: string
  /** Transaction ID */
  transactionId: string
}

/**
 * Format a field name for display.
 */
function formatFieldName(field: string): string {
  const fieldNames: Record<string, string> = {
    description: 'Description',
    amount: 'Amount',
    transactionType: 'Type',
    date: 'Date',
    memo: 'Memo',
    vendorId: 'Vendor',
    splits: 'Categories',
    feeAmount: 'Fee',
    applyFee: 'Apply Fee',
  }
  return fieldNames[field] || field
}

/**
 * Format a change value for display.
 */
function formatChangeValue(field: string, value: string | null): string {
  if (value === null || value === '') return '(empty)'

  if (field === 'amount' || field === 'feeAmount') {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(num)
    }
  }

  if (field === 'date' && value.includes('T')) {
    return new Date(value).toLocaleDateString()
  }

  if (field === 'transactionType') {
    const types: Record<string, string> = {
      INCOME: 'Income',
      EXPENSE: 'Expense',
      TRANSFER: 'Transfer',
    }
    return types[value] || value
  }

  if (field === 'applyFee') {
    return value === 'true' ? 'Yes' : 'No'
  }

  return value
}

/**
 * Format relative time.
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 7) {
    return date.toLocaleDateString()
  }
  if (diffDays > 0) {
    return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`
  }
  if (diffHours > 0) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  }
  if (diffMinutes > 0) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`
  }
  return 'Just now'
}

/**
 * Single history entry component.
 */
function HistoryEntry({ entry }: { entry: EditHistoryEntry }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border-l-2 border-gray-200 pl-4">
      <div className="relative">
        {/* Timeline dot */}
        <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-gray-300" />

        {/* Header */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-900">
                {entry.userName}
              </span>
              <span className="ml-2 text-xs text-gray-500">
                v{entry.version}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {formatRelativeTime(entry.editedAt)}
              </span>
              <svg
                className={`h-4 w-4 text-gray-400 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {/* Summary */}
          <p className="mt-1 text-xs text-gray-600">
            Changed {entry.changes.length} field
            {entry.changes.length !== 1 ? 's' : ''}
          </p>
        </button>

        {/* Changes detail */}
        {isExpanded && entry.changes.length > 0 && (
          <div className="mt-3 space-y-2">
            {entry.changes.map((change, index) => (
              <ChangeItem key={index} change={change} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Single change item component.
 */
function ChangeItem({ change }: { change: EditHistoryChange }) {
  return (
    <div className="rounded bg-gray-50 p-2 text-xs">
      <span className="font-medium text-gray-700">
        {formatFieldName(change.field)}
      </span>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-red-600 line-through">
          {formatChangeValue(change.field, change.oldValue)}
        </span>
        <svg
          className="h-3 w-3 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-green-600">
          {formatChangeValue(change.field, change.newValue)}
        </span>
      </div>
    </div>
  )
}

/**
 * Collapsible panel showing the edit history of a transaction.
 * Displays a timeline of changes with user info and field-level diffs.
 *
 * Features:
 * - Collapsible panel to save space
 * - Timeline view of all edits
 * - Expandable entries to see field-level changes
 * - Relative timestamps
 * - Load more pagination
 *
 * @example
 * ```tsx
 * <EditHistoryPanel
 *   orgId={orgId}
 *   accountId={accountId}
 *   transactionId={transactionId}
 * />
 * ```
 */
export function EditHistoryPanel({
  orgId,
  accountId,
  transactionId,
}: EditHistoryPanelProps) {
  const dispatch = useAppDispatch()
  const [isOpen, setIsOpen] = useState(false)

  const history = useAppSelector(selectEditHistory)
  const isLoading = useAppSelector(selectEditHistoryLoading)
  const error = useAppSelector(selectEditHistoryError)

  // Load more history entries
  const handleLoadMore = useCallback(() => {
    void dispatch(
      fetchEditHistory({
        orgId,
        accountId,
        transactionId,
        params: { offset: history.length, limit: 10 },
      })
    )
  }, [dispatch, orgId, accountId, transactionId, history.length])

  // Toggle panel
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  // Don't render if no history
  if (history.length === 0 && !isLoading) {
    return null
  }

  return (
    <div className="border-t border-gray-200">
      {/* Toggle button */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between px-6 py-3 text-left hover:bg-gray-50"
        aria-expanded={isOpen}
        aria-controls="edit-history-content"
      >
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            Edit History
          </span>
          {history.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {history.length}
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Content */}
      {isOpen && (
        <div
          id="edit-history-content"
          className="max-h-60 overflow-y-auto border-t border-gray-100 px-6 py-4"
        >
          {isLoading && history.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <svg
                className="h-5 w-5 animate-spin text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="ml-2 text-sm text-gray-500">
                Loading history...
              </span>
            </div>
          ) : error ? (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {history.map((entry) => (
                  <HistoryEntry key={entry.id} entry={entry} />
                ))}
              </div>

              {/* Load more button */}
              {history.length >= 10 && (
                <div className="mt-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLoadMore}
                    isLoading={isLoading}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
