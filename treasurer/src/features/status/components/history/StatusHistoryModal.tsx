/**
 * StatusHistoryModal Component
 *
 * Modal dialog displaying the status change history for a transaction.
 */

import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui'
import { useGetStatusHistoryQuery } from '../../api'
import type { StatusHistoryModalProps } from '../../types'
import { StatusHistoryTimeline } from './StatusHistoryTimeline'

/**
 * StatusHistoryModal shows the complete status history for a transaction.
 *
 * Features:
 * - Fetches history data on open
 * - Timeline display of status changes
 * - Focus trap for accessibility
 * - Keyboard navigation (Escape to close)
 * - Loading and error states
 * - Smooth animations
 */
export function StatusHistoryModal({
  isOpen,
  onClose,
  orgId,
  accountId,
  transactionId,
  transactionDescription,
}: StatusHistoryModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Fetch history when modal opens
  const {
    data: history,
    isLoading,
    error,
  } = useGetStatusHistoryQuery(
    { orgId, accountId, transactionId },
    {
      skip: !isOpen || !orgId || !accountId || !transactionId,
    }
  )

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => closeButtonRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      // Focus trap
      if (e.key === 'Tab') {
        const focusableElements = dialogRef.current?.querySelectorAll(
          'button, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements?.[0] as HTMLElement
        const lastElement = focusableElements?.[
          focusableElements.length - 1
        ] as HTMLElement

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    },
    [isOpen, onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Lock body scroll when open
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[80vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2
                  id="history-modal-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  Status History
                </h2>
                {transactionDescription && (
                  <p className="mt-1 text-sm text-gray-500 truncate max-w-[300px]">
                    {transactionDescription}
                  </p>
                )}
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="
                  rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                "
                aria-label="Close modal"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {error ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-red-600">
                    Failed to load status history
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Please try again later
                  </p>
                </div>
              ) : (
                <StatusHistoryTimeline
                  history={history ?? []}
                  isLoading={isLoading}
                />
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4">
              <Button variant="outline" onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export type { StatusHistoryModalProps }
