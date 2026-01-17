/**
 * Transaction Status Management Type Definitions
 *
 * This module defines all types related to transaction status management,
 * including status types, history entries, reconciliation summaries,
 * and component props.
 */

import type { AccountTransaction } from '@/types'

/**
 * Possible transaction statuses for reconciliation tracking.
 * - UNCLEARED: Transaction not yet verified against bank statement
 * - CLEARED: Transaction verified against bank statement
 * - RECONCILED: Transaction included in a completed reconciliation
 */
export type TransactionStatus = 'UNCLEARED' | 'CLEARED' | 'RECONCILED'

/**
 * Status display configuration for UI rendering.
 */
export interface StatusDisplayConfig {
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: 'circle' | 'check' | 'check-double'
}

/**
 * Extended transaction interface with status field.
 */
export interface TransactionWithStatus extends AccountTransaction {
  status: TransactionStatus
  statusChangedAt?: string
  statusChangedBy?: string
}

/**
 * Request payload for changing a single transaction's status.
 */
export interface StatusChangeRequest {
  status: TransactionStatus
  notes?: string
}

/**
 * Request payload for bulk status changes.
 */
export interface BulkStatusChangeRequest {
  transactionIds: string[]
  status: TransactionStatus
  notes?: string
}

/**
 * Response from a status change operation.
 */
export interface StatusChangeResponse {
  success: boolean
  transaction: TransactionWithStatus
  message?: string
}

/**
 * Response from a bulk status change operation.
 */
export interface BulkStatusChangeResponse {
  success: boolean
  updatedCount: number
  transactions: TransactionWithStatus[]
  errors?: Array<{
    transactionId: string
    error: string
  }>
}

/**
 * Represents a single entry in the status change history.
 */
export interface StatusHistoryEntry {
  id: string
  transactionId: string
  previousStatus: TransactionStatus | null
  newStatus: TransactionStatus
  changedAt: string
  changedBy: {
    id: string
    name: string
    email: string
  }
  notes?: string
}

/**
 * Response from fetching status history.
 */
export interface StatusHistoryResponse {
  success: boolean
  data: {
    history: StatusHistoryEntry[]
    total: number
  }
}

/**
 * Balance breakdown by status for reconciliation.
 */
export interface StatusBalance {
  status: TransactionStatus
  count: number
  income: number
  expense: number
  net: number
}

/**
 * Summary of account reconciliation state.
 */
export interface ReconciliationSummary {
  accountId: string
  accountName: string
  currentBalance: number
  clearedBalance: number
  reconciledBalance: number
  unclearedBalance: number
  pendingTransactionCount: number
  clearedTransactionCount: number
  reconciledTransactionCount: number
  lastReconciledAt?: string
  lastReconciledBy?: {
    id: string
    name: string
    email: string
  }
  balancesByStatus: StatusBalance[]
  difference: number
}

/**
 * Response from fetching reconciliation summary.
 */
export interface ReconciliationSummaryResponse {
  success: boolean
  data: ReconciliationSummary
}

/**
 * Request to complete a reconciliation.
 */
export interface CompleteReconciliationRequest {
  orgId: string
  accountId: string
  statementBalance: number
  statementDate: string
  transactionIds: string[]
  notes?: string
}

/**
 * Response from completing a reconciliation.
 */
export interface CompleteReconciliationResponse {
  success: boolean
  reconciledCount: number
  reconciledAt: string
  message: string
}

// =============================================================================
// Filter State Types
// =============================================================================

/**
 * Status filter state for transaction lists.
 */
export interface StatusFilterState {
  uncleared: boolean
  cleared: boolean
  reconciled: boolean
}

/**
 * Active status filters (for URL/query params).
 */
export type ActiveStatusFilters = TransactionStatus[]

// =============================================================================
// Bulk Selection State Types
// =============================================================================

/**
 * Bulk selection state for transaction lists.
 */
export interface BulkSelectionState {
  selectedIds: Set<string>
  isSelectAllMode: boolean
  excludedIds: Set<string>
}

/**
 * Selection mode for bulk operations.
 */
export type SelectionMode = 'none' | 'some' | 'all'

// =============================================================================
// Component Props Interfaces
// =============================================================================

/**
 * Props for TransactionStatusBadge component.
 */
export interface TransactionStatusBadgeProps {
  status: TransactionStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  interactive?: boolean
  onClick?: () => void
  className?: string
}

/**
 * Props for TransactionStatusMenu component.
 */
export interface TransactionStatusMenuProps {
  transactionId: string
  currentStatus: TransactionStatus
  onStatusChange: (newStatus: TransactionStatus) => void
  disabled?: boolean
  isLoading?: boolean
  className?: string
}

/**
 * Props for StatusFilterControls component.
 */
export interface StatusFilterControlsProps {
  filters: StatusFilterState
  onFilterChange: (filters: StatusFilterState) => void
  counts?: Record<TransactionStatus, number>
  disabled?: boolean
  className?: string
}

/**
 * Props for TransactionBulkActions component.
 */
export interface TransactionBulkActionsProps {
  selectedCount: number
  onStatusChange: (status: TransactionStatus) => void
  onClearSelection: () => void
  isLoading?: boolean
  className?: string
}

/**
 * Props for BulkSelectionCheckbox component.
 */
export interface BulkSelectionCheckboxProps {
  transactionId: string
  isSelected: boolean
  onToggle: (transactionId: string) => void
  disabled?: boolean
  className?: string
}

/**
 * Props for SelectAllCheckbox component.
 */
export interface SelectAllCheckboxProps {
  selectionMode: SelectionMode
  onToggle: () => void
  disabled?: boolean
  totalCount?: number
  selectedCount?: number
  className?: string
}

/**
 * Props for ReconciliationPanel component.
 */
export interface ReconciliationPanelProps {
  orgId: string
  accountId: string
  className?: string
}

/**
 * Props for ReconciliationSummaryDisplay component.
 */
export interface ReconciliationSummaryDisplayProps {
  summary: ReconciliationSummary | null
  isLoading?: boolean
  className?: string
}

/**
 * Props for ReconciliationConfirmDialog component.
 */
export interface ReconciliationConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (statementBalance: number, statementDate: string) => void
  summary: ReconciliationSummary | null
  selectedCount: number
  isLoading?: boolean
}

/**
 * Props for BalanceComparison component.
 */
export interface BalanceComparisonProps {
  clearedBalance: number
  statementBalance: number | null
  difference: number
  className?: string
}

/**
 * Props for StatusHistoryModal component.
 */
export interface StatusHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  orgId: string
  accountId: string
  transactionId: string
  transactionDescription?: string
}

/**
 * Props for StatusHistoryTimeline component.
 */
export interface StatusHistoryTimelineProps {
  history: StatusHistoryEntry[]
  isLoading?: boolean
  className?: string
}

/**
 * Props for StatusHistoryItem component.
 */
export interface StatusHistoryItemProps {
  entry: StatusHistoryEntry
  isFirst?: boolean
  isLast?: boolean
  className?: string
}

// =============================================================================
// Redux State Types
// =============================================================================

/**
 * Status-related state for the transaction slice.
 */
export interface TransactionStatusState {
  /** Current status filter selections */
  statusFilter: StatusFilterState
  /** Bulk selection state */
  bulkSelection: BulkSelectionState
  /** Reconciliation workflow state */
  reconciliation: {
    isActive: boolean
    statementBalance: number | null
    statementDate: string | null
  }
  /** Pending optimistic status changes (for rollback) */
  pendingStatusChanges: Map<string, {
    previousStatus: TransactionStatus
    newStatus: TransactionStatus
    timestamp: number
  }>
}

/**
 * Initial status state values.
 */
export const initialStatusState: TransactionStatusState = {
  statusFilter: {
    uncleared: true,
    cleared: true,
    reconciled: true,
  },
  bulkSelection: {
    selectedIds: new Set(),
    isSelectAllMode: false,
    excludedIds: new Set(),
  },
  reconciliation: {
    isActive: false,
    statementBalance: null,
    statementDate: null,
  },
  pendingStatusChanges: new Map(),
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Status transition validation - defines valid status transitions.
 */
export type ValidStatusTransition = {
  from: TransactionStatus
  to: TransactionStatus[]
}

/**
 * Valid status transitions map.
 */
export const VALID_STATUS_TRANSITIONS: ValidStatusTransition[] = [
  { from: 'UNCLEARED', to: ['CLEARED'] },
  { from: 'CLEARED', to: ['UNCLEARED', 'RECONCILED'] },
  { from: 'RECONCILED', to: [] }, // RECONCILED is terminal - no outbound transitions
]

/**
 * Check if a status transition is valid.
 */
export function isValidTransition(
  from: TransactionStatus,
  to: TransactionStatus
): boolean {
  const transition = VALID_STATUS_TRANSITIONS.find((t) => t.from === from)
  return transition ? transition.to.includes(to) : false
}

/**
 * Get valid next statuses for a given status.
 */
export function getValidNextStatuses(
  currentStatus: TransactionStatus
): TransactionStatus[] {
  const transition = VALID_STATUS_TRANSITIONS.find(
    (t) => t.from === currentStatus
  )
  return transition ? transition.to : []
}

/**
 * Status display configuration map.
 */
export const STATUS_DISPLAY_CONFIG: Record<TransactionStatus, StatusDisplayConfig> = {
  UNCLEARED: {
    label: 'Uncleared',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: 'circle',
  },
  CLEARED: {
    label: 'Cleared',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    icon: 'check',
  },
  RECONCILED: {
    label: 'Reconciled',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    icon: 'check-double',
  },
}
