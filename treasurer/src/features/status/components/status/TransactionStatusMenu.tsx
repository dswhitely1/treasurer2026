/**
 * TransactionStatusMenu Component
 *
 * Dropdown menu for changing a transaction's status.
 * Shows available status transitions based on current status.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type {
  TransactionStatusMenuProps,
  TransactionStatus,
} from '../../types'
import {
  STATUS_DISPLAY_CONFIG,
  getValidNextStatuses,
} from '../../types'
import { TransactionStatusBadge } from './TransactionStatusBadge'

/**
 * Menu item for a status option.
 */
interface StatusMenuItemProps {
  status: TransactionStatus
  isSelected: boolean
  onSelect: () => void
  disabled?: boolean
}

function StatusMenuItem({
  status,
  isSelected,
  onSelect,
  disabled,
}: StatusMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      disabled={disabled}
      className={`
        flex w-full items-center gap-2 px-3 py-2 text-left text-sm
        transition-colors
        ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        focus:bg-gray-100 focus:outline-none
      `}
      aria-current={isSelected ? 'true' : undefined}
    >
      <TransactionStatusBadge status={status} size="sm" showIcon />
      {isSelected && (
        <svg
          className="ml-auto h-4 w-4 text-blue-600"
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
      )}
    </button>
  )
}

/**
 * TransactionStatusMenu provides a dropdown for changing transaction status.
 *
 * Features:
 * - Shows current status as trigger button
 * - Displays valid next statuses based on workflow rules
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Click outside to close
 * - Loading state during status change
 * - Accessible with proper ARIA attributes
 */
export function TransactionStatusMenu({
  currentStatus,
  onStatusChange,
  disabled = false,
  isLoading = false,
  className = '',
}: TransactionStatusMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Get valid next statuses including current (for display)
  const validStatuses = useMemo(() => getValidNextStatuses(currentStatus), [currentStatus])
  const allStatuses = useMemo<TransactionStatus[]>(
    () => [currentStatus, ...validStatuses],
    [currentStatus, validStatuses]
  )

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen) {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
          event.preventDefault()
          setIsOpen(true)
          setFocusedIndex(0)
        }
        return
      }

      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          setIsOpen(false)
          triggerRef.current?.focus()
          break
        case 'ArrowDown':
          event.preventDefault()
          setFocusedIndex((prev) =>
            prev < allStatuses.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : allStatuses.length - 1
          )
          break
        case 'Enter':
        case ' ': {
          event.preventDefault()
          const selectedStatus = allStatuses[focusedIndex]
          if (selectedStatus && selectedStatus !== currentStatus) {
            onStatusChange(selectedStatus)
            setIsOpen(false)
          }
          break
        }
        case 'Tab':
          setIsOpen(false)
          break
      }
    },
    [isOpen, focusedIndex, allStatuses, currentStatus, onStatusChange]
  )

  const handleStatusSelect = (status: TransactionStatus) => {
    if (status !== currentStatus) {
      onStatusChange(status)
    }
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const toggleMenu = () => {
    if (!disabled && !isLoading) {
      setIsOpen(!isOpen)
      if (!isOpen) {
        setFocusedIndex(0)
      }
    }
  }

  return (
    <div ref={menuRef} className={`relative inline-block ${className}`}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        onKeyDown={handleKeyDown}
        disabled={disabled || isLoading}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Transaction status: ${STATUS_DISPLAY_CONFIG[currentStatus].label}. Click to change.`}
        className={`
          inline-flex items-center gap-1 rounded-md
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          ${disabled || isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        `}
      >
        <TransactionStatusBadge
          status={currentStatus}
          size="sm"
          showIcon
          interactive={false}
        />
        {isLoading ? (
          <svg
            className="h-3 w-3 animate-spin text-gray-500"
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
              strokeDasharray="32"
              strokeDashoffset="8"
            />
          </svg>
        ) : (
          <svg
            className={`h-3 w-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 z-50 mt-1 min-w-[160px] origin-top-left rounded-md border border-gray-200 bg-white py-1 shadow-lg"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="status-menu-button"
          >
            <div className="px-3 py-1.5 text-xs font-medium text-gray-500">
              Change status to:
            </div>
            {allStatuses.map((status) => (
              <StatusMenuItem
                key={status}
                status={status}
                isSelected={status === currentStatus}
                onSelect={() => handleStatusSelect(status)}
                disabled={status === currentStatus}
              />
            ))}
            {validStatuses.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">
                No status changes available
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export type { TransactionStatusMenuProps }
