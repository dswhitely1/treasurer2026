/**
 * BalanceComparison Component
 *
 * Displays the comparison between cleared balance and statement balance
 * during reconciliation, highlighting the difference.
 */

import type { BalanceComparisonProps } from '../../types'

/**
 * Format a number as currency.
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * BalanceComparison shows the difference between balances during reconciliation.
 *
 * Features:
 * - Shows cleared balance from transactions
 * - Shows statement balance (user-entered)
 * - Calculates and displays difference
 * - Color-coded difference (green = match, red = mismatch)
 * - Accessible with proper ARIA labels
 */
export function BalanceComparison({
  clearedBalance,
  statementBalance,
  difference,
  className = '',
}: BalanceComparisonProps) {
  const hasStatementBalance = statementBalance !== null
  const isBalanced = Math.abs(difference) < 0.01 // Account for floating point
  const absoluteDifference = Math.abs(difference)

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-gray-50 p-4 ${className}`}
      role="region"
      aria-label="Balance comparison"
    >
      <h3 className="mb-4 text-sm font-semibold text-gray-700">
        Balance Comparison
      </h3>

      <div className="space-y-3">
        {/* Cleared Balance */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Cleared Balance</span>
          <span className="font-mono text-sm font-medium text-gray-900">
            {formatCurrency(clearedBalance)}
          </span>
        </div>

        {/* Statement Balance */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Statement Balance</span>
          <span className="font-mono text-sm font-medium text-gray-900">
            {hasStatementBalance ? formatCurrency(statementBalance) : '--'}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" aria-hidden="true" />

        {/* Difference */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Difference</span>
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-sm font-bold ${
                !hasStatementBalance
                  ? 'text-gray-400'
                  : isBalanced
                    ? 'text-green-600'
                    : 'text-red-600'
              }`}
              aria-live="polite"
            >
              {hasStatementBalance
                ? difference >= 0
                  ? `+${formatCurrency(absoluteDifference)}`
                  : `-${formatCurrency(absoluteDifference)}`
                : '--'}
            </span>
            {hasStatementBalance && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  isBalanced
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {isBalanced ? 'Balanced' : 'Unbalanced'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Help text */}
      {hasStatementBalance && !isBalanced && (
        <p className="mt-4 text-xs text-gray-500">
          The difference should be $0.00 before completing reconciliation.
          Review cleared transactions or update the statement balance.
        </p>
      )}

      {!hasStatementBalance && (
        <p className="mt-4 text-xs text-gray-500">
          Enter your bank statement balance to begin reconciliation.
        </p>
      )}
    </div>
  )
}

export type { BalanceComparisonProps }
