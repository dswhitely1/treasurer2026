/**
 * Tests for useStatusKeyboardShortcuts hook
 *
 * Covers:
 * - Status change shortcuts (U, C, R)
 * - Escape key handling
 * - Select all shortcut (A)
 * - Input element detection
 * - Disabled state
 * - Custom shortcuts
 * - Format shortcut display
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useStatusKeyboardShortcuts } from '../useStatusKeyboardShortcuts'

describe('useStatusKeyboardShortcuts', () => {
  let onStatusChange: ReturnType<typeof vi.fn>
  let onEscape: ReturnType<typeof vi.fn>
  let onSelectAll: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onStatusChange = vi.fn()
    onEscape = vi.fn()
    onSelectAll = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const fireKeyboardEvent = (key: string, options: Partial<KeyboardEvent> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      ...options,
    })
    document.dispatchEvent(event)
    return event
  }

  describe('Status change shortcuts', () => {
    it('should call onStatusChange with UNCLEARED when U is pressed', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
        })
      )

      fireKeyboardEvent('u')

      expect(onStatusChange).toHaveBeenCalledWith('UNCLEARED')
    })

    it('should call onStatusChange with CLEARED when C is pressed', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
        })
      )

      fireKeyboardEvent('c')

      expect(onStatusChange).toHaveBeenCalledWith('CLEARED')
    })

    it('should call onStatusChange with RECONCILED when R is pressed', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
        })
      )

      fireKeyboardEvent('r')

      expect(onStatusChange).toHaveBeenCalledWith('RECONCILED')
    })

    it('should work with uppercase keys', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
        })
      )

      fireKeyboardEvent('U')

      expect(onStatusChange).toHaveBeenCalledWith('UNCLEARED')
    })
  })

  describe('Escape key handling', () => {
    it('should call onEscape when Escape is pressed', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onEscape,
          enabled: true,
        })
      )

      fireKeyboardEvent('Escape')

      expect(onEscape).toHaveBeenCalledTimes(1)
    })
  })

  describe('Select all shortcut', () => {
    it('should call onSelectAll when A is pressed', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onSelectAll,
          enabled: true,
        })
      )

      fireKeyboardEvent('a')

      expect(onSelectAll).toHaveBeenCalledTimes(1)
    })
  })

  describe('Input element detection', () => {
    it('should not trigger shortcuts when typing in input', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
        })
      )

      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      fireKeyboardEvent('u')

      expect(onStatusChange).not.toHaveBeenCalled()

      document.body.removeChild(input)
    })

    it('should not trigger shortcuts when typing in textarea', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
        })
      )

      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)
      textarea.focus()

      fireKeyboardEvent('u')

      expect(onStatusChange).not.toHaveBeenCalled()

      document.body.removeChild(textarea)
    })

    it('should not trigger shortcuts when typing in select', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
        })
      )

      const select = document.createElement('select')
      document.body.appendChild(select)
      select.focus()

      fireKeyboardEvent('u')

      expect(onStatusChange).not.toHaveBeenCalled()

      document.body.removeChild(select)
    })

    it('should not trigger shortcuts in contentEditable element', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
        })
      )

      const div = document.createElement('div')
      div.contentEditable = 'true'
      document.body.appendChild(div)

      // Set the activeElement to the contentEditable div
      Object.defineProperty(document, 'activeElement', {
        value: div,
        writable: true,
        configurable: true,
      })

      fireKeyboardEvent('u')

      expect(onStatusChange).not.toHaveBeenCalled()

      document.body.removeChild(div)

      // Reset activeElement
      Object.defineProperty(document, 'activeElement', {
        value: document.body,
        writable: true,
        configurable: true,
      })
    })

    it('should trigger shortcuts when not in input element', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
        })
      )

      const div = document.createElement('div')
      div.tabIndex = 0
      document.body.appendChild(div)
      div.focus()

      fireKeyboardEvent('u')

      expect(onStatusChange).toHaveBeenCalledWith('UNCLEARED')

      document.body.removeChild(div)
    })
  })

  describe('Disabled state', () => {
    it('should not trigger shortcuts when disabled', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: false,
        })
      )

      fireKeyboardEvent('u')

      expect(onStatusChange).not.toHaveBeenCalled()
    })

    it('should trigger shortcuts when re-enabled', () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useStatusKeyboardShortcuts({
            onStatusChange,
            enabled,
          }),
        { initialProps: { enabled: false } }
      )

      fireKeyboardEvent('u')
      expect(onStatusChange).not.toHaveBeenCalled()

      rerender({ enabled: true })

      fireKeyboardEvent('u')
      expect(onStatusChange).toHaveBeenCalledWith('UNCLEARED')
    })
  })

  describe('Modifier keys', () => {
    it('should not trigger with Ctrl modifier', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
        })
      )

      fireKeyboardEvent('u', { ctrlKey: true })

      expect(onStatusChange).not.toHaveBeenCalled()
    })

    it('should not trigger with Meta modifier', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
        })
      )

      fireKeyboardEvent('u', { metaKey: true })

      expect(onStatusChange).not.toHaveBeenCalled()
    })

    it('should not trigger with Alt modifier', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
        })
      )

      fireKeyboardEvent('u', { altKey: true })

      expect(onStatusChange).not.toHaveBeenCalled()
    })

    it('should allow Shift modifier', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
        })
      )

      fireKeyboardEvent('U', { shiftKey: true })

      expect(onStatusChange).toHaveBeenCalledWith('UNCLEARED')
    })
  })

  describe('Custom shortcuts', () => {
    it('should use custom uncleared shortcut', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
          shortcuts: { uncleared: 'x' },
        })
      )

      fireKeyboardEvent('x')

      expect(onStatusChange).toHaveBeenCalledWith('UNCLEARED')
    })

    it('should use custom cleared shortcut', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
          shortcuts: { cleared: 'y' },
        })
      )

      fireKeyboardEvent('y')

      expect(onStatusChange).toHaveBeenCalledWith('CLEARED')
    })

    it('should use custom reconciled shortcut', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
          shortcuts: { reconciled: 'z' },
        })
      )

      fireKeyboardEvent('z')

      expect(onStatusChange).toHaveBeenCalledWith('RECONCILED')
    })

    it('should preserve default shortcuts when overriding one', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
          shortcuts: { uncleared: 'x' },
        })
      )

      // Custom shortcut works
      fireKeyboardEvent('x')
      expect(onStatusChange).toHaveBeenCalledWith('UNCLEARED')

      onStatusChange.mockClear()

      // Default shortcuts still work
      fireKeyboardEvent('c')
      expect(onStatusChange).toHaveBeenCalledWith('CLEARED')
    })
  })

  describe('formatShortcut', () => {
    it('should format UNCLEARED shortcut', () => {
      const { result } = renderHook(() =>
        useStatusKeyboardShortcuts({
          enabled: true,
        })
      )

      expect(result.current.formatShortcut('UNCLEARED')).toBe('U')
    })

    it('should format CLEARED shortcut', () => {
      const { result } = renderHook(() =>
        useStatusKeyboardShortcuts({
          enabled: true,
        })
      )

      expect(result.current.formatShortcut('CLEARED')).toBe('C')
    })

    it('should format RECONCILED shortcut', () => {
      const { result } = renderHook(() =>
        useStatusKeyboardShortcuts({
          enabled: true,
        })
      )

      expect(result.current.formatShortcut('RECONCILED')).toBe('R')
    })

    it('should format custom shortcuts', () => {
      const { result } = renderHook(() =>
        useStatusKeyboardShortcuts({
          enabled: true,
          shortcuts: {
            uncleared: 'x',
            cleared: 'y',
            reconciled: 'z',
          },
        })
      )

      expect(result.current.formatShortcut('UNCLEARED')).toBe('X')
      expect(result.current.formatShortcut('CLEARED')).toBe('Y')
      expect(result.current.formatShortcut('RECONCILED')).toBe('Z')
    })

    it('should return uppercase version', () => {
      const { result } = renderHook(() =>
        useStatusKeyboardShortcuts({
          enabled: true,
        })
      )

      const unclearedShortcut = result.current.formatShortcut('UNCLEARED')
      expect(unclearedShortcut).toBe(unclearedShortcut.toUpperCase())
    })
  })

  describe('shortcuts object', () => {
    it('should expose default shortcuts', () => {
      const { result } = renderHook(() =>
        useStatusKeyboardShortcuts({
          enabled: true,
        })
      )

      expect(result.current.shortcuts.uncleared).toBe('u')
      expect(result.current.shortcuts.cleared).toBe('c')
      expect(result.current.shortcuts.reconciled).toBe('r')
      expect(result.current.shortcuts.escape).toBe('Escape')
      expect(result.current.shortcuts.selectAll).toBe('a')
    })

    it('should expose custom shortcuts', () => {
      const { result } = renderHook(() =>
        useStatusKeyboardShortcuts({
          enabled: true,
          shortcuts: {
            uncleared: 'x',
            cleared: 'y',
          },
        })
      )

      expect(result.current.shortcuts.uncleared).toBe('x')
      expect(result.current.shortcuts.cleared).toBe('y')
      expect(result.current.shortcuts.reconciled).toBe('r') // Default
    })
  })

  describe('Event cleanup', () => {
    it('should remove event listener on unmount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
        })
      )

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('should not add event listener when disabled', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: false,
        })
      )

      expect(addEventListenerSpy).not.toHaveBeenCalled()
    })
  })

  describe('Multiple callbacks', () => {
    it('should support all callbacks at once', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          onEscape,
          onSelectAll,
          enabled: true,
        })
      )

      fireKeyboardEvent('u')
      expect(onStatusChange).toHaveBeenCalledWith('UNCLEARED')

      fireKeyboardEvent('Escape')
      expect(onEscape).toHaveBeenCalledTimes(1)

      fireKeyboardEvent('a')
      expect(onSelectAll).toHaveBeenCalledTimes(1)
    })

    it('should work with only some callbacks defined', () => {
      renderHook(() =>
        useStatusKeyboardShortcuts({
          onStatusChange,
          enabled: true,
        })
      )

      fireKeyboardEvent('u')
      expect(onStatusChange).toHaveBeenCalledWith('UNCLEARED')

      // These should not error even though callbacks aren't defined
      fireKeyboardEvent('Escape')
      fireKeyboardEvent('a')
    })
  })
})
