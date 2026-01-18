import { type ReactNode } from 'react'

/**
 * Item in the breadcrumb trail.
 */
export interface BreadcrumbItem {
  /** Unique identifier for the item */
  id: string
  /** Display label for the item */
  label: string
  /** Optional href for the item (makes it a link) */
  href?: string
  /** Optional click handler */
  onClick?: () => void
}

/**
 * Props for the Breadcrumb component.
 */
interface BreadcrumbProps {
  /** Array of breadcrumb items */
  items: BreadcrumbItem[]
  /** Separator between items (default: ">") */
  separator?: ReactNode
  /** Custom class name for the container */
  className?: string
  /** Maximum number of items to show (collapses middle items) */
  maxItems?: number
  /** Text for collapsed items */
  collapsedText?: string
  /** Whether to truncate long labels */
  truncate?: boolean
  /** Maximum label length before truncation */
  maxLabelLength?: number
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) return label
  return `${label.slice(0, maxLength - 3)}...`
}

/**
 * Accessible breadcrumb navigation component.
 * Supports collapsing, truncation, and custom separators.
 *
 * @example
 * ```tsx
 * <Breadcrumb
 *   items={[
 *     { id: '1', label: 'Home', href: '/' },
 *     { id: '2', label: 'Categories', onClick: () => navigate('/categories') },
 *     { id: '3', label: 'Current Category' },
 *   ]}
 *   separator=">"
 * />
 * ```
 */
export function Breadcrumb({
  items,
  separator = '>',
  className = '',
  maxItems,
  collapsedText = '...',
  truncate = false,
  maxLabelLength = 20,
  size = 'md',
}: BreadcrumbProps) {
  // Determine which items to display
  let displayItems = items
  let showCollapsed = false

  if (maxItems && items.length > maxItems) {
    // Show first item, collapsed indicator, and last (maxItems - 2) items
    const firstItem = items[0]
    const lastItems = items.slice(-(maxItems - 2))
    displayItems = [firstItem as BreadcrumbItem, ...lastItems]
    showCollapsed = true
  }

  const renderItem = (item: BreadcrumbItem, isLast: boolean, _index: number) => {
    const label = truncate && maxLabelLength ? truncateLabel(item.label, maxLabelLength) : item.label
    const isClickable = Boolean(item.href || item.onClick)

    const itemContent = (
      <span
        className={`
          ${isLast ? 'font-medium text-gray-900' : ''}
          ${!isLast && !isClickable ? 'text-gray-500' : ''}
          ${!isLast && isClickable ? 'text-gray-600 hover:text-gray-900 hover:underline' : ''}
        `}
        title={truncate && item.label.length > maxLabelLength ? item.label : undefined}
      >
        {label}
      </span>
    )

    if (item.href) {
      return (
        <a
          key={item.id}
          href={item.href}
          aria-current={isLast ? 'page' : undefined}
          className="outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {itemContent}
        </a>
      )
    }

    if (item.onClick) {
      return (
        <button
          key={item.id}
          type="button"
          onClick={item.onClick}
          aria-current={isLast ? 'page' : undefined}
          className="outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {itemContent}
        </button>
      )
    }

    return (
      <span key={item.id} aria-current={isLast ? 'page' : undefined}>
        {itemContent}
      </span>
    )
  }

  return (
    <nav aria-label="Breadcrumb" className={`${sizeStyles[size]} ${className}`}>
      <ol className="flex flex-wrap items-center gap-1">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1
          const isFirstAfterCollapse = showCollapsed && index === 1

          return (
            <li key={item.id} className="flex items-center gap-1">
              {/* Show collapsed indicator after first item */}
              {isFirstAfterCollapse && (
                <>
                  <span className="text-gray-400" aria-hidden="true">
                    {separator}
                  </span>
                  <span className="text-gray-400" aria-label={`${items.length - maxItems!} more items`}>
                    {collapsedText}
                  </span>
                </>
              )}

              {/* Show separator before item (except first) */}
              {index > 0 && (
                <span className="text-gray-400" aria-hidden="true">
                  {separator}
                </span>
              )}

              {renderItem(item, isLast, index)}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/**
 * Simple breadcrumb path display for categories.
 * Shows the full path without navigation capabilities.
 *
 * @example
 * ```tsx
 * <CategoryPath path="Fundraiser > Spring Gala > Ticket Sales" />
 * ```
 */
export function CategoryPath({
  path,
  className = '',
  size = 'md',
}: {
  path: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const parts = path.split(' > ')

  return (
    <span className={`inline-flex items-center gap-1 ${sizeStyles[size]} ${className}`}>
      {parts.map((part, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && (
            <svg
              className="h-3 w-3 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <span className={index === parts.length - 1 ? 'font-medium text-gray-900' : 'text-gray-500'}>
            {part}
          </span>
        </span>
      ))}
    </span>
  )
}
