/**
 * ReconciliationSummaryDisplay Component
 *
 * Displays the current reconciliation summary for an account,
 * including balance breakdowns by status.
 */

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import type { ReconciliationSummaryDisplayProps } from '../../types'

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
 * Format a date string.
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Loading skeleton for the summary.
 */
function SummarySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 rounded bg-gray-200" />
            <div className="h-6 w-24 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="h-24 rounded-lg bg-gray-100" />
    </div>
  )
}

/**
 * ReconciliationSummaryDisplay shows the account reconciliation state.
 *
 * Features:
 * - Current, cleared, and reconciled balances
 * - Transaction counts by status
 * - Last reconciliation info
 * - Balance breakdown by status
 * - Loading skeleton state
 */
export function ReconciliationSummaryDisplay({
  summary,
  isLoading = false,
  className = '',
}: ReconciliationSummaryDisplayProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Reconciliation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <SummarySkeleton />
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Reconciliation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No summary available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Reconciliation Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Balance Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Current Balance */}
            <div>
              <p className="text-sm font-medium text-gray-500">Current Balance</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {formatCurrency(summary.currentBalance)}
              </p>
            </div>

            {/* Cleared Balance */}
            <div>
              <p className="text-sm font-medium text-gray-500">Cleared Balance</p>
              <p className="mt-1 text-lg font-semibold text-blue-600">
                {formatCurrency(summary.clearedBalance)}
              </p>
            </div>

            {/* Reconciled Balance */}
            <div>
              <p className="text-sm font-medium text-gray-500">Reconciled Balance</p>
              <p className="mt-1 text-lg font-semibold text-green-600">
                {formatCurrency(summary.reconciledBalance)}
              </p>
            </div>

            {/* Uncleared Balance */}
            <div>
              <p className="text-sm font-medium text-gray-500">Uncleared Balance</p>
              <p className="mt-1 text-lg font-semibold text-gray-600">
                {formatCurrency(summary.unclearedBalance)}
              </p>
            </div>
          </div>

          {/* Transaction Counts */}
          <div className="rounded-lg bg-gray-50 p-4">
            <h4 className="mb-3 text-sm font-medium text-gray-700">
              Transaction Counts
            </h4>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-gray-400" />
                <span className="text-sm text-gray-600">
                  {summary.pendingTransactionCount} Uncleared
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-sm text-gray-600">
                  {summary.clearedTransactionCount} Cleared
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-green-400" />
                <span className="text-sm text-gray-600">
                  {summary.reconciledTransactionCount} Reconciled
                </span>
              </div>
            </div>
          </div>

          {/* Balance by Status */}
          {summary.balancesByStatus.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-medium text-gray-700">
                Balance Breakdown
              </h4>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        Count
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        Income
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        Expense
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        Net
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {summary.balancesByStatus.map((balance) => (
                      <tr key={balance.status}>
                        <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-900">
                          {balance.status}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right text-sm text-gray-500">
                          {balance.count}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right text-sm text-green-600">
                          {formatCurrency(balance.income)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right text-sm text-red-600">
                          {formatCurrency(balance.expense)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-2 text-right text-sm font-medium ${
                            balance.net >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(balance.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Last Reconciled Info */}
          {summary.lastReconciledAt && (
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-sm text-green-700">
                <span className="font-medium">Last Reconciled:</span>{' '}
                {formatDate(summary.lastReconciledAt)}
                {summary.lastReconciledBy && (
                  <>
                    {' by '}
                    <span className="font-medium">
                      {summary.lastReconciledBy.name || summary.lastReconciledBy.email}
                    </span>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export type { ReconciliationSummaryDisplayProps }
