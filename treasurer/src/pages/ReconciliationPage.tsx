/**
 * ReconciliationPage
 *
 * Page component for account reconciliation workflow.
 * Integrates the ReconciliationPanel with transaction list for clearing.
 */

import { useParams } from 'react-router-dom'
import { ReconciliationPanel } from '@/features/status'

/**
 * ReconciliationPage provides the full reconciliation interface.
 *
 * Features:
 * - Account summary with balances
 * - Statement balance/date entry
 * - Transaction list with selection
 * - Balance comparison
 * - Complete reconciliation workflow
 */
export function ReconciliationPage() {
  const { orgId, accountId } = useParams<{ orgId: string; accountId: string }>()

  if (!orgId || !accountId) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">Missing organization or account ID</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <ReconciliationPanel orgId={orgId} accountId={accountId} />
    </div>
  )
}

export default ReconciliationPage
