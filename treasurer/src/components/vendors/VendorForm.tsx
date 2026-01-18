import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Button, Input, Label, Select, type SelectOption } from '@/components/ui'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchParentCategories,
  fetchChildCategories,
  selectParentCategories,
  selectCategoryTree,
} from '@/store/features/categorySlice'
import type { Vendor, HierarchicalCategory } from '@/types'

/**
 * Form data for creating/updating a vendor.
 */
export interface VendorFormData {
  name: string
  description: string
  defaultCategoryId: string | null
}

/**
 * Props for the VendorForm component.
 */
interface VendorFormProps {
  /** Organization ID */
  orgId: string
  /** Vendor to edit (null for create mode) */
  vendor?: Vendor | null
  /** Whether the form is in a loading state */
  isLoading?: boolean
  /** Error message to display */
  error?: string | null
  /** Callback when form is submitted */
  onSubmit: (data: VendorFormData) => void
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
function categoryToOption(category: HierarchicalCategory): SelectOption<HierarchicalCategory> {
  return {
    id: category.id,
    label: category.name,
    data: category,
  }
}

/**
 * Form component for creating and editing vendors.
 * Includes fields for name, description, and default category.
 *
 * @example
 * ```tsx
 * <VendorForm
 *   orgId={currentOrgId}
 *   vendor={vendorToEdit}
 *   onSubmit={(data) => saveVendor(data)}
 *   onCancel={() => closeDialog()}
 *   isLoading={isSaving}
 *   error={saveError}
 * />
 * ```
 */
export function VendorForm({
  orgId,
  vendor,
  isLoading = false,
  error,
  onSubmit,
  onCancel,
  submitText,
  className = '',
}: VendorFormProps) {
  const dispatch = useAppDispatch()
  const parentCategories = useAppSelector(selectParentCategories)
  const categoryTree = useAppSelector(selectCategoryTree)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [childCategories, setChildCategories] = useState<HierarchicalCategory[]>([])

  const isEditMode = Boolean(vendor)

  // Initialize form with vendor data
  useEffect(() => {
    if (vendor) {
      setName(vendor.name)
      setDescription(vendor.description || '')

      // Set category selections
      if (vendor.defaultCategory) {
        if (vendor.defaultCategory.parentId) {
          setSelectedParentId(vendor.defaultCategory.parentId)
          setSelectedChildId(vendor.defaultCategory.id)
        } else {
          setSelectedParentId(vendor.defaultCategory.id)
          setSelectedChildId(null)
        }
      }
    } else {
      setName('')
      setDescription('')
      setSelectedParentId(null)
      setSelectedChildId(null)
    }
  }, [vendor])

  // Load parent categories
  useEffect(() => {
    if (orgId) {
      void dispatch(fetchParentCategories({ orgId }))
    }
  }, [orgId, dispatch])

  // Load child categories when parent is selected
  useEffect(() => {
    if (selectedParentId && orgId) {
      // Check if children are already in the tree
      const parent = categoryTree.find((c) => c.id === selectedParentId)
      if (parent?.children && parent.children.length > 0) {
        setChildCategories(parent.children)
      } else {
        // Fetch children from API
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
      setSelectedChildId(null)
    }
  }, [selectedParentId, orgId, categoryTree, dispatch])

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()

      if (!name.trim()) return

      onSubmit({
        name: name.trim(),
        description: description.trim() || '',
        defaultCategoryId: selectedChildId || selectedParentId,
      })
    },
    [name, description, selectedParentId, selectedChildId, onSubmit]
  )

  const handleParentChange = useCallback((option: SelectOption<HierarchicalCategory> | null) => {
    setSelectedParentId(option?.id ?? null)
    setSelectedChildId(null)
  }, [])

  const handleChildChange = useCallback((option: SelectOption<HierarchicalCategory> | null) => {
    setSelectedChildId(option?.id ?? null)
  }, [])

  const parentOptions = parentCategories.map(categoryToOption)
  const childOptions = childCategories.map(categoryToOption)

  const isValid = name.trim().length > 0

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600" role="alert">
          {error}
        </div>
      )}

      {/* Vendor name */}
      <div>
        <Label htmlFor="vendor-name" required>
          Vendor Name
        </Label>
        <Input
          id="vendor-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Acme Corp"
          required
          disabled={isLoading}
          autoFocus
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="vendor-description">Description</Label>
        <Input
          id="vendor-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          disabled={isLoading}
        />
      </div>

      {/* Default category selection */}
      <div className="space-y-3">
        <Label>Default Category (Optional)</Label>
        <p className="text-xs text-gray-500">
          When this vendor is selected, this category will be pre-selected in the transaction form.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Parent category */}
          <div>
            <Label htmlFor="vendor-parent-category" className="text-xs">
              Parent Category
            </Label>
            <Select
              id="vendor-parent-category"
              value={selectedParentId}
              onChange={handleParentChange}
              options={parentOptions}
              placeholder="Select parent..."
              disabled={isLoading}
              clearable
            />
          </div>

          {/* Child category */}
          <div>
            <Label htmlFor="vendor-child-category" className="text-xs">
              Sub-category
            </Label>
            <Select
              id="vendor-child-category"
              value={selectedChildId}
              onChange={handleChildChange}
              options={childOptions}
              placeholder={
                selectedParentId
                  ? childOptions.length > 0
                    ? 'Select sub-category...'
                    : 'No sub-categories'
                  : 'Select parent first'
              }
              disabled={isLoading || !selectedParentId || childOptions.length === 0}
              clearable
            />
          </div>
        </div>
      </div>

      {/* Form actions */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isLoading} disabled={!isValid || isLoading}>
          {submitText ?? (isEditMode ? 'Save Changes' : 'Create Vendor')}
        </Button>
      </div>
    </form>
  )
}
