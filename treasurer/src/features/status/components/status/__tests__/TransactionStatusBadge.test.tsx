/**
 * Tests for TransactionStatusBadge component
 *
 * Covers:
 * - Rendering with different statuses
 * - Icon display
 * - Size variants
 * - Interactive mode
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransactionStatusBadge } from '../TransactionStatusBadge'

describe('TransactionStatusBadge', () => {
  describe('Rendering', () => {
    it('should render with UNCLEARED status', () => {
      render(<TransactionStatusBadge status="UNCLEARED" />)
      expect(screen.getByText('Uncleared')).toBeInTheDocument()
    })

    it('should render with CLEARED status', () => {
      render(<TransactionStatusBadge status="CLEARED" />)
      expect(screen.getByText('Cleared')).toBeInTheDocument()
    })

    it('should render with RECONCILED status', () => {
      render(<TransactionStatusBadge status="RECONCILED" />)
      expect(screen.getByText('Reconciled')).toBeInTheDocument()
    })

    it('should apply correct color classes for UNCLEARED', () => {
      const { container } = render(<TransactionStatusBadge status="UNCLEARED" />)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-700', 'border-gray-300')
    })

    it('should apply correct color classes for CLEARED', () => {
      const { container } = render(<TransactionStatusBadge status="CLEARED" />)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-700', 'border-blue-300')
    })

    it('should apply correct color classes for RECONCILED', () => {
      const { container } = render(<TransactionStatusBadge status="RECONCILED" />)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('bg-green-100', 'text-green-700', 'border-green-300')
    })
  })

  describe('Icon Display', () => {
    it('should show icon by default', () => {
      const { container } = render(<TransactionStatusBadge status="UNCLEARED" />)
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('should show icon when showIcon is true', () => {
      const { container } = render(
        <TransactionStatusBadge status="UNCLEARED" showIcon={true} />
      )
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('should hide icon when showIcon is false', () => {
      const { container } = render(
        <TransactionStatusBadge status="UNCLEARED" showIcon={false} />
      )
      const icon = container.querySelector('svg')
      expect(icon).not.toBeInTheDocument()
    })

    it('should render circle icon for UNCLEARED', () => {
      const { container } = render(<TransactionStatusBadge status="UNCLEARED" />)
      const circle = container.querySelector('circle')
      expect(circle).toBeInTheDocument()
    })

    it('should render check icon for CLEARED', () => {
      const { container } = render(<TransactionStatusBadge status="CLEARED" />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      // Check icon has a path element
      const path = container.querySelector('path')
      expect(path).toBeInTheDocument()
    })

    it('should render check-double icon for RECONCILED', () => {
      const { container } = render(<TransactionStatusBadge status="RECONCILED" />)
      const paths = container.querySelectorAll('path')
      // Check-double has 2 paths
      expect(paths).toHaveLength(2)
    })
  })

  describe('Size Variants', () => {
    it('should render small size', () => {
      const { container } = render(
        <TransactionStatusBadge status="UNCLEARED" size="sm" />
      )
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs')
    })

    it('should render medium size by default', () => {
      const { container } = render(<TransactionStatusBadge status="UNCLEARED" />)
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('px-2.5', 'py-1', 'text-sm')
    })

    it('should render large size', () => {
      const { container } = render(
        <TransactionStatusBadge status="UNCLEARED" size="lg" />
      )
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('px-3', 'py-1.5', 'text-base')
    })

    it('should render icon in small size', () => {
      const { container } = render(
        <TransactionStatusBadge status="UNCLEARED" size="sm" />
      )
      const icon = container.querySelector('svg')
      expect(icon).toHaveClass('h-3', 'w-3')
    })

    it('should render icon in medium size', () => {
      const { container } = render(
        <TransactionStatusBadge status="UNCLEARED" size="md" />
      )
      const icon = container.querySelector('svg')
      expect(icon).toHaveClass('h-4', 'w-4')
    })

    it('should render icon in large size', () => {
      const { container } = render(
        <TransactionStatusBadge status="UNCLEARED" size="lg" />
      )
      const icon = container.querySelector('svg')
      expect(icon).toHaveClass('h-5', 'w-5')
    })
  })

  describe('Interactive Mode', () => {
    it('should render as span when not interactive', () => {
      const { container } = render(
        <TransactionStatusBadge status="UNCLEARED" interactive={false} />
      )
      const badge = container.querySelector('span')
      expect(badge?.tagName).toBe('SPAN')
    })

    it('should render as button when interactive', () => {
      render(
        <TransactionStatusBadge status="UNCLEARED" interactive={true} onClick={vi.fn()} />
      )
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('should call onClick when clicked in interactive mode', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(
        <TransactionStatusBadge
          status="UNCLEARED"
          interactive={true}
          onClick={handleClick}
        />
      )

      const button = screen.getByRole('button')
      await user.click(button)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when not interactive', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      const { container } = render(
        <TransactionStatusBadge
          status="UNCLEARED"
          interactive={false}
          onClick={handleClick}
        />
      )

      const badge = container.querySelector('span')
      if (badge) {
        await user.click(badge)
      }

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should handle Enter key in interactive mode', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(
        <TransactionStatusBadge
          status="UNCLEARED"
          interactive={true}
          onClick={handleClick}
        />
      )

      const button = screen.getByRole('button')
      button.focus()
      await user.keyboard('{Enter}')

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should handle Space key in interactive mode', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(
        <TransactionStatusBadge
          status="UNCLEARED"
          interactive={true}
          onClick={handleClick}
        />
      )

      const button = screen.getByRole('button')
      button.focus()
      await user.keyboard(' ')

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should apply interactive styles', () => {
      const { container } = render(
        <TransactionStatusBadge
          status="UNCLEARED"
          interactive={true}
          onClick={vi.fn()}
        />
      )
      const button = container.querySelector('button')
      expect(button).toHaveClass('cursor-pointer', 'hover:opacity-80')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes when interactive', () => {
      render(
        <TransactionStatusBadge
          status="UNCLEARED"
          interactive={true}
          onClick={vi.fn()}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Change status from Uncleared')
      expect(button).toHaveAttribute('tabindex', '0')
    })

    it('should not have ARIA attributes when not interactive', () => {
      const { container } = render(
        <TransactionStatusBadge status="UNCLEARED" interactive={false} />
      )

      const badge = container.querySelector('span')
      expect(badge).not.toHaveAttribute('aria-label')
      expect(badge).not.toHaveAttribute('tabindex')
      expect(badge).not.toHaveAttribute('role')
    })

    it('should have aria-hidden on icon', () => {
      const { container } = render(<TransactionStatusBadge status="UNCLEARED" />)
      const icon = container.querySelector('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <TransactionStatusBadge status="UNCLEARED" className="custom-class" />
      )
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('custom-class')
    })

    it('should preserve base classes with custom className', () => {
      const { container } = render(
        <TransactionStatusBadge status="UNCLEARED" className="custom-class" />
      )
      const badge = container.querySelector('span')
      expect(badge).toHaveClass('custom-class', 'bg-gray-100')
    })
  })
})
