import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

/**
 * Option type for combobox items.
 */
export interface ComboboxOption<T = unknown> {
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
 * Props for the Combobox component.
 */
interface ComboboxProps<T = unknown> {
  /** Current input value */
  value: string
  /** Callback when input value changes */
  onChange: (value: string) => void
  /** Available options to display */
  options: ComboboxOption<T>[]
  /** Callback when an option is selected */
  onSelect: (option: ComboboxOption<T>) => void
  /** Placeholder text for the input */
  placeholder?: string
  /** Whether the combobox is disabled */
  disabled?: boolean
  /** Whether the combobox is in a loading state */
  isLoading?: boolean
  /** Whether the combobox has an error */
  error?: boolean
  /** Error message to display */
  errorMessage?: string
  /** Label for accessibility */
  'aria-label'?: string
  /** ID of element that labels this combobox */
  'aria-labelledby'?: string
  /** Custom class name for the container */
  className?: string
  /** Callback when the input is focused */
  onFocus?: () => void
  /** Callback when the input loses focus */
  onBlur?: () => void
  /** Allow creating new items when no match is found */
  allowCreate?: boolean
  /** Text to display for create option */
  createText?: string
  /** Callback when create option is selected */
  onCreate?: (value: string) => void
  /** Custom render function for options */
  renderOption?: (option: ComboboxOption<T>, isHighlighted: boolean) => ReactNode
  /** No results message */
  emptyMessage?: string
  /** ID for the input element */
  id?: string
}

/**
 * Accessible combobox/autocomplete component.
 * Supports keyboard navigation, ARIA labels, and custom rendering.
 *
 * @example
 * ```tsx
 * <Combobox
 *   value={search}
 *   onChange={setSearch}
 *   options={vendors}
 *   onSelect={(option) => setSelectedVendor(option.data)}
 *   placeholder="Search vendors..."
 *   allowCreate
 *   onCreate={(name) => createVendor(name)}
 * />
 * ```
 */
export function Combobox<T = unknown>({
  value,
    onChange,
    options,
    onSelect,
    placeholder = 'Search...',
    disabled = false,
    isLoading = false,
    error = false,
    errorMessage,
    'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className = '',
  onFocus,
  onBlur,
  allowCreate = false,
  createText = 'Create',
  onCreate,
  renderOption,
  emptyMessage = 'No results found',
  id: propId,
}: ComboboxProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)
  const generatedId = useId()
  const inputId = propId ?? generatedId
  const listboxId = `${inputId}-listbox`

  // Compute if we should show create option
  const showCreateOption = useMemo(() => {
    if (!allowCreate || !value.trim()) return false
    const normalizedValue = value.toLowerCase().trim()
    return !options.some((opt) => opt.label.toLowerCase() === normalizedValue)
  }, [allowCreate, value, options])

  // Total visible options including create option
  const totalOptions = options.length + (showCreateOption ? 1 : 0)

  // Reset highlighted index when options change
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [options])

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listboxRef.current) {
      const highlightedElement = listboxRef.current.children[highlightedIndex] as HTMLElement
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

  const handleInputFocus = useCallback(() => {
    setIsOpen(true)
    onFocus?.()
  }, [onFocus])

  const handleInputBlur = useCallback(() => {
    // Delay to allow click on option
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsOpen(false)
        onBlur?.()
      }
    }, 150)
  }, [onBlur])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
      setIsOpen(true)
      setHighlightedIndex(-1)
    },
    [onChange]
  )

  const handleSelectOption = useCallback(
    (option: ComboboxOption<T>) => {
      if (option.disabled) return
      onSelect(option)
      setIsOpen(false)
      setHighlightedIndex(-1)
    },
    [onSelect]
  )

  const handleCreateOption = useCallback(() => {
    if (onCreate && value.trim()) {
      onCreate(value.trim())
      setIsOpen(false)
      setHighlightedIndex(-1)
    }
  }, [onCreate, value])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          setIsOpen(true)
          setHighlightedIndex(0)
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex((prev) => (prev < totalOptions - 1 ? prev + 1 : prev))
          break

        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev))
          break

        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0) {
            if (showCreateOption && highlightedIndex === options.length) {
              handleCreateOption()
            } else {
              const selectedOption = options[highlightedIndex]
              if (selectedOption) {
                handleSelectOption(selectedOption)
              }
            }
          }
          break

        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setHighlightedIndex(-1)
          break

        case 'Tab':
          setIsOpen(false)
          break
      }
    },
    [
      isOpen,
      highlightedIndex,
      totalOptions,
      options,
      showCreateOption,
      handleSelectOption,
      handleCreateOption,
    ]
  )

  const inputClasses = `
    block w-full rounded-md border px-3 py-2 text-sm transition-colors
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50
    ${
      error
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    }
  `.trim()

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-activedescendant={
            highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined
          }
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-invalid={error}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
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
          </div>
        )}

        {/* Dropdown arrow */}
        {!isLoading && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
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
          </div>
        )}
      </div>

      {/* Error message */}
      {error && errorMessage && <p className="mt-1 text-sm text-red-600">{errorMessage}</p>}

      {/* Dropdown listbox */}
      {isOpen && (totalOptions > 0 || value.trim()) && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel ?? 'Options'}
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {options.length === 0 && !showCreateOption && (
            <li className="px-3 py-2 text-sm text-gray-500" role="presentation">
              {emptyMessage}
            </li>
          )}

          {options.map((option, index) => {
            const isHighlighted = index === highlightedIndex

            return (
              <li
                key={option.id}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={isHighlighted}
                aria-disabled={option.disabled}
                onClick={() => handleSelectOption(option)}
                className={`
                  cursor-pointer px-3 py-2 text-sm
                  ${isHighlighted ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}
                  ${option.disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100'}
                `}
              >
                {renderOption ? renderOption(option, isHighlighted) : option.label}
              </li>
            )
          })}

          {/* Create new option */}
          {showCreateOption && (
            <li
              id={`${listboxId}-option-${options.length}`}
              role="option"
              aria-selected={highlightedIndex === options.length}
              onClick={handleCreateOption}
              className={`
                cursor-pointer px-3 py-2 text-sm
                ${
                  highlightedIndex === options.length
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-900'
                }
                hover:bg-gray-100
                border-t border-gray-100
              `}
            >
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                {createText} &quot;{value.trim()}&quot;
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
