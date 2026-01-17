import { Router, type Router as RouterType } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requireOrgMembership } from '../middleware/organization.js'
import { validate } from '../middleware/validate.js'
import { orgIdParamSchema } from '../schemas/organization.js'
import { categoryQuerySchema } from '../schemas/category.js'
import { list } from '../controllers/categoryController.js'

const router: RouterType = Router({ mergeParams: true })

// All routes require authentication and organization membership
router.use(authenticate)

// Categories list - GET /organizations/:orgId/categories
router.get(
  '/',
  validate({ params: orgIdParamSchema, query: categoryQuerySchema }),
  requireOrgMembership(),
  list
)

export default router
