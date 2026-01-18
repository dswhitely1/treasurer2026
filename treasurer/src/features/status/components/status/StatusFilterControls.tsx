/**
 * StatusFilterControls Component
 *
 * Filter controls for showing/hiding transactions by status.
 * Supports individual status toggles and a reset option.
 */

import { useCallback } from 'react'
import type {
  StatusFilterControlsProps,
  TransactionStatus,
  StatusFilterState,
} from '../../types'
import { STATUS_DISPLAY_CONFIG } from '../../types'

/**
 * Individual filter checkbox for a status.
 */
interface StatusFilterCheckboxProps {
  status: TransactionStatus
  checked: boolean
  onChange: (checked: boolean) => void
  count?: number
  disabled?: boolean
}

function StatusFilterCheckbox({
  status,
  checked,
  onChange,
  count,
  disabled,
}: StatusFilterCheckboxProps) {
  const config = STATUS_DISPLAY_CONFIG[status]
  const inputId = `status-filter-${status.toLowerCase()}`

  return (
    <label
      htmlFor={inputId}
      className={`
        inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2
        transition-colors
        ${checked ? `${config.bgColor} ${config.borderColor}` : 'border-gray-200 bg-white hover:bg-gray-50'}
        ${disabled ? 'cursor-not-allowed opacity-50' : ''}
      `}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        aria-describedby={count !== undefined ? `${inputId}-count` : undefined}
      />
      <span className={`text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
      {count !== undefined && (
        <span
          id={`${inputId}-count`}
          className="ml-1 text-xs text-gray-500"
          aria-label={`${count} transactions`}
        >
          ({count})
        </span>
      )}
    </label>
  )
}

/**
 * StatusFilterControls provides UI for filtering transactions by status.
 *
 * Features:
 * - Toggle individual status filters
 * - Show transaction counts per status
 * - Reset to show all button
 * - Accessible with proper labels
 * - Responsive layout (horizontal on desktop, vertical on mobile)
 */
export function StatusFilterControls({
  filters,
  onFilterChange,
  counts,
  disabled = false,
  className = '',
}: StatusFilterControlsProps) {
  const handleToggle = useCallback(
    (status: TransactionStatus, checked: boolean) => {
      const key = status.toLowerCase() as keyof StatusFilterState
      onFilterChange({
        ...filters,
        [key]: checked,
      })
    },
    [filters, onFilterChange]
  )

  const handleShowAll = useCallback(() => {
    onFilterChange({
      uncleared: true,
      cleared: true,
      reconciled: true,
    })
  }, [onFilterChange])

  const allChecked = filters.uncleared && filters.cleared && filters.reconciled
  const someChecked = filters.uncleared || filters.cleared || filters.reconciled

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="group"
      aria-label="Filter transactions by status"
    >
      <span className="text-sm font-medium text-gray-700">Status:</span>

      <StatusFilterCheckbox
        status="UNCLEARED"
        checked={filters.uncleared}
        onChange={(checked) => handleToggle('UNCLEARED', checked)}
        count={counts?.UNCLEARED}
        disabled={disabled}
      />

      <StatusFilterCheckbox
        status="CLEARED"
        checked={filters.cleared}
        onChange={(checked) => handleToggle('CLEARED', checked)}
        count={counts?.CLEARED}
        disabled={disabled}
      />

      <StatusFilterCheckbox
        status="RECONCILED"
        checked={filters.reconciled}
        onChange={(checked) => handleToggle('RECONCILED', checked)}
        count={counts?.RECONCILED}
        disabled={disabled}
      />

      {!allChecked && (
        <button
          type="button"
          onClick={handleShowAll}
          disabled={disabled}
          className="
            ml-2 text-sm text-blue-600 hover:text-blue-500
            focus:outline-none focus:underline
            disabled:cursor-not-allowed disabled:opacity-50
          "
          aria-label="Show all transactions"
        >
          Show all
        </button>
      )}

      {!someChecked && (
        <span className="ml-2 text-sm text-amber-600" role="alert">
          No statuses selected
        </span>
      )}
    </div>
  )
}

export type { StatusFilterControlsProps }
