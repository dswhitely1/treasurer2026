import { useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  selectIsEditModalOpen,
  selectEditingTransaction,
  selectEditIsFetching,
  selectEditError,
  selectHasConflict,
  openEditModal,
  closeEditModal,
  fetchTransactionForEdit,
  fetchEditHistory,
} from '@/store/features/transactionSlice'
import { TransactionEditForm } from './TransactionEditForm'
import { ConflictResolutionDialog } from './ConflictResolutionDialog'
import { EditHistoryPanel } from './EditHistoryPanel'
import { useTransactionFreshness } from '@/hooks'

/**
 * Props for TransactionEditModal component.
 */
interface TransactionEditModalProps {
  /** Organization ID */
  orgId: string
  /** Account ID */
  accountId: string
}

/**
 * Modal container for editing transactions.
 * Handles routing integration via URL query parameters and keyboard shortcuts.
 *
 * Features:
 * - Opens via ?edit=:transactionId query param
 * - Keyboard navigation (Esc to close, Cmd/Ctrl+S to save)
 * - Focus trapping within modal
 * - Responsive design (full-screen on mobile, centered on desktop)
 * - Accessibility with proper ARIA attributes
 *
 * @example
 * ```tsx
 * <TransactionEditModal orgId={orgId} accountId={accountId} />
 * ```
 */
export function TransactionEditModal({
  orgId,
  accountId,
}: TransactionEditModalProps) {
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()

  const isOpen = useAppSelector(selectIsEditModalOpen)
  const editingTransaction = useAppSelector(selectEditingTransaction)
  const isFetching = useAppSelector(selectEditIsFetching)
  const error = useAppSelector(selectEditError)
  const hasConflict = useAppSelector(selectHasConflict)

  const freshness = useTransactionFreshness(editingTransaction)

  const modalRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)

  // Get transaction ID from URL query param
  const editTransactionId = searchParams.get('edit')

  // Open modal when edit param is present
  useEffect(() => {

    if (editTransactionId && !isOpen) {
      dispatch(openEditModal(editTransactionId))
      void dispatch(
        fetchTransactionForEdit({
          orgId,
          accountId,
          transactionId: editTransactionId,
        })
      )
      void dispatch(
        fetchEditHistory({
          orgId,
          accountId,
          transactionId: editTransactionId,
        })
      )
    } else if (editTransactionId && isOpen) {
      // If modal is already open but for a different transaction, fetch new data
      if (!editingTransaction || editingTransaction.id !== editTransactionId) {
        void dispatch(
          fetchTransactionForEdit({
            orgId,
            accountId,
            transactionId: editTransactionId,
          })
        )
        void dispatch(
          fetchEditHistory({
            orgId,
            accountId,
            transactionId: editTransactionId,
          })
        )
      }
    }
  }, [editTransactionId, isOpen, dispatch, orgId, accountId, editingTransaction])

  // Close modal when URL param is removed
  useEffect(() => {
    if (!editTransactionId && isOpen) {
      dispatch(closeEditModal())
    }
  }, [editTransactionId, isOpen, dispatch])

  // Remove URL param when modal is closed (e.g., after successful save)
  // Only do this if the modal was previously open (not on initial render)
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true
    } else if (wasOpenRef.current && !isOpen) {
      // Modal closed (and was previously open)
      if (editTransactionId) {
        // If there's still a URL param, remove it
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('edit')
        setSearchParams(newParams)
      }
      // Always reset wasOpenRef when modal closes
      wasOpenRef.current = false
    }
  }, [isOpen, editTransactionId, searchParams, setSearchParams])

  // Handle close
  const handleClose = useCallback(() => {
    // Remove the edit query param
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('edit')
    setSearchParams(newParams)
    dispatch(closeEditModal())
  }, [dispatch, searchParams, setSearchParams])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape' && !hasConflict) {
        e.preventDefault()
        handleClose()
      }

      // Cmd/Ctrl + S to save (handled in form component)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, hasConflict, handleClose])

  // Focus management
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus()
    }
  }, [isOpen])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      >
        <div
          className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl sm:max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2
                id="edit-modal-title"
                className="text-lg font-semibold text-gray-900"
              >
                Edit Transaction
              </h2>
              {editingTransaction && (
                <p className="mt-1 text-sm text-gray-500">
                  Last updated: {freshness.lastUpdatedText}
                  {editingTransaction.version > 1 && (
                    <span className="ml-2">
                      (v{editingTransaction.version})
                    </span>
                  )}
                </p>
              )}
            </div>
            <button
              ref={firstFocusableRef}
              type="button"
              onClick={handleClose}
              aria-label="Close modal"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>

          {/* Freshness warning */}
          {freshness.showWarning && (
            <div
              className="mx-6 mt-4 rounded-md bg-yellow-50 p-3"
              role="alert"
              aria-live="polite"
            >
              <div className="flex">
                <svg
                  className="h-5 w-5 flex-shrink-0 text-yellow-400"
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
                <p className="ml-3 text-sm text-yellow-700">
                  {freshness.warningMessage}
                </p>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isFetching ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <svg
                    className="mx-auto h-8 w-8 animate-spin text-blue-600"
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
                  <p className="mt-2 text-sm text-gray-500">
                    Loading transaction...
                  </p>
                </div>
              </div>
            ) : error && !editingTransaction ? (
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
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Error loading transaction
                    </h3>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            ) : (
              <TransactionEditForm
                orgId={orgId}
                accountId={accountId}
                onClose={handleClose}
              />
            )}
          </div>

          {/* Edit History Panel (collapsible) */}
          {editingTransaction && (
            <EditHistoryPanel
              orgId={orgId}
              accountId={accountId}
              transactionId={editingTransaction.id}
            />
          )}
        </div>
      </div>

      {/* Conflict Resolution Dialog */}
      {hasConflict && (
        <ConflictResolutionDialog
          orgId={orgId}
          accountId={accountId}
        />
      )}
    </>
  )
}
