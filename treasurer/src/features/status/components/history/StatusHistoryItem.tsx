/**
 * StatusHistoryItem Component
 *
 * Displays a single entry in the status change history timeline.
 */

import type { StatusHistoryItemProps } from '../../types'
import { TransactionStatusBadge } from '../status/TransactionStatusBadge'

/**
 * Format a date string to a readable format.
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

/**
 * Format a relative time (e.g., "2 hours ago").
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) {
    return 'just now'
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  } else {
    return formatDateTime(dateString)
  }
}

/**
 * StatusHistoryItem displays a single status change event.
 *
 * Features:
 * - Shows previous and new status badges
 * - Displays who made the change
 * - Shows when the change was made (relative and absolute)
 * - Optional notes display
 * - Timeline connector lines
 */
export function StatusHistoryItem({
  entry,
  isLast = false,
  className = '',
}: StatusHistoryItemProps) {
  const userName = entry.changedBy.name || entry.changedBy.email

  return (
    <div className={`relative flex gap-4 ${className}`}>
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        {/* Dot */}
        <div
          className={`
            z-10 flex h-3 w-3 items-center justify-center rounded-full
            ${
              entry.newStatus === 'RECONCILED'
                ? 'bg-green-500'
                : entry.newStatus === 'CLEARED'
                  ? 'bg-blue-500'
                  : 'bg-gray-400'
            }
          `}
          aria-hidden="true"
        />
        {/* Line */}
        {!isLast && (
          <div
            className="w-0.5 flex-1 bg-gray-200"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        {/* Status change */}
        <div className="flex flex-wrap items-center gap-2">
          {entry.previousStatus && (
            <>
              <TransactionStatusBadge
                status={entry.previousStatus}
                size="sm"
                showIcon={false}
              />
              <span className="text-gray-400" aria-hidden="true">
                &#8594;
              </span>
            </>
          )}
          <TransactionStatusBadge
            status={entry.newStatus}
            size="sm"
            showIcon
          />
          {!entry.previousStatus && (
            <span className="text-xs text-gray-500">(initial status)</span>
          )}
        </div>

        {/* Who and when */}
        <div className="mt-2 text-sm text-gray-600">
          <span className="font-medium">{userName}</span>
          <span className="mx-1">&#8226;</span>
          <time
            dateTime={entry.changedAt}
            title={formatDateTime(entry.changedAt)}
            className="text-gray-500"
          >
            {formatRelativeTime(entry.changedAt)}
          </time>
        </div>

        {/* Notes */}
        {entry.notes && (
          <div className="mt-2 rounded-md bg-gray-50 p-2 text-sm text-gray-600">
            <span className="font-medium">Note:</span> {entry.notes}
          </div>
        )}
      </div>
    </div>
  )
}

export type { StatusHistoryItemProps }
