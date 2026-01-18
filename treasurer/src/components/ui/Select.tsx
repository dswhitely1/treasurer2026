import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

/**
 * Option type for select items.
 */
export interface SelectOption<T = unknown> {
  /** Unique identifier for the option */
  id: string
  /** Display label for the option */
  label: string
  /** Optional additional data attached to the option */
  data?: T
  /** Whether this option is disabled */
  disabled?: boolean
}

/**
 * Option group for grouped selects.
 */
export interface SelectOptionGroup<T = unknown> {
  /** Group label */
  label: string
  /** Options in this group */
  options: SelectOption<T>[]
}

/**
 * Props for the Select component.
 */
interface SelectProps<T = unknown> {
  /** Currently selected option ID */
  value?: string | null
  /** Callback when selection changes */
  onChange: (option: SelectOption<T> | null) => void
  /** Available options to display */
  options: SelectOption<T>[] | SelectOptionGroup<T>[]
  /** Placeholder text when no selection */
  placeholder?: string
  /** Whether the select is disabled */
  disabled?: boolean
  /** Whether the select is in a loading state */
  isLoading?: boolean
  /** Whether the select has an error */
  error?: boolean
  /** Error message to display */
  errorMessage?: string
  /** Label for accessibility */
  'aria-label'?: string
  /** ID of element that labels this select */
  'aria-labelledby'?: string
  /** Custom class name for the container */
  className?: string
  /** Whether to allow clearing the selection */
  clearable?: boolean
  /** Custom render function for selected value */
  renderValue?: (option: SelectOption<T>) => ReactNode
  /** Custom render function for options */
  renderOption?: (option: SelectOption<T>, isSelected: boolean) => ReactNode
  /** ID for the button element */
  id?: string
}

/**
 * Check if options are grouped.
 */
function isGroupedOptions<T>(
  options: SelectOption<T>[] | SelectOptionGroup<T>[]
): options is SelectOptionGroup<T>[] {
  return options.length > 0 && options[0] !== undefined && 'options' in options[0]
}

/**
 * Flatten grouped options into a single array.
 */
function flattenOptions<T>(
  options: SelectOption<T>[] | SelectOptionGroup<T>[]
): SelectOption<T>[] {
  if (isGroupedOptions(options)) {
    return options.flatMap((group) => group.options)
  }
  return options
}

/**
 * Accessible select/dropdown component.
 * Supports keyboard navigation, grouping, and custom rendering.
 *
 * @example
 * ```tsx
 * <Select
 *   value={selectedId}
 *   onChange={(option) => setSelectedId(option?.id ?? null)}
 *   options={categories}
 *   placeholder="Select a category"
 *   clearable
 * />
 * ```
 */
export function Select<T = unknown>({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  isLoading = false,
  error = false,
  errorMessage,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className = '',
  clearable = false,
  renderValue,
  renderOption,
  id: propId,
}: SelectProps<T>) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)
  const generatedId = useId()
  const buttonId = propId ?? generatedId
  const listboxId = `${buttonId}-listbox`

  // Flatten options for index-based navigation
  const flatOptions = flattenOptions(options)

  // Find selected option
  const selectedOption = value ? flatOptions.find((opt) => opt.id === value) : null

  // Reset highlighted index when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const selectedIndex = value ? flatOptions.findIndex((opt) => opt.id === value) : -1
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
    }
  }, [isOpen, value, flatOptions])

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listboxRef.current) {
      const highlightedElement = listboxRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`
      ) as HTMLElement
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev)
    }
  }, [disabled])

  const handleSelectOption = useCallback(
    (option: SelectOption<T>) => {
      if (option.disabled) return
      onChange(option)
      setIsOpen(false)
    },
    [onChange]
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange(null)
    },
    [onChange]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (!isOpen) {
            setIsOpen(true)
          } else {
            setHighlightedIndex((prev) =>
              prev < flatOptions.length - 1 ? prev + 1 : prev
            )
          }
          break

        case 'ArrowUp':
          e.preventDefault()
          if (!isOpen) {
            setIsOpen(true)
          } else {
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev))
          }
          break

        case 'Enter':
        case ' ':
          e.preventDefault()
          if (isOpen && highlightedIndex >= 0) {
            const selectedOption = flatOptions[highlightedIndex]
            if (selectedOption) {
              handleSelectOption(selectedOption)
            }
          } else {
            setIsOpen(true)
          }
          break

        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          break

        case 'Tab':
          setIsOpen(false)
          break

        case 'Home':
          e.preventDefault()
          if (isOpen) {
            setHighlightedIndex(0)
          }
          break

        case 'End':
          e.preventDefault()
          if (isOpen) {
            setHighlightedIndex(flatOptions.length - 1)
          }
          break
      }
    },
    [isOpen, highlightedIndex, flatOptions, handleSelectOption]
  )

  const buttonClasses = `
    flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm
    transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50
    ${
      error
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    }
    ${disabled ? 'bg-gray-50' : 'bg-white'}
  `.trim()

  // Render options (grouped or flat)
  const renderOptions = () => {
    if (isGroupedOptions(options)) {
      let globalIndex = 0

      return options.map((group) => (
        <li key={group.label} role="presentation">
          <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {group.label}
          </div>
          <ul role="group" aria-label={group.label}>
            {group.options.map((option) => {
              const currentIndex = globalIndex++
              const isHighlighted = currentIndex === highlightedIndex
              const isSelected = option.id === value

              return (
                <li
                  key={option.id}
                  id={`${listboxId}-option-${currentIndex}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled}
                  data-index={currentIndex}
                  onClick={() => handleSelectOption(option)}
                  className={`
                    cursor-pointer px-3 py-2 text-sm
                    ${isHighlighted ? 'bg-blue-50' : ''}
                    ${isSelected ? 'font-medium text-blue-700' : 'text-gray-900'}
                    ${option.disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100'}
                  `}
                >
                  {renderOption
                    ? renderOption(option, isSelected)
                    : option.label}
                </li>
              )
            })}
          </ul>
        </li>
      ))
    }

    return options.map((option, index) => {
      const isHighlighted = index === highlightedIndex
      const isSelected = option.id === value

      return (
        <li
          key={option.id}
          id={`${listboxId}-option-${index}`}
          role="option"
          aria-selected={isSelected}
          aria-disabled={option.disabled}
          data-index={index}
          onClick={() => handleSelectOption(option)}
          className={`
            cursor-pointer px-3 py-2 text-sm
            ${isHighlighted ? 'bg-blue-50' : ''}
            ${isSelected ? 'font-medium text-blue-700' : 'text-gray-900'}
            ${option.disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100'}
          `}
        >
          {renderOption ? renderOption(option, isSelected) : option.label}
        </li>
      )
    })
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        id={buttonId}
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-activedescendant={
          isOpen && highlightedIndex >= 0
            ? `${listboxId}-option-${highlightedIndex}`
            : undefined
        }
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-invalid={error}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={buttonClasses}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption
            ? renderValue
              ? renderValue(selectedOption)
              : selectedOption.label
            : placeholder}
        </span>

        <span className="flex items-center gap-1">
          {/* Clear button */}
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              aria-label="Clear selection"
              onClick={handleClear}
              className="rounded p-0.5 hover:bg-gray-200"
            >
              <svg
                className="h-4 w-4 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </span>
          )}

          {/* Loading indicator */}
          {isLoading ? (
            <svg
              className="h-4 w-4 animate-spin text-gray-400"
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
              className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
      </button>

      {/* Error message */}
      {error && errorMessage && <p className="mt-1 text-sm text-red-600">{errorMessage}</p>}

      {/* Dropdown listbox */}
      {isOpen && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel ?? 'Options'}
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {flatOptions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500" role="presentation">
              No options available
            </li>
          ) : (
            renderOptions()
          )}
        </ul>
      )}
    </div>
  )
}
