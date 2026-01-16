import { Router, type Router as RouterType } from 'express'
import { authenticate } from '../middleware/auth.js'
import { requireOrgMembership, requireOrgRole } from '../middleware/organization.js'
import { validate } from '../middleware/validate.js'
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  orgIdParamSchema,
  memberParamSchema,
} from '../schemas/organization.js'
import {
  create,
  list,
  get,
  update,
  remove,
  listMembers,
  addMemberHandler,
  updateMemberRoleHandler,
  removeMemberHandler,
  leave,
  switchOrg,
} from '../controllers/organizationController.js'

const router: RouterType = Router()

// All routes require authentication
router.use(authenticate)

// Organization CRUD
router.post('/', validate({ body: createOrganizationSchema }), create)
router.get('/', list)
router.get('/:orgId', validate({ params: orgIdParamSchema }), requireOrgMembership(), get)
router.patch(
  '/:orgId',
  validate({ params: orgIdParamSchema, body: updateOrganizationSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  update
)
router.delete('/:orgId', validate({ params: orgIdParamSchema }), requireOrgRole('OWNER'), remove)

// Organization context
router.post('/:orgId/switch', validate({ params: orgIdParamSchema }), requireOrgMembership(), switchOrg)
router.delete('/:orgId/leave', validate({ params: orgIdParamSchema }), requireOrgMembership(), leave)

// Member management
router.get('/:orgId/members', validate({ params: orgIdParamSchema }), requireOrgMembership(), listMembers)
router.post(
  '/:orgId/members',
  validate({ params: orgIdParamSchema, body: addMemberSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  addMemberHandler
)
router.patch(
  '/:orgId/members/:userId',
  validate({ params: memberParamSchema, body: updateMemberRoleSchema }),
  requireOrgRole('OWNER'),
  updateMemberRoleHandler
)
router.delete(
  '/:orgId/members/:userId',
  validate({ params: memberParamSchema }),
  requireOrgRole('OWNER', 'ADMIN'),
  removeMemberHandler
)

export default router
