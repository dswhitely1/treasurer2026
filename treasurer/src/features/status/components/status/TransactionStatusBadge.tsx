/**
 * TransactionStatusBadge Component
 *
 * Displays a transaction's status as a colored badge with optional icon.
 * Uses class-variance-authority (CVA) for flexible styling variants.
 */

import { cva } from 'class-variance-authority'
import type { TransactionStatusBadgeProps, TransactionStatus } from '../../types'
import { STATUS_DISPLAY_CONFIG } from '../../types'

/**
 * CVA variants for the status badge.
 */
const badgeVariants = cva(
  'inline-flex items-center font-medium rounded-full transition-colors',
  {
    variants: {
      status: {
        UNCLEARED: 'bg-gray-100 text-gray-700 border-gray-300',
        CLEARED: 'bg-blue-100 text-blue-700 border-blue-300',
        RECONCILED: 'bg-green-100 text-green-700 border-green-300',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs gap-1',
        md: 'px-2.5 py-1 text-sm gap-1.5',
        lg: 'px-3 py-1.5 text-base gap-2',
      },
      interactive: {
        true: 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1',
        false: '',
      },
    },
    compoundVariants: [
      {
        status: 'UNCLEARED',
        interactive: true,
        className: 'focus:ring-gray-400',
      },
      {
        status: 'CLEARED',
        interactive: true,
        className: 'focus:ring-blue-400',
      },
      {
        status: 'RECONCILED',
        interactive: true,
        className: 'focus:ring-green-400',
      },
    ],
    defaultVariants: {
      status: 'UNCLEARED',
      size: 'md',
      interactive: false,
    },
  }
)

/**
 * Icon components for each status.
 */
function CircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 8L6.5 11.5L13 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckDoubleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M1 8L4 11L9 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 8L9 11L15 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Get the appropriate icon component for a status.
 */
function getStatusIcon(status: TransactionStatus, className: string) {
  const config = STATUS_DISPLAY_CONFIG[status]
  switch (config.icon) {
    case 'circle':
      return <CircleIcon className={className} />
    case 'check':
      return <CheckIcon className={className} />
    case 'check-double':
      return <CheckDoubleIcon className={className} />
    default:
      return null
  }
}

/**
 * Get icon size class based on badge size.
 */
function getIconSize(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm':
      return 'h-3 w-3'
    case 'md':
      return 'h-4 w-4'
    case 'lg':
      return 'h-5 w-5'
    default:
      return 'h-4 w-4'
  }
}

/**
 * TransactionStatusBadge displays a transaction's reconciliation status.
 *
 * Features:
 * - Three status variants: Uncleared, Cleared, Reconciled
 * - Three size options: sm, md, lg
 * - Optional status icon
 * - Interactive mode with hover/focus states
 * - Accessible with proper ARIA attributes
 */
export function TransactionStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  interactive = false,
  onClick,
  className = '',
}: TransactionStatusBadgeProps) {
  const config = STATUS_DISPLAY_CONFIG[status]
  const iconSize = getIconSize(size)

  const Component = interactive ? 'button' : 'span'

  const handleClick = () => {
    if (interactive && onClick) {
      onClick()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (interactive && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <Component
      className={badgeVariants({ status, size, interactive, className })}
      onClick={handleClick}
      onKeyDown={interactive ? handleKeyDown : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Change status from ${config.label}` : undefined}
    >
      {showIcon && getStatusIcon(status, iconSize)}
      <span>{config.label}</span>
    </Component>
  )
}

export type { TransactionStatusBadgeProps }
