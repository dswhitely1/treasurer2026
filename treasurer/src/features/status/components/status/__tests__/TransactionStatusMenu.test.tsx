/**
 * Tests for TransactionStatusMenu component
 *
 * Covers:
 * - Menu rendering and visibility
 * - Status transitions
 * - Keyboard navigation
 * - Click outside behavior
 * - Loading state
 * - Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransactionStatusMenu } from '../TransactionStatusMenu'

describe('TransactionStatusMenu', () => {
  const defaultProps = {
    transactionId: 'txn-1',
    currentStatus: 'UNCLEARED' as const,
    onStatusChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render with current status', () => {
      render(<TransactionStatusMenu {...defaultProps} />)
      expect(screen.getByText('Uncleared')).toBeInTheDocument()
    })

    it('should render trigger button with proper aria attributes', () => {
      render(<TransactionStatusMenu {...defaultProps} />)
      const trigger = screen.getByRole('button', {
        name: /Transaction status: Uncleared/i,
      })

      expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    it('should not show menu initially', () => {
      render(<TransactionStatusMenu {...defaultProps} />)
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })

  describe('Menu Interaction', () => {
    it('should open menu on click', async () => {
      const user = userEvent.setup()
      render(<TransactionStatusMenu {...defaultProps} />)

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      await user.click(trigger)

      expect(screen.getByRole('menu')).toBeInTheDocument()
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })

    it('should close menu on second click', async () => {
      const user = userEvent.setup()
      render(<TransactionStatusMenu {...defaultProps} />)

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })

      await user.click(trigger)
      expect(screen.getByRole('menu')).toBeInTheDocument()

      await user.click(trigger)

      // Wait for animation to complete
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      })
    })

    it('should display current status in menu', async () => {
      const user = userEvent.setup()
      render(<TransactionStatusMenu {...defaultProps} />)

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      await user.click(trigger)

      const menu = screen.getByRole('menu')
      // Query by name instead of current attribute
      const currentItem = within(menu).getByRole('menuitem', {
        name: /Uncleared/i,
      })

      expect(currentItem).toHaveAttribute('aria-current', 'true')
      expect(currentItem).toBeDisabled()
    })

    it('should display valid next statuses', async () => {
      const user = userEvent.setup()
      render(
        <TransactionStatusMenu {...defaultProps} currentStatus="UNCLEARED" />
      )

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      await user.click(trigger)

      const menu = screen.getByRole('menu')

      // UNCLEARED can transition to CLEARED
      expect(within(menu).getByText('Cleared')).toBeInTheDocument()
      // Should not show RECONCILED (not valid from UNCLEARED)
      expect(within(menu).queryByText('Reconciled')).not.toBeInTheDocument()
    })

    it('should show all valid transitions for CLEARED status', async () => {
      const user = userEvent.setup()
      render(
        <TransactionStatusMenu {...defaultProps} currentStatus="CLEARED" />
      )

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      await user.click(trigger)

      const menu = screen.getByRole('menu')

      // CLEARED can go back to UNCLEARED or forward to RECONCILED
      expect(within(menu).getByText('Uncleared')).toBeInTheDocument()
      expect(within(menu).getByText('Reconciled')).toBeInTheDocument()
    })

    it('should disable current status option', async () => {
      const user = userEvent.setup()
      render(
        <TransactionStatusMenu {...defaultProps} currentStatus="UNCLEARED" />
      )

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      await user.click(trigger)

      const menu = screen.getByRole('menu')
      const currentItem = within(menu).getByRole('menuitem', {
        name: /Uncleared/i,
      })

      expect(currentItem).toBeDisabled()
      expect(currentItem).toHaveAttribute('aria-current', 'true')
    })
  })

  describe('Status Change', () => {
    it('should call onStatusChange when selecting a new status', async () => {
      const user = userEvent.setup()
      const onStatusChange = vi.fn()
      render(
        <TransactionStatusMenu
          {...defaultProps}
          onStatusChange={onStatusChange}
        />
      )

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      await user.click(trigger)

      const clearedOption = screen.getByText('Cleared')
      await user.click(clearedOption)

      expect(onStatusChange).toHaveBeenCalledWith('CLEARED')
    })

    it('should close menu after status change', async () => {
      const user = userEvent.setup()
      render(<TransactionStatusMenu {...defaultProps} />)

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      await user.click(trigger)

      const clearedOption = screen.getByText('Cleared')
      await user.click(clearedOption)

      // Wait for animation to complete
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      })
    })

    it('should not call onStatusChange when clicking current status', async () => {
      const user = userEvent.setup()
      const onStatusChange = vi.fn()
      render(
        <TransactionStatusMenu
          {...defaultProps}
          onStatusChange={onStatusChange}
        />
      )

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      await user.click(trigger)

      const unclearedOption = within(screen.getByRole('menu')).getByRole(
        'menuitem',
        {
          name: /Uncleared/i,
        }
      )

      // Button is disabled, so clicking won't trigger anything
      expect(unclearedOption).toBeDisabled()
      await user.click(unclearedOption)

      expect(onStatusChange).not.toHaveBeenCalled()
    })

    it('should refocus trigger after status change', async () => {
      const user = userEvent.setup()
      render(<TransactionStatusMenu {...defaultProps} />)

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      await user.click(trigger)

      const clearedOption = screen.getByText('Cleared')
      await user.click(clearedOption)

      expect(trigger).toHaveFocus()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should open menu on Enter key', async () => {
      const user = userEvent.setup()
      render(<TransactionStatusMenu {...defaultProps} />)

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      trigger.focus()
      await user.keyboard('{Enter}')

      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('should open menu on Space key', async () => {
      const user = userEvent.setup()
      render(<TransactionStatusMenu {...defaultProps} />)

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      trigger.focus()
      await user.keyboard(' ')

      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('should open menu on ArrowDown key', async () => {
      const user = userEvent.setup()
      render(<TransactionStatusMenu {...defaultProps} />)

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      trigger.focus()
      await user.keyboard('{ArrowDown}')

      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('should close menu on Escape key', async () => {
      const user = userEvent.setup()
      render(<TransactionStatusMenu {...defaultProps} />)

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      await user.click(trigger)

      expect(screen.getByRole('menu')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      // Wait for animation to complete
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      })
    })

    it('should refocus trigger on Escape', async () => {
      const user = userEvent.setup()
      render(<TransactionStatusMenu {...defaultProps} />)

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      await user.click(trigger)
      await user.keyboard('{Escape}')

      expect(trigger).toHaveFocus()
    })

    it('should close menu on Tab key', async () => {
      const user = userEvent.setup()
      render(<TransactionStatusMenu {...defaultProps} />)

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      await user.click(trigger)

      expect(screen.getByRole('menu')).toBeInTheDocument()

      await user.keyboard('{Tab}')

      // Wait for animation to complete
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      })
    })
  })

  describe('Click Outside', () => {
    it('should close menu when clicking outside', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <TransactionStatusMenu {...defaultProps} />
        </div>
      )

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      await user.click(trigger)

      expect(screen.getByRole('menu')).toBeInTheDocument()

      const outside = screen.getByTestId('outside')
      await user.click(outside)

      // Wait for animation to complete
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      })
    })
  })

  describe('Disabled State', () => {
    it('should not open menu when disabled', async () => {
      const user = userEvent.setup()
      render(<TransactionStatusMenu {...defaultProps} disabled={true} />)

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      await user.click(trigger)

      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('should apply disabled styles', () => {
      render(<TransactionStatusMenu {...defaultProps} disabled={true} />)

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      expect(trigger).toHaveClass('cursor-not-allowed', 'opacity-50')
      expect(trigger).toBeDisabled()
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      const { container } = render(
        <TransactionStatusMenu {...defaultProps} isLoading={true} />
      )

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should not show dropdown arrow when loading', () => {
      render(<TransactionStatusMenu {...defaultProps} isLoading={true} />)

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      const arrows = trigger.querySelectorAll('path[d*="6L8 10L12 6"]')
      expect(arrows).toHaveLength(0)
    })

    it('should not open menu when loading', async () => {
      const user = userEvent.setup()
      render(<TransactionStatusMenu {...defaultProps} isLoading={true} />)

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      await user.click(trigger)

      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('should disable trigger when loading', () => {
      render(<TransactionStatusMenu {...defaultProps} isLoading={true} />)

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      expect(trigger).toBeDisabled()
    })
  })

  describe('Edge Cases', () => {
    // TODO: Fix RECONCILED status menu rendering
    it.skip('should show CLEARED option for RECONCILED status', async () => {
      const user = userEvent.setup()
      // RECONCILED has one valid transition (to CLEARED)
      render(
        <TransactionStatusMenu {...defaultProps} currentStatus="RECONCILED" />
      )

      const trigger = screen.getByRole('button', {
        name: /Transaction status/i,
      })
      await user.click(trigger)

      // RECONCILED should show CLEARED as an option
      const menu = screen.getByRole('menu')
      const clearedButton = within(menu)
        .getAllByRole('menuitem')
        .find((item) => item.textContent?.includes('Cleared'))
      expect(clearedButton).toBeInTheDocument()
    })
  })

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <TransactionStatusMenu {...defaultProps} className="custom-class" />
      )

      const wrapper = container.querySelector('.custom-class')
      expect(wrapper).toBeInTheDocument()
    })
  })
})
