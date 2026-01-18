import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchCategoryTree,
  deleteCategory,
  selectCategoryTree,
  selectCategoryLoading,
  selectCategoryError,
  type CategoryTreeNode,
  flattenCategoryTree,
} from '@/store/features/categorySlice'
import type { HierarchicalCategory } from '@/types'

/**
 * Props for the CategoryTree component.
 */
interface CategoryTreeProps {
  /** Organization ID */
  orgId: string
  /** Callback when a category is selected */
  onSelect?: (category: HierarchicalCategory) => void
  /** Callback when edit is clicked */
  onEdit?: (category: HierarchicalCategory) => void
  /** Callback when add child is clicked */
  onAddChild?: (parentCategory: HierarchicalCategory) => void
  /** Currently selected category ID */
  selectedId?: string | null
  /** Whether to show action buttons */
  showActions?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Props for a single tree node.
 */
interface CategoryNodeProps {
  node: CategoryTreeNode
  onSelect?: (category: HierarchicalCategory) => void
  onEdit?: (category: HierarchicalCategory) => void
  onDelete?: (category: HierarchicalCategory) => void
  onAddChild?: (category: HierarchicalCategory) => void
  selectedId?: string | null
  showActions: boolean
  isDeleting: boolean
}

/**
 * Single category node in the tree.
 */
function CategoryNode({
  node,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
  selectedId,
  showActions,
  isDeleting,
}: CategoryNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const isSelected = node.id === selectedId
  const hasChildren = node.hasChildren

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded((prev) => !prev)
  }, [])

  const handleSelect = useCallback(() => {
    onSelect?.(node)
  }, [node, onSelect])

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onEdit?.(node)
    },
    [node, onEdit]
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDelete?.(node)
    },
    [node, onDelete]
  )

  const handleAddChild = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onAddChild?.(node)
    },
    [node, onAddChild]
  )

  const indentWidth = node.depth * 24

  return (
    <div
      className={`
        group flex items-center gap-2 rounded px-2 py-1.5 text-sm
        ${onSelect ? 'cursor-pointer hover:bg-gray-50' : ''}
        ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}
      `}
      style={{ paddingLeft: `${indentWidth + 8}px` }}
      onClick={handleSelect}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleSelect()
              }
            }
          : undefined
      }
    >
      {/* Expand/collapse toggle */}
      {hasChildren ? (
        <button
          type="button"
          onClick={handleToggle}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-gray-200"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          aria-expanded={isExpanded}
        >
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      ) : (
        <span className="w-5" />
      )}

      {/* Category icon */}
      <svg
        className={`h-4 w-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
          clipRule="evenodd"
        />
      </svg>

      {/* Category name */}
      <span className="min-w-0 flex-1 truncate">{node.name}</span>

      {/* Actions */}
      {showActions && (
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onAddChild && (
            <button
              type="button"
              onClick={handleAddChild}
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              aria-label={`Add sub-category to ${node.name}`}
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={handleEdit}
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              aria-label={`Edit ${node.name}`}
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              aria-label={`Delete ${node.name}`}
            >
              {isDeleting ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
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
              ) : (
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
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Recursive tree rendering component.
 */
function TreeNodes({
  nodes,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
  selectedId,
  showActions,
  deletingId,
}: {
  nodes: CategoryTreeNode[]
  onSelect?: (category: HierarchicalCategory) => void
  onEdit?: (category: HierarchicalCategory) => void
  onDelete?: (category: HierarchicalCategory) => void
  onAddChild?: (category: HierarchicalCategory) => void
  selectedId?: string | null
  showActions: boolean
  deletingId: string | null
}) {
  return (
    <>
      {nodes.map((node) => (
        <CategoryNode
          key={node.id}
          node={node}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          selectedId={selectedId}
          showActions={showActions}
          isDeleting={deletingId === node.id}
        />
      ))}
    </>
  )
}

/**
 * Category tree visualization component.
 * Displays categories in a hierarchical tree structure with expand/collapse.
 *
 * @example
 * ```tsx
 * <CategoryTree
 *   orgId={currentOrgId}
 *   onSelect={(category) => setSelectedCategory(category)}
 *   onEdit={(category) => openEditDialog(category)}
 *   showActions
 * />
 * ```
 */
export function CategoryTree({
  orgId,
  onSelect,
  onEdit,
  onAddChild,
  selectedId,
  showActions = true,
  className = '',
}: CategoryTreeProps) {
  const dispatch = useAppDispatch()
  const categoryTree = useAppSelector(selectCategoryTree)
  const isLoading = useAppSelector(selectCategoryLoading)
  const error = useAppSelector(selectCategoryError)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  // TODO: Future enhancement - persist expanded state
  // const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Load category tree on mount
  useEffect(() => {
    if (orgId) {
      void dispatch(fetchCategoryTree({ orgId }))
    }
  }, [orgId, dispatch])

  // Handle delete
  const handleDelete = useCallback(
    (category: HierarchicalCategory) => {
      const hasChildren = category.children && category.children.length > 0
      const message = hasChildren
        ? `Are you sure you want to delete "${category.name}" and all its sub-categories?`
        : `Are you sure you want to delete "${category.name}"?`

      if (!window.confirm(message)) return

      setDeletingId(category.id)
      dispatch(deleteCategory({ orgId, categoryId: category.id }))
        .unwrap()
        .catch(() => {
          // Error handled by slice
        })
        .finally(() => {
          setDeletingId(null)
        })
    },
    [orgId, dispatch]
  )

  // Flatten tree for display
  const flattenedNodes = flattenCategoryTree(categoryTree)

  if (isLoading && categoryTree.length === 0) {
    return (
      <Card className={className}>
        <div className="flex justify-center py-8">
          <svg
            className="h-6 w-6 animate-spin text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
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
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <div className="p-4 text-center text-red-600">{error}</div>
      </Card>
    )
  }

  if (categoryTree.length === 0) {
    return (
      <Card className={className}>
        <div className="p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-gray-900">No categories yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first category to get started.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <div className="divide-y divide-gray-100">
        <TreeNodes
          nodes={flattenedNodes}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={handleDelete}
          onAddChild={onAddChild}
          selectedId={selectedId}
          showActions={showActions}
          deletingId={deletingId}
        />
      </div>
    </Card>
  )
}
