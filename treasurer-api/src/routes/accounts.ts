import { Router, type Router as RouterType } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requireOrgMembership, requireOrgRole } from '../middleware/organization.js'
import { validate } from '../middleware/validate.js'
import {
  createAccountSchema,
  updateAccountSchema,
  accountIdParamSchema,
} from '../schemas/account.js'
import { orgIdParamSchema } from '../schemas/organization.js'
import { create, list, get, update, remove } from '../controllers/accountController.js'
import transactionRouter from './transactions.js'
import transactionStatusRouter from './transactionStatus.js'

const router: RouterType = Router({ mergeParams: true })

// All routes require authentication and organization membership
router.use(authenticate)

// Account CRUD
router.post(
  '/',
  validate({ params: orgIdParamSchema, body: createAccountSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  create
)

router.get(
  '/',
  validate({ params: orgIdParamSchema }),
  requireOrgMembership(),
  list
)

router.get(
  '/:accountId',
  validate({ params: accountIdParamSchema }),
  requireOrgMembership(),
  get
)

router.patch(
  '/:accountId',
  validate({ params: accountIdParamSchema, body: updateAccountSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  update
)

router.delete(
  '/:accountId',
  validate({ params: accountIdParamSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  remove
)

// Transaction routes (nested under account)
// Status routes must come before general transaction routes to avoid route conflicts
router.use('/:accountId/transactions', transactionStatusRouter)
router.use('/:accountId/transactions', transactionRouter)

export default router
