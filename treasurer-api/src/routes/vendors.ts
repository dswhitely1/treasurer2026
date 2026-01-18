import { Router, type Router as RouterType } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requireOrgMembership, requireOrgRole } from '../middleware/organization.js'
import { validate } from '../middleware/validate.js'
import { searchRateLimiter } from '../middleware/rateLimiter.js'
import {
  createVendorSchema,
  updateVendorSchema,
  vendorIdParamSchema,
  vendorQuerySchema,
  vendorSearchSchema,
} from '../schemas/vendor.js'
import { orgIdParamSchema } from '../schemas/organization.js'
import { create, list, search, get, update, remove } from '../controllers/vendorController.js'

const router: RouterType = Router({ mergeParams: true })

// All routes require authentication
router.use(authenticate)

// Vendor search (must come before /:vendorId to avoid route conflicts)
router.get(
  '/search',
  searchRateLimiter,
  validate({ params: orgIdParamSchema, query: vendorSearchSchema }),
  requireOrgMembership(),
  search
)

// Vendor CRUD
router.post(
  '/',
  validate({ params: orgIdParamSchema, body: createVendorSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  create
)

router.get(
  '/',
  validate({ params: orgIdParamSchema, query: vendorQuerySchema }),
  requireOrgMembership(),
  list
)

router.get(
  '/:vendorId',
  validate({ params: vendorIdParamSchema }),
  requireOrgMembership(),
  get
)

router.patch(
  '/:vendorId',
  validate({ params: vendorIdParamSchema, body: updateVendorSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  update
)

router.delete(
  '/:vendorId',
  validate({ params: vendorIdParamSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  remove
)

export default router
