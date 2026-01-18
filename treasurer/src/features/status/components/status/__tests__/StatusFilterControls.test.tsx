/**
 * Tests for StatusFilterControls component
 *
 * Covers:
 * - Rendering filter checkboxes
 * - Toggling filters
 * - Transaction counts
 * - Show all button
 * - No statuses selected warning
 * - Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatusFilterControls } from '../StatusFilterControls'
import type { StatusFilterState, TransactionStatus } from '../../../types'

describe('StatusFilterControls', () => {
  const defaultFilters: StatusFilterState = {
    uncleared: true,
    cleared: true,
    reconciled: true,
  }

  const defaultProps = {
    filters: defaultFilters,
    onFilterChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all status checkboxes', () => {
      render(<StatusFilterControls {...defaultProps} />)

      expect(screen.getByLabelText(/Uncleared/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^Cleared/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Reconciled/i)).toBeInTheDocument()
    })

    it('should render with proper ARIA group label', () => {
      render(<StatusFilterControls {...defaultProps} />)

      const group = screen.getByRole('group', {
        name: 'Filter transactions by status',
      })
      expect(group).toBeInTheDocument()
    })

    it('should render Status label', () => {
      render(<StatusFilterControls {...defaultProps} />)
      expect(screen.getByText('Status:')).toBeInTheDocument()
    })
  })

  describe('Filter State', () => {
    it('should check all checkboxes when all filters are true', () => {
      render(<StatusFilterControls {...defaultProps} />)

      expect(screen.getByLabelText(/Uncleared/i)).toBeChecked()
      expect(screen.getByLabelText(/^Cleared/i)).toBeChecked()
      expect(screen.getByLabelText(/Reconciled/i)).toBeChecked()
    })

    it('should reflect partial filter state', () => {
      const filters: StatusFilterState = {
        uncleared: true,
        cleared: false,
        reconciled: true,
      }

      render(<StatusFilterControls {...defaultProps} filters={filters} />)

      expect(screen.getByLabelText(/Uncleared/i)).toBeChecked()
      expect(screen.getByLabelText(/^Cleared/i)).not.toBeChecked()
      expect(screen.getByLabelText(/Reconciled/i)).toBeChecked()
    })

    it('should uncheck all when all filters are false', () => {
      const filters: StatusFilterState = {
        uncleared: false,
        cleared: false,
        reconciled: false,
      }

      render(<StatusFilterControls {...defaultProps} filters={filters} />)

      expect(screen.getByLabelText(/Uncleared/i)).not.toBeChecked()
      expect(screen.getByLabelText(/^Cleared/i)).not.toBeChecked()
      expect(screen.getByLabelText(/Reconciled/i)).not.toBeChecked()
    })
  })

  describe('Filter Interaction', () => {
    it('should call onFilterChange when toggling uncleared', async () => {
      const user = userEvent.setup()
      const onFilterChange = vi.fn()

      render(<StatusFilterControls {...defaultProps} onFilterChange={onFilterChange} />)

      const checkbox = screen.getByLabelText(/Uncleared/i)
      await user.click(checkbox)

      expect(onFilterChange).toHaveBeenCalledWith({
        uncleared: false,
        cleared: true,
        reconciled: true,
      })
    })

    it('should call onFilterChange when toggling cleared', async () => {
      const user = userEvent.setup()
      const onFilterChange = vi.fn()

      render(<StatusFilterControls {...defaultProps} onFilterChange={onFilterChange} />)

      const checkbox = screen.getByLabelText(/^Cleared/i)
      await user.click(checkbox)

      expect(onFilterChange).toHaveBeenCalledWith({
        uncleared: true,
        cleared: false,
        reconciled: true,
      })
    })

    it('should call onFilterChange when toggling reconciled', async () => {
      const user = userEvent.setup()
      const onFilterChange = vi.fn()

      render(<StatusFilterControls {...defaultProps} onFilterChange={onFilterChange} />)

      const checkbox = screen.getByLabelText(/Reconciled/i)
      await user.click(checkbox)

      expect(onFilterChange).toHaveBeenCalledWith({
        uncleared: true,
        cleared: true,
        reconciled: false,
      })
    })
  })

  describe('Transaction Counts', () => {
    it('should display transaction counts when provided', () => {
      const counts: Record<TransactionStatus, number> = {
        UNCLEARED: 5,
        CLEARED: 10,
        RECONCILED: 3,
      }

      render(<StatusFilterControls {...defaultProps} counts={counts} />)

      expect(screen.getByText('(5)')).toBeInTheDocument()
      expect(screen.getByText('(10)')).toBeInTheDocument()
      expect(screen.getByText('(3)')).toBeInTheDocument()
    })

    it('should not display counts when not provided', () => {
      const { container } = render(<StatusFilterControls {...defaultProps} />)

      const countElements = container.querySelectorAll('[id$="-count"]')
      expect(countElements).toHaveLength(0)
    })

    it('should display zero counts', () => {
      const counts: Record<TransactionStatus, number> = {
        UNCLEARED: 0,
        CLEARED: 0,
        RECONCILED: 0,
      }

      render(<StatusFilterControls {...defaultProps} counts={counts} />)

      const zeroElements = screen.getAllByText('(0)')
      expect(zeroElements).toHaveLength(3)
    })
  })

  describe('Show All Button', () => {
    it('should not show "Show all" when all filters are active', () => {
      render(<StatusFilterControls {...defaultProps} />)

      expect(screen.queryByText('Show all')).not.toBeInTheDocument()
    })

    it('should show "Show all" when some filters are inactive', () => {
      const filters: StatusFilterState = {
        uncleared: true,
        cleared: false,
        reconciled: true,
      }

      render(<StatusFilterControls {...defaultProps} filters={filters} />)

      expect(screen.getByText('Show all')).toBeInTheDocument()
    })

    it('should show "Show all" when all filters are inactive', () => {
      const filters: StatusFilterState = {
        uncleared: false,
        cleared: false,
        reconciled: false,
      }

      render(<StatusFilterControls {...defaultProps} filters={filters} />)

      expect(screen.getByText('Show all')).toBeInTheDocument()
    })

    it('should call onFilterChange with all true when clicking "Show all"', async () => {
      const user = userEvent.setup()
      const onFilterChange = vi.fn()
      const filters: StatusFilterState = {
        uncleared: true,
        cleared: false,
        reconciled: false,
      }

      render(
        <StatusFilterControls
          {...defaultProps}
          filters={filters}
          onFilterChange={onFilterChange}
        />
      )

      const showAllButton = screen.getByText('Show all')
      await user.click(showAllButton)

      expect(onFilterChange).toHaveBeenCalledWith({
        uncleared: true,
        cleared: true,
        reconciled: true,
      })
    })
  })

  describe('No Statuses Selected Warning', () => {
    it('should show warning when no filters are active', () => {
      const filters: StatusFilterState = {
        uncleared: false,
        cleared: false,
        reconciled: false,
      }

      render(<StatusFilterControls {...defaultProps} filters={filters} />)

      const warning = screen.getByRole('alert')
      expect(warning).toHaveTextContent('No statuses selected')
    })

    it('should not show warning when at least one filter is active', () => {
      const filters: StatusFilterState = {
        uncleared: true,
        cleared: false,
        reconciled: false,
      }

      render(<StatusFilterControls {...defaultProps} filters={filters} />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('should not show warning when all filters are active', () => {
      render(<StatusFilterControls {...defaultProps} />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('should disable all checkboxes when disabled', () => {
      render(<StatusFilterControls {...defaultProps} disabled={true} />)

      expect(screen.getByLabelText(/Uncleared/i)).toBeDisabled()
      expect(screen.getByLabelText(/^Cleared/i)).toBeDisabled()
      expect(screen.getByLabelText(/Reconciled/i)).toBeDisabled()
    })

    it('should disable "Show all" button when disabled', () => {
      const filters: StatusFilterState = {
        uncleared: true,
        cleared: false,
        reconciled: false,
      }

      render(<StatusFilterControls {...defaultProps} filters={filters} disabled={true} />)

      const showAllButton = screen.getByText('Show all')
      expect(showAllButton).toBeDisabled()
    })

    it('should not trigger onFilterChange when disabled and clicked', async () => {
      const user = userEvent.setup()
      const onFilterChange = vi.fn()

      render(
        <StatusFilterControls {...defaultProps} onFilterChange={onFilterChange} disabled={true} />
      )

      const checkbox = screen.getByLabelText(/Uncleared/i)
      await user.click(checkbox)

      expect(onFilterChange).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper checkbox labels', () => {
      render(<StatusFilterControls {...defaultProps} />)

      expect(screen.getByLabelText(/Uncleared/i)).toHaveAttribute('type', 'checkbox')
      expect(screen.getByLabelText(/^Cleared/i)).toHaveAttribute('type', 'checkbox')
      expect(screen.getByLabelText(/Reconciled/i)).toHaveAttribute('type', 'checkbox')
    })

    it('should associate counts with checkboxes via aria-describedby', () => {
      const counts: Record<TransactionStatus, number> = {
        UNCLEARED: 5,
        CLEARED: 10,
        RECONCILED: 3,
      }

      render(<StatusFilterControls {...defaultProps} counts={counts} />)

      const unclearedCheckbox = screen.getByLabelText(/Uncleared/i)
      expect(unclearedCheckbox).toHaveAttribute(
        'aria-describedby',
        'status-filter-uncleared-count'
      )
    })

    it('should have accessible "Show all" button', () => {
      const filters: StatusFilterState = {
        uncleared: true,
        cleared: false,
        reconciled: false,
      }

      render(<StatusFilterControls {...defaultProps} filters={filters} />)

      const showAllButton = screen.getByLabelText('Show all transactions')
      expect(showAllButton).toBeInTheDocument()
    })
  })

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <StatusFilterControls {...defaultProps} className="custom-class" />
      )

      const group = container.querySelector('.custom-class')
      expect(group).toBeInTheDocument()
    })
  })
})
