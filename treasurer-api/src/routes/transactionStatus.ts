import { Router, type Router as RouterType } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requireOrgMembership, requireOrgRole } from '../middleware/organization.js'
import { validate } from '../middleware/validate.js'
import {
  statusChangeRequestSchema,
  bulkStatusChangeRequestSchema,
  transactionStatusParamSchema,
  accountStatusParamSchema,
  completeReconciliationRequestSchema,
} from '../schemas/transactionStatus.js'
import {
  changeStatus,
  bulkChangeStatus,
  getStatusHistory,
  getSummary,
  completeReconciliation,
} from '../controllers/transactionStatusController.js'

const router: RouterType = Router({ mergeParams: true })

// All routes require authentication
router.use(authenticate)

// Change single transaction status
router.patch(
  '/:transactionId/status',
  validate({ params: transactionStatusParamSchema, body: statusChangeRequestSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  changeStatus
)

// Get transaction status history
router.get(
  '/:transactionId/status/history',
  validate({ params: transactionStatusParamSchema }),
  requireOrgMembership(),
  getStatusHistory
)

// Bulk change transaction status
router.post(
  '/status/bulk',
  validate({ params: accountStatusParamSchema, body: bulkStatusChangeRequestSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  bulkChangeStatus
)

// Get reconciliation summary for account
router.get(
  '/status/summary',
  validate({ params: accountStatusParamSchema }),
  requireOrgMembership(),
  getSummary
)

// Complete reconciliation - mark selected transactions as RECONCILED
router.post(
  '/status/reconcile',
  validate({ params: accountStatusParamSchema, body: completeReconciliationRequestSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  completeReconciliation
)

export default router
