import { useCallback, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  selectConflictState,
  selectEditFormData,
  selectEditingTransaction,
  selectEditIsSaving,
  clearConflictState,
  updateEditFormData,
  forceSaveTransactionEdit,
} from '@/store/features/transactionSlice'
import { Button } from '@/components/ui'
import type { VersionedTransaction } from '@/types'

/**
 * Props for ConflictResolutionDialog component.
 */
interface ConflictResolutionDialogProps {
  /** Organization ID */
  orgId: string
  /** Account ID */
  accountId: string
}

/**
 * Format a transaction for display in comparison.
 */
function formatTransactionValue(
  field: keyof VersionedTransaction | 'amount' | 'date' | 'memo',
  value: unknown
): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'string') {
    // Format date strings
    if (field === 'date' && value.includes('T')) {
      return new Date(value).toLocaleDateString()
    }
    // Format amount as currency
    if (field === 'amount') {
      const num = parseFloat(value)
      if (!isNaN(num)) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(num)
      }
    }
    return value
  }
  if (Array.isArray(value)) {
    // Format splits
    return value
      .map((split: { amount: string; categoryName: string }) =>
        `${split.categoryName}: $${parseFloat(split.amount).toFixed(2)}`
      )
      .join(', ')
  }
  return String(value)
}

/**
 * Compare two values and determine if they are different.
 */
function valuesAreDifferent(a: unknown, b: unknown): boolean {
  if (a === b) return false
  if (a === null && b === null) return false
  if (a === undefined && b === undefined) return false

  // Handle arrays (like splits)
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return true
    return JSON.stringify(a) !== JSON.stringify(b)
  }

  return String(a) !== String(b)
}

/**
 * Dialog for resolving version conflicts when saving transactions.
 * Shows side-by-side comparison of your changes vs server version.
 *
 * Features:
 * - Side-by-side comparison of conflicting changes
 * - Highlights differences between versions
 * - Options to keep your changes, use server version, or cancel
 * - Accessible with role="alertdialog"
 *
 * @example
 * ```tsx
 * {hasConflict && (
 *   <ConflictResolutionDialog
 *     orgId={orgId}
 *     accountId={accountId}
 *   />
 * )}
 * ```
 */
export function ConflictResolutionDialog({
  orgId,
  accountId,
}: ConflictResolutionDialogProps) {
  const dispatch = useAppDispatch()

  const conflictState = useAppSelector(selectConflictState)
  const formData = useAppSelector(selectEditFormData)
  const editingTransaction = useAppSelector(selectEditingTransaction)
  const isSaving = useAppSelector(selectEditIsSaving)

  const { serverData, serverVersion, clientVersion } = conflictState

  // Fields to compare
  const comparisonFields = useMemo(() => {
    if (!serverData || !formData) return []

    type ComparisonField = {
      label: string
      field: string
      yourValue: string
      serverValue: string
      isDifferent: boolean
    }

    const fields: ComparisonField[] = [
      {
        label: 'Description',
        field: 'description',
        yourValue: formData.description,
        serverValue: serverData.description,
        isDifferent: valuesAreDifferent(formData.description, serverData.description),
      },
      {
        label: 'Amount',
        field: 'amount',
        yourValue: formatTransactionValue('amount', formData.amount),
        serverValue: formatTransactionValue('amount', serverData.amount),
        isDifferent: valuesAreDifferent(formData.amount, serverData.amount),
      },
      {
        label: 'Type',
        field: 'transactionType',
        yourValue: formData.transactionType,
        serverValue: serverData.transactionType,
        isDifferent: valuesAreDifferent(formData.transactionType, serverData.transactionType),
      },
      {
        label: 'Date',
        field: 'date',
        yourValue: formData.date,
        serverValue: formatTransactionValue('date', serverData.date),
        isDifferent: valuesAreDifferent(
          formData.date,
          serverData.date.split('T')[0]
        ),
      },
      {
        label: 'Memo',
        field: 'memo',
        yourValue: formData.memo || '-',
        serverValue: serverData.memo || '-',
        isDifferent: valuesAreDifferent(formData.memo, serverData.memo),
      },
      {
        label: 'Categories',
        field: 'splits',
        yourValue: formData.splits
          .map((s) => `${s.categoryName}: $${parseFloat(s.amount).toFixed(2)}`)
          .join(', ') || '-',
        serverValue: formatTransactionValue('splits', serverData.splits),
        isDifferent: valuesAreDifferent(
          JSON.stringify(formData.splits.map((s) => ({ amount: s.amount, categoryName: s.categoryName }))),
          JSON.stringify(serverData.splits)
        ),
      },
    ]

    return fields
  }, [serverData, formData])

  // Handle keeping your changes (force save)
  const handleKeepYourChanges = useCallback(() => {
    if (!formData || !editingTransaction) return

    void dispatch(
      forceSaveTransactionEdit({
        orgId,
        accountId,
        transactionId: editingTransaction.id,
        data: {
          description: formData.description,
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
  }, [dispatch, formData, editingTransaction, orgId, accountId])

  // Handle using server version
  const handleUseServerVersion = useCallback(() => {
    if (!serverData) return

    // Update form data with server values
    dispatch(
      updateEditFormData({
        description: serverData.description,
        amount: serverData.amount,
        transactionType: serverData.transactionType,
        date: serverData.date.split('T')[0],
        applyFee: serverData.feeAmount !== null && serverData.feeAmount !== '0',
        splits: serverData.splits.map((split, index) => ({
          id: `conflict-split-${index}`,
          amount: split.amount,
          categoryId: split.categoryId,
          categoryName: split.categoryName,
          categoryPath: split.categoryName,
        })),
        vendorId: serverData.vendorId ?? null,
        memo: serverData.memo ?? '',
      })
    )
    dispatch(clearConflictState())
  }, [dispatch, serverData])

  // Handle cancel
  const handleCancel = useCallback(() => {
    dispatch(clearConflictState())
  }, [dispatch])

  if (!conflictState.hasConflict || !serverData) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-60 bg-black bg-opacity-60"
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="conflict-dialog-title"
        aria-describedby="conflict-dialog-description"
        className="fixed inset-0 z-70 flex items-center justify-center p-4"
      >
        <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl">
          {/* Header */}
          <div className="border-b border-gray-200 bg-yellow-50 px-6 py-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-6 w-6 flex-shrink-0 text-yellow-600"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3
                  id="conflict-dialog-title"
                  className="text-lg font-semibold text-yellow-800"
                >
                  Conflict Detected
                </h3>
                <p
                  id="conflict-dialog-description"
                  className="mt-1 text-sm text-yellow-700"
                >
                  This transaction was modified by another user while you were
                  editing. Your version (v{clientVersion}) conflicts with the
                  server version (v{serverVersion}).
                </p>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="max-h-[50vh] overflow-y-auto px-6 py-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-2 text-left text-sm font-medium text-gray-500">
                    Field
                  </th>
                  <th className="pb-2 text-left text-sm font-medium text-blue-600">
                    Your Changes
                  </th>
                  <th className="pb-2 text-left text-sm font-medium text-green-600">
                    Server Version
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparisonFields.map((field) => (
                  <tr
                    key={field.field}
                    className={field.isDifferent ? 'bg-yellow-50' : ''}
                  >
                    <td className="py-3 pr-4 text-sm font-medium text-gray-900">
                      {field.label}
                      {field.isDifferent && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                          Changed
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-sm text-gray-700">
                      <span
                        className={
                          field.isDifferent ? 'font-medium text-blue-700' : ''
                        }
                      >
                        {field.yourValue}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-700">
                      <span
                        className={
                          field.isDifferent ? 'font-medium text-green-700' : ''
                        }
                      >
                        {field.serverValue}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleUseServerVersion}
              disabled={isSaving}
              className="min-h-[44px]"
            >
              Use Server Version
            </Button>
            <Button
              onClick={handleKeepYourChanges}
              isLoading={isSaving}
              className="min-h-[44px]"
            >
              Keep My Changes
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
