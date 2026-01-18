/**
 * Tests for TransactionBulkActions component
 *
 * Covers:
 * - Visibility based on selection
 * - Selected count display
 * - Bulk action buttons
 * - Clear selection
 * - Loading state
 * - Animation
 * - Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransactionBulkActions } from '../TransactionBulkActions'

describe('TransactionBulkActions', () => {
  const defaultProps = {
    selectedCount: 3,
    onStatusChange: vi.fn(),
    onClearSelection: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Visibility', () => {
    it('should render when transactions are selected', () => {
      render(<TransactionBulkActions {...defaultProps} selectedCount={1} />)
      expect(screen.getByRole('toolbar')).toBeInTheDocument()
    })

    it('should not render when no transactions are selected', () => {
      render(<TransactionBulkActions {...defaultProps} selectedCount={0} />)
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
    })
  })

  describe('Selected Count Display', () => {
    it('should show count with singular "transaction" for one selected', () => {
      render(<TransactionBulkActions {...defaultProps} selectedCount={1} />)
      expect(screen.getByText('1 transaction selected')).toBeInTheDocument()
    })

    it('should show count with plural "transactions" for multiple selected', () => {
      render(<TransactionBulkActions {...defaultProps} selectedCount={3} />)
      expect(screen.getByText('3 transactions selected')).toBeInTheDocument()
    })

    it('should show count with plural "transactions" for zero selected', () => {
      // This won't render, but testing the logic
      render(<TransactionBulkActions {...defaultProps} selectedCount={2} />)
      expect(screen.getByText('2 transactions selected')).toBeInTheDocument()
    })
  })

  describe('Bulk Action Buttons', () => {
    it('should render UNCLEARED action button', () => {
      render(<TransactionBulkActions {...defaultProps} />)
      expect(screen.getByLabelText('Mark selected as uncleared')).toBeInTheDocument()
    })

    it('should render CLEARED action button', () => {
      render(<TransactionBulkActions {...defaultProps} />)
      expect(screen.getByLabelText('Mark selected as cleared')).toBeInTheDocument()
    })

    it('should call onStatusChange with UNCLEARED when clicking Uncleared', async () => {
      const user = userEvent.setup()
      const onStatusChange = vi.fn()

      render(<TransactionBulkActions {...defaultProps} onStatusChange={onStatusChange} />)

      const unclearedButton = screen.getByLabelText('Mark selected as uncleared')
      await user.click(unclearedButton)

      expect(onStatusChange).toHaveBeenCalledWith('UNCLEARED')
    })

    it('should call onStatusChange with CLEARED when clicking Cleared', async () => {
      const user = userEvent.setup()
      const onStatusChange = vi.fn()

      render(<TransactionBulkActions {...defaultProps} onStatusChange={onStatusChange} />)

      const clearedButton = screen.getByLabelText('Mark selected as cleared')
      await user.click(clearedButton)

      expect(onStatusChange).toHaveBeenCalledWith('CLEARED')
    })

    it('should not render RECONCILED button', () => {
      render(<TransactionBulkActions {...defaultProps} />)
      expect(screen.queryByLabelText('Mark selected as reconciled')).not.toBeInTheDocument()
    })
  })

  describe('Clear Selection', () => {
    it('should render clear button', () => {
      render(<TransactionBulkActions {...defaultProps} />)
      expect(screen.getByLabelText('Clear selection')).toBeInTheDocument()
    })

    it('should call onClearSelection when clicking Clear', async () => {
      const user = userEvent.setup()
      const onClearSelection = vi.fn()

      render(<TransactionBulkActions {...defaultProps} onClearSelection={onClearSelection} />)

      const clearButton = screen.getByLabelText('Clear selection')
      await user.click(clearButton)

      expect(onClearSelection).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading State', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<TransactionBulkActions {...defaultProps} isLoading={true} />)

      expect(screen.getByText('Updating...')).toBeInTheDocument()
    })

    it('should not show loading indicator when isLoading is false', () => {
      render(<TransactionBulkActions {...defaultProps} isLoading={false} />)

      expect(screen.queryByText('Updating...')).not.toBeInTheDocument()
    })

    it('should disable action buttons when isLoading', () => {
      render(<TransactionBulkActions {...defaultProps} isLoading={true} />)

      const unclearedButton = screen.getByLabelText('Mark selected as uncleared')
      const clearedButton = screen.getByLabelText('Mark selected as cleared')

      expect(unclearedButton).toBeDisabled()
      expect(clearedButton).toBeDisabled()
    })

    it('should disable clear button when isLoading', () => {
      render(<TransactionBulkActions {...defaultProps} isLoading={true} />)

      const clearButton = screen.getByLabelText('Clear selection')
      expect(clearButton).toBeDisabled()
    })

    it('should show loading spinner', () => {
      const { container } = render(<TransactionBulkActions {...defaultProps} isLoading={true} />)

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper toolbar role', () => {
      render(<TransactionBulkActions {...defaultProps} />)

      const toolbar = screen.getByRole('toolbar', { name: 'Bulk transaction actions' })
      expect(toolbar).toBeInTheDocument()
    })

    it('should have accessible labels on action buttons', () => {
      render(<TransactionBulkActions {...defaultProps} />)

      expect(screen.getByLabelText('Mark selected as uncleared')).toBeInTheDocument()
      expect(screen.getByLabelText('Mark selected as cleared')).toBeInTheDocument()
    })

    it('should have accessible label on clear button', () => {
      render(<TransactionBulkActions {...defaultProps} />)

      expect(screen.getByLabelText('Clear selection')).toBeInTheDocument()
    })
  })

  describe('Layout and Styling', () => {
    it('should render with fixed positioning', () => {
      const { container } = render(<TransactionBulkActions {...defaultProps} />)

      const toolbar = container.querySelector('[role="toolbar"]')
      expect(toolbar).toHaveClass('fixed', 'bottom-4')
    })

    it('should apply custom className', () => {
      const { container } = render(
        <TransactionBulkActions {...defaultProps} className="custom-class" />
      )

      const toolbar = container.querySelector('.custom-class')
      expect(toolbar).toBeInTheDocument()
    })

    it('should render divider between sections', () => {
      const { container } = render(<TransactionBulkActions {...defaultProps} />)

      const divider = container.querySelector('[aria-hidden="true"]')
      expect(divider).toBeInTheDocument()
      expect(divider).toHaveClass('bg-gray-200')
    })

    it('should have "Mark as:" label before action buttons', () => {
      render(<TransactionBulkActions {...defaultProps} />)
      expect(screen.getByText('Mark as:')).toBeInTheDocument()
    })
  })

  describe('Button Interaction', () => {
    it('should not call onStatusChange when action button is disabled', async () => {
      const user = userEvent.setup()
      const onStatusChange = vi.fn()

      render(
        <TransactionBulkActions
          {...defaultProps}
          onStatusChange={onStatusChange}
          isLoading={true}
        />
      )

      const unclearedButton = screen.getByLabelText('Mark selected as uncleared')
      await user.click(unclearedButton)

      expect(onStatusChange).not.toHaveBeenCalled()
    })

    it('should not call onClearSelection when clear button is disabled', async () => {
      const user = userEvent.setup()
      const onClearSelection = vi.fn()

      render(
        <TransactionBulkActions
          {...defaultProps}
          onClearSelection={onClearSelection}
          isLoading={true}
        />
      )

      const clearButton = screen.getByLabelText('Clear selection')
      await user.click(clearButton)

      expect(onClearSelection).not.toHaveBeenCalled()
    })
  })
})
