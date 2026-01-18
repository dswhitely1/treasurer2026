import { Router, type Router as RouterType } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requireOrgMembership, requireOrgRole } from '../middleware/organization.js'
import { validate } from '../middleware/validate.js'
import { treeRateLimiter } from '../middleware/rateLimiter.js'
import { orgIdParamSchema } from '../schemas/organization.js'
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  categoryQuerySchema,
  moveCategorySchema,
  deleteCategorySchema,
} from '../schemas/category.js'
import { create, list, tree, get, update, move, remove } from '../controllers/categoryController.js'

const router: RouterType = Router({ mergeParams: true })

// All routes require authentication
router.use(authenticate)

// Category tree (must come before /:categoryId to avoid route conflicts)
router.get(
  '/tree',
  treeRateLimiter,
  validate({ params: orgIdParamSchema }),
  requireOrgMembership(),
  tree
)

// Category CRUD
router.post(
  '/',
  validate({ params: orgIdParamSchema, body: createCategorySchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  create
)

router.get(
  '/',
  validate({ params: orgIdParamSchema, query: categoryQuerySchema }),
  requireOrgMembership(),
  list
)

router.get(
  '/:categoryId',
  validate({ params: categoryIdParamSchema }),
  requireOrgMembership(),
  get
)

router.patch(
  '/:categoryId',
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  update
)

router.delete(
  '/:categoryId',
  validate({ params: categoryIdParamSchema, body: deleteCategorySchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  remove
)

// Category move operation
router.post(
  '/:categoryId/move',
  validate({ params: categoryIdParamSchema, body: moveCategorySchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  move
)

export default router
