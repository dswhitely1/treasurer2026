import { Router, type Router as RouterType } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requireOrgMembership, requireOrgRole } from '../middleware/organization.js'
import { validate } from '../middleware/validate.js'
import {
  statusChangeRequestSchema,
  bulkStatusChangeRequestSchema,
  transactionStatusParamSchema,
  accountStatusParamSchema,
} from '../schemas/transactionStatus.js'
import {
  changeStatus,
  bulkChangeStatus,
  getStatusHistory,
  getSummary,
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

export default router
