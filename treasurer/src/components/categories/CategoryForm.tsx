import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  type SelectOption,
} from '@/components/ui'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchParentCategories,
  selectParentCategories,
  selectCategoryLoading,
} from '@/store/features/categorySlice'
import type { HierarchicalCategory } from '@/types'

/**
 * Form data for creating/updating a category.
 */
export interface CategoryFormData {
  name: string
  parentId: string | null
}

/**
 * Props for the CategoryForm component.
 */
interface CategoryFormProps {
  /** Organization ID */
  orgId: string
  /** Category to edit (null for create mode) */
  category?: HierarchicalCategory | null
  /** Pre-selected parent category (for adding child) */
  defaultParentId?: string | null
  /** Whether the form is in a loading state */
  isLoading?: boolean
  /** Error message to display */
  error?: string | null
  /** Callback when form is submitted */
  onSubmit: (data: CategoryFormData) => void
  /** Callback when cancel is clicked */
  onCancel?: () => void
  /** Submit button text */
  submitText?: string
  /** Custom class name */
  className?: string
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
 * Form component for creating and editing categories.
 * Includes fields for name and optional parent category.
 *
 * @example
 * ```tsx
 * <CategoryForm
 *   orgId={currentOrgId}
 *   category={categoryToEdit}
 *   onSubmit={(data) => saveCategory(data)}
 *   onCancel={() => closeDialog()}
 *   isLoading={isSaving}
 *   error={saveError}
 * />
 * ```
 */
export function CategoryForm({
  orgId,
  category,
  defaultParentId,
  isLoading = false,
  error,
  onSubmit,
  onCancel,
  submitText,
  className = '',
}: CategoryFormProps) {
  const dispatch = useAppDispatch()
  const parentCategories = useAppSelector(selectParentCategories)
  const isCategoriesLoading = useAppSelector(selectCategoryLoading)

  const [name, setName] = useState('')
  const [parentId, setParentId] = useState<string | null>(null)
  const [hasLoadedParents, setHasLoadedParents] = useState(false)

  const isEditMode = Boolean(category)

  // Initialize form with category data
  useEffect(() => {
    if (category) {
      setName(category.name)
      setParentId(category.parentId)
    } else {
      setName('')
      setParentId(defaultParentId ?? null)
    }
  }, [category, defaultParentId])

  // Load parent categories once
  useEffect(() => {
    if (orgId && !hasLoadedParents && !isCategoriesLoading) {
      setHasLoadedParents(true)
      void dispatch(fetchParentCategories({ orgId }))
    }
  }, [orgId, hasLoadedParents, isCategoriesLoading, dispatch])

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()

      if (!name.trim()) return

      onSubmit({
        name: name.trim(),
        parentId,
      })
    },
    [name, parentId, onSubmit]
  )

  const handleParentChange = useCallback(
    (option: SelectOption<HierarchicalCategory> | null) => {
      setParentId(option?.id ?? null)
    },
    []
  )

  // Filter out the current category from parent options (can't be its own parent)
  const parentOptions = parentCategories
    .filter((c) => c.id !== category?.id)
    .map(categoryToOption)

  const isValid = name.trim().length > 0

  // Determine if parent selection should be disabled
  // (when editing a category that has children, changing parent could break hierarchy)
  const hasChildren = category?.children && category.children.length > 0

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {error && (
        <div
          className="rounded-md bg-red-50 p-4 text-sm text-red-600"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Category name */}
      <div>
        <Label htmlFor="category-name" required>
          Category Name
        </Label>
        <Input
          id="category-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Fundraising"
          required
          disabled={isLoading}
          autoFocus
        />
      </div>

      {/* Parent category selection */}
      <div>
        <Label htmlFor="category-parent">Parent Category (Optional)</Label>
        <p className="mb-2 text-xs text-gray-500">
          Leave empty to create a top-level category.
        </p>
        <Select
          id="category-parent"
          value={parentId}
          onChange={handleParentChange}
          options={parentOptions}
          placeholder="No parent (top-level)"
          disabled={isLoading || (isEditMode && hasChildren)}
          isLoading={isCategoriesLoading}
          clearable
        />
        {isEditMode && hasChildren && (
          <p className="mt-1 text-xs text-amber-600">
            Cannot change parent of a category that has sub-categories.
          </p>
        )}
      </div>

      {/* Selected parent info */}
      {parentId && (
        <div className="rounded-md bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            This category will be created as a sub-category of:
          </p>
          <p className="mt-1 font-medium text-gray-900">
            {parentCategories.find((c) => c.id === parentId)?.name}
          </p>
        </div>
      )}

      {/* Form actions */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={!isValid || isLoading}
        >
          {submitText ?? (isEditMode ? 'Save Changes' : 'Create Category')}
        </Button>
      </div>
    </form>
  )
}
