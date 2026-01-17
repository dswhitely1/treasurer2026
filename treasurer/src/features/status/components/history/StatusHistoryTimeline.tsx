/**
 * StatusHistoryTimeline Component
 *
 * Displays a timeline of status changes for a transaction.
 */

import type { StatusHistoryTimelineProps } from '../../types'
import { StatusHistoryItem } from './StatusHistoryItem'

/**
 * Loading skeleton for the timeline.
 */
function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex animate-pulse gap-4">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-gray-200" />
            {i < 3 && <div className="mt-1 h-12 w-0.5 bg-gray-200" />}
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-5 w-24 rounded bg-gray-200" />
            <div className="h-4 w-32 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Empty state when no history exists.
 */
function EmptyState() {
  return (
    <div className="py-8 text-center">
      <svg
        className="mx-auto h-12 w-12 text-gray-300"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M12 8V12L14.5 14.5M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="mt-3 text-sm text-gray-500">No status history yet</p>
      <p className="mt-1 text-xs text-gray-400">
        Status changes will appear here as they occur
      </p>
    </div>
  )
}

/**
 * StatusHistoryTimeline displays the complete history of status changes.
 *
 * Features:
 * - Chronological list of status changes
 * - Timeline visual with connecting lines
 * - Loading skeleton state
 * - Empty state when no history
 * - Accessible structure
 */
export function StatusHistoryTimeline({
  history,
  isLoading = false,
  className = '',
}: StatusHistoryTimelineProps) {
  if (isLoading) {
    return (
      <div className={className}>
        <TimelineSkeleton />
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <div className={className}>
        <EmptyState />
      </div>
    )
  }

  // Sort by date descending (most recent first)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  )

  return (
    <div className={className} role="list" aria-label="Status change history">
      {sortedHistory.map((entry, index) => (
        <div key={entry.id} role="listitem">
          <StatusHistoryItem
            entry={entry}
            isFirst={index === 0}
            isLast={index === sortedHistory.length - 1}
          />
        </div>
      ))}
    </div>
  )
}

export type { StatusHistoryTimelineProps }
