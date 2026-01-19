import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Label,
  Select,
  CategoryPath,
  type SelectOption,
} from '@/components/ui'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchParentCategories,
  fetchChildCategories,
  createCategory,
  selectParentCategories,
  selectCategoryTree,
  selectCategoryLoading,
} from '@/store/features/categorySlice'
import type { HierarchicalCategory } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Selected category value with optional parent reference.
 */
export interface CategorySelection {
  /** Selected category ID */
  categoryId: string
  /** Category name */
  categoryName: string
  /** Parent category ID (if applicable) */
  parentId?: string | null
  /** Parent category name (if applicable) */
  parentName?: string | null
  /** Full path display string */
  path: string
}

/**
 * Props for the HierarchicalCategorySelector component.
 */
interface HierarchicalCategorySelectorProps {
  /** Organization ID for category lookup */
  orgId: string
  /** Currently selected category ID */
  value?: string | null
  /** Callback when a category is selected */
  onChange: (selection: CategorySelection | null) => void
  /** Label for the field */
  label?: string
  /** Whether the field is required */
  required?: boolean
  /** Whether the field is disabled */
  disabled?: boolean
  /** Error state */
  error?: boolean
  /** Error message */
  errorMessage?: string
  /** Allow creating new categories inline */
  allowCreate?: boolean
  /** Custom class name */
  className?: string
  /** Show as two separate dropdowns or single cascading */
  layout?: 'horizontal' | 'vertical'
  /** Placeholder for parent dropdown */
  parentPlaceholder?: string
  /** Placeholder for child dropdown */
  childPlaceholder?: string
}

/**
 * Convert category to select option.
 */
function categoryToOption(
  category: HierarchicalCategory
): SelectOption<HierarchicalCategory> {
  return {
    id: category.id,
    label: category.name,
    data: category,
  }
}

/**
 * Hierarchical category selector with cascading dropdowns.
 * First select a parent category, then optionally select a child.
 *
 * Features:
 * - Two-step selection (parent -> child)
 * - Display breadcrumb path
 * - Create new categories inline
 * - Support flat categories (no parent)
 *
 * @example
 * ```tsx
 * <HierarchicalCategorySelector
 *   orgId={currentOrgId}
 *   value={selectedCategoryId}
 *   onChange={(selection) => setCategoryId(selection?.categoryId ?? null)}
 *   label="Category"
 *   required
 *   allowCreate
 * />
 * ```
 */
export function HierarchicalCategorySelector({
  orgId,
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  error = false,
  errorMessage,
  allowCreate = true,
  className = '',
  layout = 'horizontal',
  parentPlaceholder = 'Select category...',
  childPlaceholder = 'Select sub-category...',
}: HierarchicalCategorySelectorProps) {
  const dispatch = useAppDispatch()
  const parentCategories = useAppSelector(selectParentCategories)
  const categoryTree = useAppSelector(selectCategoryTree)
  const isLoading = useAppSelector(selectCategoryLoading)

  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [childCategories, setChildCategories] = useState<
    HierarchicalCategory[]
  >([])
  const [isCreatingParent, setIsCreatingParent] = useState(false)
  const [isCreatingChild, setIsCreatingChild] = useState(false)
  const [newParentName, setNewParentName] = useState('')
  const [newChildName, setNewChildName] = useState('')
  const [hasLoadedParents, setHasLoadedParents] = useState(false)
  const [loadedChildrenForParent, setLoadedChildrenForParent] = useState<
    string | null
  >(null)

  // Find the currently selected category based on value prop
  useEffect(() => {
    if (!value) {
      setSelectedParentId(null)
      setSelectedChildId(null)
      setLoadedChildrenForParent(null)
      return
    }

    // Check if value is in currently loaded children (most common case for child selection)
    const childMatch = childCategories.find((c) => c.id === value)
    if (childMatch && selectedParentId) {
      // Child from current parent is selected
      if (selectedChildId !== childMatch.id) {
        setSelectedChildId(childMatch.id)
      }
      return
    }

    // Look for the category in the tree
    let found = false
    for (const parent of categoryTree) {
      if (parent.id === value) {
        // Value is a parent category
        if (selectedParentId !== parent.id || selectedChildId !== null) {
          setSelectedParentId(parent.id)
          setSelectedChildId(null)
        }
        found = true
        break
      }

      if (parent.children) {
        for (const child of parent.children) {
          if (child.id === value) {
            // Value is a child category
            if (
              selectedParentId !== parent.id ||
              selectedChildId !== child.id
            ) {
              setSelectedParentId(parent.id)
              setSelectedChildId(child.id)
            }
            found = true
            break
          }
        }
        if (found) break
      }
    }

    // Also check parent categories list if not found in tree
    if (!found) {
      const parent = parentCategories.find((c) => c.id === value)
      if (parent && selectedParentId !== parent.id) {
        setSelectedParentId(parent.id)
        setSelectedChildId(null)
      }
    }
  }, [
    value,
    categoryTree,
    parentCategories,
    childCategories,
    selectedParentId,
    selectedChildId,
  ])

  // Load parent categories on mount
  useEffect(() => {
    if (orgId && !hasLoadedParents && parentCategories.length === 0) {
      setHasLoadedParents(true)
      void dispatch(fetchParentCategories({ orgId }))
    }
  }, [orgId, hasLoadedParents, parentCategories.length, dispatch])

  // Load child categories when parent changes
  useEffect(() => {
    if (selectedParentId && orgId) {
      // Only fetch if we haven't already loaded children for this parent
      if (loadedChildrenForParent === selectedParentId) {
        // Already loaded, just update from tree if available
        const parent = categoryTree.find((c) => c.id === selectedParentId)
        if (parent?.children) {
          setChildCategories(parent.children)
        }
        return
      }

      // Check if children are already in the tree
      const parent = categoryTree.find((c) => c.id === selectedParentId)
      if (parent?.children && parent.children.length > 0) {
        setChildCategories(parent.children)
        setLoadedChildrenForParent(selectedParentId)
      } else {
        // Fetch children from API
        setLoadedChildrenForParent(selectedParentId)
        dispatch(fetchChildCategories({ orgId, parentId: selectedParentId }))
          .unwrap()
          .then((result) => {
            setChildCategories(result.children)
          })
          .catch(() => {
            setChildCategories([])
          })
      }
    } else {
      setChildCategories([])
      setLoadedChildrenForParent(null)
    }
  }, [selectedParentId, orgId, categoryTree, dispatch, loadedChildrenForParent])

  // Build the selection object
  const buildSelection = useCallback(
    (
      parentId: string | null,
      childId: string | null
    ): CategorySelection | null => {
      if (!parentId) return null

      const parent = parentCategories.find((c) => c.id === parentId)
      if (!parent) return null

      if (childId) {
        const child = childCategories.find((c) => c.id === childId)
        if (child) {
          return {
            categoryId: child.id,
            categoryName: child.name,
            parentId: parent.id,
            parentName: parent.name,
            path: `${parent.name} > ${child.name}`,
          }
        }
      }

      return {
        categoryId: parent.id,
        categoryName: parent.name,
        parentId: null,
        parentName: null,
        path: parent.name,
      }
    },
    [parentCategories, childCategories]
  )

  // Handle parent selection
  const handleParentChange = useCallback(
    (option: SelectOption<HierarchicalCategory> | null) => {
      const newParentId = option?.id ?? null

      // Only update if parent actually changed
      if (newParentId === selectedParentId) {
        return // Same parent selected, do nothing
      }

      // Prevent clearing parent when child is selected
      if (!newParentId && selectedChildId) {
        return // Don't allow clearing parent when child exists
      }

      setSelectedParentId(newParentId)
      setSelectedChildId(null) // Clear child only when parent changes

      // Always emit parent selection, regardless of whether it has children
      // User can optionally drill down to select a child category
      if (newParentId) {
        onChange(buildSelection(newParentId, null))
      } else {
        onChange(null)
      }
    },
    [selectedParentId, selectedChildId, buildSelection, onChange]
  )

  // Handle child selection
  const handleChildChange = useCallback(
    (option: SelectOption<HierarchicalCategory> | null) => {
      const newChildId = option?.id ?? null
      setSelectedChildId(newChildId)
      onChange(buildSelection(selectedParentId, newChildId))
    },
    [selectedParentId, buildSelection, onChange]
  )

  // Handle create parent category
  const handleCreateParent = useCallback(() => {
    if (!orgId || !newParentName.trim() || isCreatingParent) return

    setIsCreatingParent(true)
    dispatch(createCategory({ orgId, data: { name: newParentName.trim() } }))
      .unwrap()
      .then((result) => {
        setSelectedParentId(result.id)
        setSelectedChildId(null)
        setNewParentName('')
        onChange({
          categoryId: result.id,
          categoryName: result.name,
          parentId: null,
          parentName: null,
          path: result.name,
        })

        // Refresh parent categories
        void dispatch(fetchParentCategories({ orgId }))
      })
      .catch((err: unknown) => {
        logger.apiError('Failed to create parent category', err, {
          orgId,
          categoryName: newParentName,
        })
      })
      .finally(() => {
        setIsCreatingParent(false)
      })
  }, [orgId, newParentName, isCreatingParent, dispatch, onChange])

  // Handle create child category
  const handleCreateChild = useCallback(() => {
    if (!orgId || !selectedParentId || !newChildName.trim() || isCreatingChild)
      return

    setIsCreatingChild(true)
    dispatch(
      createCategory({
        orgId,
        data: { name: newChildName.trim(), parentId: selectedParentId },
      })
    )
      .unwrap()
      .then((result) => {
        const parent = parentCategories.find((c) => c.id === selectedParentId)
        setSelectedChildId(result.id)
        setNewChildName('')
        onChange({
          categoryId: result.id,
          categoryName: result.name,
          parentId: selectedParentId,
          parentName: parent?.name ?? null,
          path: parent ? `${parent.name} > ${result.name}` : result.name,
        })

        // Reset loaded flag to allow refresh
        setLoadedChildrenForParent(null)
        // Refresh child categories
        void dispatch(
          fetchChildCategories({ orgId, parentId: selectedParentId })
        )
      })
      .catch((err: unknown) => {
        logger.apiError('Failed to create child category', err, {
          orgId,
          parentId: selectedParentId,
          categoryName: newChildName,
        })
      })
      .finally(() => {
        setIsCreatingChild(false)
      })
  }, [
    orgId,
    selectedParentId,
    newChildName,
    isCreatingChild,
    parentCategories,
    dispatch,
    onChange,
  ])

  // Convert to select options
  const parentOptions = useMemo(
    () => parentCategories.map(categoryToOption),
    [parentCategories]
  )

  const childOptions = useMemo(
    () => childCategories.map(categoryToOption),
    [childCategories]
  )

  // Get current selection display
  const currentSelection = useMemo(
    () => buildSelection(selectedParentId, selectedChildId),
    [selectedParentId, selectedChildId, buildSelection]
  )

  const layoutClasses =
    layout === 'horizontal' ? 'grid grid-cols-2 gap-3' : 'space-y-3'

  return (
    <div className={className}>
      {label && (
        <Label required={required} className="mb-2">
          {label}
        </Label>
      )}

      {/* Current selection display */}
      {currentSelection && (
        <div className="mb-2 flex items-center gap-2">
          <CategoryPath path={currentSelection.path} size="sm" />
          <button
            type="button"
            onClick={() => {
              setSelectedParentId(null)
              setSelectedChildId(null)
              onChange(null)
            }}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Clear selection"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}

      <div className={layoutClasses}>
        {/* Parent category dropdown */}
        <div>
          <Label className="mb-1 text-xs text-gray-500">Category</Label>
          <Select
            value={selectedParentId}
            onChange={handleParentChange}
            options={parentOptions}
            placeholder={parentPlaceholder}
            disabled={disabled}
            isLoading={isLoading}
            error={error && !selectedParentId}
            clearable={!selectedChildId}
          />
          {allowCreate && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="New category name"
                value={newParentName}
                onChange={(e) => setNewParentName(e.target.value)}
                disabled={disabled || isCreatingParent}
                className="block flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCreateParent}
                disabled={!newParentName.trim() || isCreatingParent}
                isLoading={isCreatingParent}
              >
                Add
              </Button>
            </div>
          )}
        </div>

        {/* Child category dropdown */}
        <div>
          <Label className="mb-1 text-xs text-gray-500">
            Sub-category (Optional)
          </Label>
          <Select
            value={selectedChildId}
            onChange={handleChildChange}
            options={childOptions}
            placeholder={
              selectedParentId
                ? childOptions.length > 0
                  ? childPlaceholder
                  : 'No sub-categories'
                : 'Select category first'
            }
            disabled={
              disabled || !selectedParentId || childOptions.length === 0
            }
            isLoading={isLoading && Boolean(selectedParentId)}
            error={error && Boolean(selectedParentId) && !selectedChildId}
            clearable
          />
          {allowCreate && selectedParentId && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="New sub-category name"
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                disabled={disabled || isCreatingChild}
                className="block flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCreateChild}
                disabled={!newChildName.trim() || isCreatingChild}
                isLoading={isCreatingChild}
              >
                Add
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && errorMessage && (
        <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  )
}
