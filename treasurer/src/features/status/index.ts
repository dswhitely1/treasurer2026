/**
 * Transaction Status Management Feature
 *
 * This module provides comprehensive transaction status management including:
 * - Status types (UNCLEARED, CLEARED, RECONCILED)
 * - RTK Query API for status operations
 * - UI components for status display and editing
 * - Bulk selection and operations
 * - Reconciliation workflow
 * - Status history tracking
 * - Keyboard shortcuts
 */

// Types
export * from './types'

// API
export {
  statusApi,
  useGetTransactionsWithStatusQuery,
  useChangeTransactionStatusMutation,
  useBulkChangeStatusMutation,
  useGetStatusHistoryQuery,
  useGetReconciliationSummaryQuery,
  useCompleteReconciliationMutation,
} from './api'

// Components
export {
  // Status components
  TransactionStatusBadge,
  TransactionStatusMenu,
  StatusFilterControls,
  // Bulk components
  BulkSelectionCheckbox,
  SelectAllCheckbox,
  TransactionBulkActions,
  // Reconciliation components
  BalanceComparison,
  ReconciliationSummaryDisplay,
  ReconciliationConfirmDialog,
  ReconciliationPanel,
  // History components
  StatusHistoryItem,
  StatusHistoryTimeline,
  StatusHistoryModal,
} from './components'

// Hooks
export {
  useTransactionStatus,
  useBulkSelection,
  useReconciliation,
  useStatusKeyboardShortcuts,
} from './hooks'
