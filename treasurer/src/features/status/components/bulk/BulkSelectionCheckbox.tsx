/**
 * BulkSelectionCheckbox Component
 *
 * Individual checkbox for selecting a transaction in bulk operations.
 */

import type { BulkSelectionCheckboxProps } from '../../types'

/**
 * BulkSelectionCheckbox provides a checkbox for individual transaction selection.
 *
 * Features:
 * - Controlled checked state
 * - Click handler with transaction ID
 * - Disabled state support
 * - Accessible with proper labels
 * - Focus ring styling
 */
export function BulkSelectionCheckbox({
  transactionId,
  isSelected,
  onToggle,
  disabled = false,
  className = '',
}: BulkSelectionCheckboxProps) {
  const handleChange = () => {
    if (!disabled) {
      onToggle(transactionId)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault()
      onToggle(transactionId)
    }
  }

  return (
    <div className={`flex items-center ${className}`}>
      <input
        type="checkbox"
        id={`select-${transactionId}`}
        checked={isSelected}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="
          h-4 w-4 rounded border-gray-300 text-blue-600
          focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          disabled:cursor-not-allowed disabled:opacity-50
        "
        aria-label={`Select transaction for bulk actions`}
      />
    </div>
  )
}

export type { BulkSelectionCheckboxProps }
