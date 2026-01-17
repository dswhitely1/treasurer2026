import { Router, type Router as RouterType } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requireOrgMembership, requireOrgRole } from '../middleware/organization.js'
import { validate } from '../middleware/validate.js'
import { preventReconciledModification } from '../middleware/transactionProtection.js'
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionIdParamSchema,
  accountTransactionParamSchema,
  transactionQuerySchema,
} from '../schemas/transaction.js'
import { create, list, get, update, remove } from '../controllers/transactionController.js'

const router: RouterType = Router({ mergeParams: true })

// All routes require authentication
router.use(authenticate)

// Transaction CRUD - nested under /organizations/:orgId/accounts/:accountId/transactions
router.post(
  '/',
  validate({ params: accountTransactionParamSchema, body: createTransactionSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  create
)

router.get(
  '/',
  validate({ params: accountTransactionParamSchema, query: transactionQuerySchema }),
  requireOrgMembership(),
  list
)

router.get(
  '/:transactionId',
  validate({ params: transactionIdParamSchema }),
  requireOrgMembership(),
  get
)

router.patch(
  '/:transactionId',
  validate({ params: transactionIdParamSchema, body: updateTransactionSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  preventReconciledModification(),
  update
)

router.delete(
  '/:transactionId',
  validate({ params: transactionIdParamSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  preventReconciledModification(),
  remove
)

export default router
