/**
 * useStatusKeyboardShortcuts Hook
 *
 * Provides keyboard shortcuts for status management operations.
 */

import { useEffect, useCallback, useMemo } from 'react'
import type { TransactionStatus } from '../types'

/**
 * Keyboard shortcut mapping.
 */
interface StatusKeyboardShortcuts {
  /** Key for uncleared status (default: 'u') */
  uncleared: string
  /** Key for cleared status (default: 'c') */
  cleared: string
  /** Key for reconciled status (default: 'r') */
  reconciled: string
  /** Key to escape/cancel (default: 'Escape') */
  escape: string
  /** Key to select all (default: 'a') */
  selectAll: string
}

/**
 * Default keyboard shortcuts.
 */
const DEFAULT_SHORTCUTS: StatusKeyboardShortcuts = {
  uncleared: 'u',
  cleared: 'c',
  reconciled: 'r',
  escape: 'Escape',
  selectAll: 'a',
}

/**
 * Hook options.
 */
interface UseStatusKeyboardShortcutsOptions {
  /** Callback when a status shortcut is pressed */
  onStatusChange?: (status: TransactionStatus) => void
  /** Callback when escape is pressed */
  onEscape?: () => void
  /** Callback when select all is pressed */
  onSelectAll?: () => void
  /** Whether shortcuts are enabled */
  enabled?: boolean
  /** Custom shortcut mappings */
  shortcuts?: Partial<StatusKeyboardShortcuts>
}

/**
 * Hook return type.
 */
interface UseStatusKeyboardShortcutsReturn {
  /** Current shortcut configuration */
  shortcuts: StatusKeyboardShortcuts
  /** Format shortcut for display (e.g., "U" for uncleared) */
  formatShortcut: (status: TransactionStatus) => string
}

/**
 * useStatusKeyboardShortcuts enables keyboard shortcuts for status changes.
 *
 * Features:
 * - U/C/R keys for status changes
 * - Escape to cancel/clear selection
 * - A to select all
 * - Customizable key bindings
 * - Respects input focus (disabled when typing)
 * - Enable/disable toggle
 *
 * @example
 * ```tsx
 * const { shortcuts, formatShortcut } = useStatusKeyboardShortcuts({
 *   onStatusChange: (status) => handleStatusChange(status),
 *   onEscape: () => clearSelection(),
 *   onSelectAll: () => selectAll(),
 * })
 * ```
 */
export function useStatusKeyboardShortcuts({
  onStatusChange,
  onEscape,
  onSelectAll,
  enabled = true,
  shortcuts: customShortcuts,
}: UseStatusKeyboardShortcutsOptions = {}): UseStatusKeyboardShortcutsReturn {
  // Merge custom shortcuts with defaults
  const shortcuts = useMemo<StatusKeyboardShortcuts>(
    () => ({
      ...DEFAULT_SHORTCUTS,
      ...customShortcuts,
    }),
    [customShortcuts]
  )

  /**
   * Check if an element is an input-like element.
   */
  const isInputElement = useCallback((element: Element | null): boolean => {
    if (!element) return false
    const tagName = element.tagName.toLowerCase()
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      (element as HTMLElement).isContentEditable
    )
  }, [])

  /**
   * Handle keyboard events.
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if disabled
      if (!enabled) return

      // Skip if typing in an input
      if (isInputElement(document.activeElement)) return

      // Skip if modifier keys are pressed (allow ctrl+a for browser select all)
      if (event.ctrlKey || event.metaKey || event.altKey) return

      const key = event.key.toLowerCase()

      // Status shortcuts
      if (onStatusChange) {
        if (key === shortcuts.uncleared.toLowerCase()) {
          event.preventDefault()
          onStatusChange('UNCLEARED')
          return
        }
        if (key === shortcuts.cleared.toLowerCase()) {
          event.preventDefault()
          onStatusChange('CLEARED')
          return
        }
        if (key === shortcuts.reconciled.toLowerCase()) {
          event.preventDefault()
          onStatusChange('RECONCILED')
          return
        }
      }

      // Escape shortcut
      if (onEscape && event.key === shortcuts.escape) {
        event.preventDefault()
        onEscape()
        return
      }

      // Select all shortcut
      if (onSelectAll && key === shortcuts.selectAll.toLowerCase()) {
        event.preventDefault()
        onSelectAll()
        return
      }
    },
    [enabled, isInputElement, shortcuts, onStatusChange, onEscape, onSelectAll]
  )

  // Attach event listener
  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])

  /**
   * Format a shortcut key for display.
   */
  const formatShortcut = useCallback(
    (status: TransactionStatus): string => {
      switch (status) {
        case 'UNCLEARED':
          return shortcuts.uncleared.toUpperCase()
        case 'CLEARED':
          return shortcuts.cleared.toUpperCase()
        case 'RECONCILED':
          return shortcuts.reconciled.toUpperCase()
        default:
          return ''
      }
    },
    [shortcuts]
  )

  return {
    shortcuts,
    formatShortcut,
  }
}

export type {
  StatusKeyboardShortcuts,
  UseStatusKeyboardShortcutsOptions,
  UseStatusKeyboardShortcutsReturn,
}
