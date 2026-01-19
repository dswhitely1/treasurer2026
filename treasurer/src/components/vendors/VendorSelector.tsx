import { useCallback, useEffect, useMemo, useState } from 'react'
import { Combobox, type ComboboxOption, Label } from '@/components/ui'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  searchVendors,
  fetchVendors,
  createVendor,
  selectAutocompleteResults,
  selectVendorSearching,
  selectAllVendors,
  clearAutocomplete,
  setAutocompleteResults,
} from '@/store/features/vendorSlice'
import { useDebounce } from '@/hooks'
import type { Vendor } from '@/types'
import { logger } from '@/utils/logger'

/**
 * Props for the VendorSelector component.
 */
interface VendorSelectorProps {
  /** Organization ID for vendor lookup */
  orgId: string
  /** Currently selected vendor ID */
  value?: string | null
  /** Callback when a vendor is selected */
  onChange: (vendor: Vendor | null) => void
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
  /** Placeholder text */
  placeholder?: string
  /** Allow creating new vendors inline */
  allowCreate?: boolean
  /** Custom class name */
  className?: string
  /** ID for the input element */
  id?: string
}

/**
 * Convert vendor to combobox option.
 */
function vendorToOption(vendor: Vendor): ComboboxOption<Vendor> {
  return {
    id: vendor.id,
    label: vendor.name,
    data: vendor,
  }
}

/**
 * Vendor selection component with autocomplete functionality.
 * Supports searching existing vendors and creating new ones inline.
 *
 * Features:
 * - Debounced search with caching
 * - Show recent/popular vendors on focus
 * - Create new vendor inline
 * - Keyboard navigation
 * - Accessible (ARIA labels)
 *
 * @example
 * ```tsx
 * <VendorSelector
 *   orgId={currentOrgId}
 *   value={selectedVendorId}
 *   onChange={(vendor) => setSelectedVendorId(vendor?.id ?? null)}
 *   label="Payee"
 *   allowCreate
 * />
 * ```
 */
export function VendorSelector({
  orgId,
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  error = false,
  errorMessage,
  placeholder = 'Search or create vendor...',
  allowCreate = true,
  className = '',
  id,
}: VendorSelectorProps) {
  const dispatch = useAppDispatch()
  const autocompleteResults = useAppSelector(selectAutocompleteResults)
  const isSearching = useAppSelector(selectVendorSearching)
  const allVendors = useAppSelector(selectAllVendors)

  const [inputValue, setInputValue] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [hasLoadedVendors, setHasLoadedVendors] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [newlyCreatedVendor, setNewlyCreatedVendor] = useState<Vendor | null>(
    null
  )

  // Debounce search input
  const debouncedSearch = useDebounce(inputValue, 300)

  // Find selected vendor from value prop
  const selectedVendor = useMemo(() => {
    if (!value) return null
    // First check if it's the newly created vendor
    if (newlyCreatedVendor?.id === value) return newlyCreatedVendor
    // Then check autocomplete results
    let vendor = autocompleteResults.find((v) => v.id === value)
    if (vendor) return vendor
    // Then check all vendors
    vendor = allVendors.find((v) => v.id === value)
    return vendor ?? null
  }, [value, autocompleteResults, allVendors, newlyCreatedVendor])

  // Set input value when selected vendor changes
  useEffect(() => {
    if (selectedVendor) {
      setInputValue(selectedVendor.name)
    } else if (!value) {
      setInputValue('')
      setNewlyCreatedVendor(null) // Clear cached vendor when selection is cleared
    }
  }, [selectedVendor, value])

  // Search vendors when debounced value changes
  useEffect(() => {
    if (debouncedSearch.trim() && orgId) {
      void dispatch(searchVendors({ orgId, query: debouncedSearch, limit: 10 }))
    }
  }, [debouncedSearch, orgId, dispatch])

  // Load initial vendors on mount
  useEffect(() => {
    if (orgId && !hasLoadedVendors && allVendors.length === 0) {
      setHasLoadedVendors(true)
      void dispatch(fetchVendors({ orgId, params: { limit: 50 } }))
    }
  }, [orgId, hasLoadedVendors, allVendors.length, dispatch])

  // Handle focus - show recent vendors
  const handleFocus = useCallback(() => {
    if (!inputValue.trim() && allVendors.length > 0) {
      // Show first 10 vendors as suggestions
      dispatch(setAutocompleteResults(allVendors.slice(0, 10)))
    }
  }, [inputValue, allVendors, dispatch])

  // Handle blur - clear autocomplete if no selection
  const handleBlur = useCallback(() => {
    // Delay to allow click on option
    setTimeout(() => {
      dispatch(clearAutocomplete())
    }, 200)
  }, [dispatch])

  // Handle input change
  const handleInputChange = useCallback(
    (newValue: string) => {
      setInputValue(newValue)
      // Clear selection when user modifies input (but not during selection process)
      if (!isSelecting && selectedVendor && newValue !== selectedVendor.name) {
        onChange(null)
      }
    },
    [isSelecting, selectedVendor, onChange]
  )

  // Handle option selection
  const handleSelect = useCallback(
    (option: ComboboxOption<Vendor>) => {
      if (option.data) {
        setIsSelecting(true)
        onChange(option.data)
        setInputValue(option.data.name)
        dispatch(clearAutocomplete())
        // Reset flag after a brief delay to allow state updates to complete
        setTimeout(() => setIsSelecting(false), 100)
      }
    },
    [onChange, dispatch]
  )

  // Handle create new vendor
  const handleCreate = useCallback(
    (name: string) => {
      if (!orgId || isCreating) return

      // Check if vendor already exists (case-insensitive)
      const normalizedName = name.trim().toLowerCase()
      const existingVendor = [...autocompleteResults, ...allVendors].find(
        (v) => v.name.toLowerCase() === normalizedName
      )

      if (existingVendor) {
        // Vendor already exists, just select it
        setIsSelecting(true)
        onChange(existingVendor)
        setInputValue(existingVendor.name)
        dispatch(clearAutocomplete())
        setTimeout(() => setIsSelecting(false), 100)
        return
      }

      // Create new vendor
      setIsCreating(true)
      dispatch(createVendor({ orgId, data: { name: name.trim() } }))
        .unwrap()
        .then((result) => {
          setIsSelecting(true)
          setNewlyCreatedVendor(result) // Cache the newly created vendor
          onChange(result)
          setInputValue(result.name)
          dispatch(clearAutocomplete())
          setTimeout(() => setIsSelecting(false), 100)
        })
        .catch((error: unknown) => {
          logger.apiError('Failed to create vendor', error, {
            orgId,
            vendorName: name,
          })
        })
        .finally(() => {
          setIsCreating(false)
        })
    },
    [orgId, isCreating, autocompleteResults, allVendors, dispatch, onChange]
  )

  // Convert vendors to combobox options
  const options = useMemo(() => {
    return autocompleteResults.map(vendorToOption)
  }, [autocompleteResults])

  // Custom render for options with transaction count
  const renderOption = useCallback(
    (option: ComboboxOption<Vendor>, _isHighlighted: boolean) => {
      const vendor = option.data
      return (
        <div className="flex items-center justify-between">
          <span>{option.label}</span>
          {vendor?.transactionCount !== undefined &&
            vendor.transactionCount > 0 && (
              <span className="text-xs text-gray-400">
                {vendor.transactionCount} transaction
                {vendor.transactionCount !== 1 ? 's' : ''}
              </span>
            )}
        </div>
      )
    },
    []
  )

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} required={required} className="mb-1">
          {label}
        </Label>
      )}
      <Combobox
        id={id}
        value={inputValue}
        onChange={handleInputChange}
        options={options}
        onSelect={handleSelect}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        isLoading={isSearching || isCreating}
        error={error}
        errorMessage={errorMessage}
        allowCreate={allowCreate}
        createText="Create vendor"
        onCreate={handleCreate}
        renderOption={renderOption}
        emptyMessage={
          inputValue.trim() ? 'No vendors found' : 'Start typing to search'
        }
        aria-label={label ?? 'Vendor'}
      />
    </div>
  )
}
