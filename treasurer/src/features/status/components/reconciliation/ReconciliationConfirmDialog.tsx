/**
 * ReconciliationConfirmDialog Component
 *
 * Modal dialog for confirming and completing a reconciliation.
 * Collects statement balance and date, shows summary before confirming.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Input, Label } from '@/components/ui'
import type { ReconciliationConfirmDialogProps } from '../../types'
import { BalanceComparison } from './BalanceComparison'

/**
 * ReconciliationConfirmDialog provides a modal for completing reconciliation.
 *
 * Features:
 * - Statement balance input with validation
 * - Statement date picker
 * - Balance comparison display
 * - Warning if balances don't match
 * - Focus trap for accessibility
 * - Keyboard navigation (Escape to close)
 * - Loading state during submission
 */
export function ReconciliationConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  summary,
  selectedCount,
  isLoading = false,
}: ReconciliationConfirmDialogProps) {
  const [statementBalance, setStatementBalance] = useState('')
  const [statementDate, setStatementDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [error, setError] = useState<string | null>(null)

  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFocusRef = useRef<HTMLInputElement>(null)

  // Calculate difference
  const parsedBalance = parseFloat(statementBalance)
  const clearedBalance = summary?.clearedBalance ?? 0
  const difference = !isNaN(parsedBalance) ? parsedBalance - clearedBalance : 0
  const isBalanced = !isNaN(parsedBalance) && Math.abs(difference) < 0.01

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStatementBalance('')
      setStatementDate(new Date().toISOString().split('T')[0])
      setError(null)
      // Focus first input after animation
      setTimeout(() => firstFocusRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      // Focus trap
      if (e.key === 'Tab') {
        const focusableElements = dialogRef.current?.querySelectorAll(
          'button, input, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements?.[0] as HTMLElement
        const lastElement = focusableElements?.[
          focusableElements.length - 1
        ] as HTMLElement

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    },
    [isOpen, onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!statementBalance || isNaN(parsedBalance)) {
      setError('Please enter a valid statement balance')
      return
    }

    if (!statementDate) {
      setError('Please select a statement date')
      return
    }

    onConfirm(parsedBalance, statementDate)
  }

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow numbers, decimal point, and negative sign
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      setStatementBalance(value)
      setError(null)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reconciliation-dialog-title"
          >
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="mb-6">
                <h2
                  id="reconciliation-dialog-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  Complete Reconciliation
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Enter your bank statement details to reconcile{' '}
                  <span className="font-medium">{selectedCount}</span> cleared
                  transactions.
                </p>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Statement Balance */}
                <div>
                  <Label htmlFor="statement-balance">Statement Balance</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      ref={firstFocusRef}
                      id="statement-balance"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={statementBalance}
                      onChange={handleBalanceChange}
                      className="pl-7"
                      disabled={isLoading}
                      aria-describedby="balance-help"
                    />
                  </div>
                  <p id="balance-help" className="mt-1 text-xs text-gray-500">
                    Enter the ending balance from your bank statement
                  </p>
                </div>

                {/* Statement Date */}
                <div>
                  <Label htmlFor="statement-date">Statement Date</Label>
                  <Input
                    id="statement-date"
                    type="date"
                    value={statementDate}
                    onChange={(e) => setStatementDate(e.target.value)}
                    className="mt-1"
                    disabled={isLoading}
                  />
                </div>

                {/* Balance Comparison */}
                {statementBalance && !isNaN(parsedBalance) && (
                  <BalanceComparison
                    clearedBalance={clearedBalance}
                    statementBalance={parsedBalance}
                    difference={difference}
                  />
                )}

                {/* Warning for unbalanced */}
                {statementBalance && !isNaN(parsedBalance) && !isBalanced && (
                  <div
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                    role="alert"
                  >
                    <p className="text-sm text-amber-700">
                      <span className="font-medium">Warning:</span> The statement
                      balance does not match the cleared balance. You may still
                      proceed, but review the difference.
                    </p>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3" role="alert">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={!statementBalance || isNaN(parsedBalance)}
                >
                  Complete Reconciliation
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export type { ReconciliationConfirmDialogProps }
