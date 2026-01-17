/**
 * TransactionBulkActions Component
 *
 * Floating toolbar for bulk status changes on selected transactions.
 * Appears when transactions are selected, animates in/out with framer-motion.
 */

import { motion, AnimatePresence } from 'framer-motion'
import type { TransactionBulkActionsProps, TransactionStatus } from '../../types'
import { STATUS_DISPLAY_CONFIG } from '../../types'

/**
 * Action button for bulk status change.
 */
interface BulkActionButtonProps {
  status: TransactionStatus
  onClick: () => void
  disabled?: boolean
  isLoading?: boolean
}

function BulkActionButton({
  status,
  onClick,
  disabled,
  isLoading,
}: BulkActionButtonProps) {
  const config = STATUS_DISPLAY_CONFIG[status]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium
        transition-colors
        ${config.bgColor} ${config.color}
        hover:opacity-90
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
      `}
      aria-label={`Mark selected as ${config.label.toLowerCase()}`}
    >
      {config.label}
    </button>
  )
}

/**
 * TransactionBulkActions provides a floating toolbar for bulk operations.
 *
 * Features:
 * - Slides up from bottom when transactions are selected
 * - Shows selected count
 * - Bulk status change buttons
 * - Clear selection button
 * - Loading state during operations
 * - Accessible with keyboard navigation
 * - Fixed positioning at bottom of viewport
 */
export function TransactionBulkActions({
  selectedCount,
  onStatusChange,
  onClearSelection,
  isLoading = false,
  className = '',
}: TransactionBulkActionsProps) {
  const isVisible = selectedCount > 0

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
          className={`
            fixed bottom-4 left-1/2 z-50 -translate-x-1/2
            rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg
            ${className}
          `}
          role="toolbar"
          aria-label="Bulk transaction actions"
        >
          <div className="flex items-center gap-4">
            {/* Selected count */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {selectedCount} {selectedCount === 1 ? 'transaction' : 'transactions'} selected
              </span>
              <button
                type="button"
                onClick={onClearSelection}
                disabled={isLoading}
                className="
                  text-sm text-gray-500 hover:text-gray-700
                  focus:outline-none focus:underline
                  disabled:cursor-not-allowed disabled:opacity-50
                "
                aria-label="Clear selection"
              >
                Clear
              </button>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200" aria-hidden="true" />

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Mark as:</span>
              <BulkActionButton
                status="UNCLEARED"
                onClick={() => onStatusChange('UNCLEARED')}
                disabled={isLoading}
              />
              <BulkActionButton
                status="CLEARED"
                onClick={() => onStatusChange('CLEARED')}
                disabled={isLoading}
              />
            </div>

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin text-blue-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
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
                <span className="text-sm text-gray-500">Updating...</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export type { TransactionBulkActionsProps }
