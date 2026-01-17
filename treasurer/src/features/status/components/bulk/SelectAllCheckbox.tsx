/**
 * SelectAllCheckbox Component
 *
 * Checkbox with indeterminate state for selecting all transactions.
 */

import { useRef, useEffect } from 'react'
import type { SelectAllCheckboxProps } from '../../types'

/**
 * SelectAllCheckbox provides a header checkbox for bulk selection.
 *
 * Features:
 * - Three states: none, some (indeterminate), all
 * - Click toggles between none and all
 * - Shows selected/total count
 * - Accessible with proper ARIA attributes
 * - Native indeterminate state support
 */
export function SelectAllCheckbox({
  selectionMode,
  onToggle,
  disabled = false,
  totalCount,
  selectedCount,
  className = '',
}: SelectAllCheckboxProps) {
  const checkboxRef = useRef<HTMLInputElement>(null)

  // Update indeterminate state via DOM API (not controllable via React)
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = selectionMode === 'some'
    }
  }, [selectionMode])

  const isChecked = selectionMode === 'all'

  const handleChange = () => {
    if (!disabled) {
      onToggle()
    }
  }

  const getLabel = (): string => {
    if (selectionMode === 'all' && totalCount !== undefined) {
      return `All ${totalCount} selected`
    }
    if (selectionMode === 'some' && selectedCount !== undefined) {
      return `${selectedCount} selected${totalCount !== undefined ? ` of ${totalCount}` : ''}`
    }
    return 'Select all'
  }

  const getAriaLabel = (): string => {
    if (selectionMode === 'all') {
      return 'Deselect all transactions'
    }
    if (selectionMode === 'some') {
      return 'Click to select all transactions'
    }
    return 'Select all transactions'
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        ref={checkboxRef}
        type="checkbox"
        id="select-all-transactions"
        checked={isChecked}
        onChange={handleChange}
        disabled={disabled}
        className="
          h-4 w-4 rounded border-gray-300 text-blue-600
          focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          disabled:cursor-not-allowed disabled:opacity-50
        "
        aria-label={getAriaLabel()}
      />
      <label
        htmlFor="select-all-transactions"
        className={`
          cursor-pointer text-sm font-medium
          ${disabled ? 'cursor-not-allowed text-gray-400' : 'text-gray-700'}
        `}
      >
        {getLabel()}
      </label>
    </div>
  )
}

export type { SelectAllCheckboxProps }
