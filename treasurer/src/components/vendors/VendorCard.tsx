import { useCallback } from 'react'
import { Card, Button, CategoryPath } from '@/components/ui'
import type { Vendor } from '@/types'

/**
 * Props for the VendorCard component.
 */
interface VendorCardProps {
  /** Vendor data to display */
  vendor: Vendor
  /** Callback when edit is clicked */
  onEdit?: (vendor: Vendor) => void
  /** Callback when delete is clicked */
  onDelete?: (vendor: Vendor) => void
  /** Callback when card is clicked */
  onClick?: (vendor: Vendor) => void
  /** Whether the card is selected */
  isSelected?: boolean
  /** Whether delete is in progress for this vendor */
  isDeleting?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Card component displaying vendor information in a list.
 * Shows vendor name, description, default category, and transaction count.
 *
 * @example
 * ```tsx
 * <VendorCard
 *   vendor={vendor}
 *   onEdit={(v) => openEditDialog(v)}
 *   onDelete={(v) => confirmDelete(v)}
 *   isSelected={selectedVendorId === vendor.id}
 * />
 * ```
 */
export function VendorCard({
  vendor,
  onEdit,
  onDelete,
  onClick,
  isSelected = false,
  isDeleting = false,
  className = '',
}: VendorCardProps) {
  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onEdit?.(vendor)
    },
    [vendor, onEdit]
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDelete?.(vendor)
    },
    [vendor, onDelete]
  )

  const handleClick = useCallback(() => {
    onClick?.(vendor)
  }, [vendor, onClick])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick?.(vendor)
      }
    },
    [vendor, onClick]
  )

  return (
    <Card
      className={`
        ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        ${className}
      `}
    >
      <div
        className="flex items-start justify-between p-4"
        onClick={onClick ? handleClick : undefined}
        onKeyDown={onClick ? handleKeyDown : undefined}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-pressed={onClick ? isSelected : undefined}
      >
        <div className="min-w-0 flex-1">
          {/* Vendor name */}
          <h3 className="text-base font-medium text-gray-900">{vendor.name}</h3>

          {/* Description */}
          {vendor.description && (
            <p className="mt-1 truncate text-sm text-gray-500">{vendor.description}</p>
          )}

          {/* Default category */}
          {vendor.defaultCategory && (
            <div className="mt-2">
              <span className="text-xs text-gray-400">Default category: </span>
              <CategoryPath
                path={
                  vendor.defaultCategory.parent
                    ? `${vendor.defaultCategory.parent.name} > ${vendor.defaultCategory.name}`
                    : vendor.defaultCategory.name
                }
                size="sm"
              />
            </div>
          )}

          {/* Transaction count */}
          {vendor.transactionCount !== undefined && (
            <p className="mt-2 text-xs text-gray-400">
              {vendor.transactionCount} transaction{vendor.transactionCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Actions */}
        {(onEdit || onDelete) && (
          <div className="ml-4 flex shrink-0 gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                aria-label={`Edit ${vendor.name}`}
              >
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                </svg>
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                isLoading={isDeleting}
                disabled={isDeleting}
                aria-label={`Delete ${vendor.name}`}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
