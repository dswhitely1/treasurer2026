import type { RequestHandler } from 'express'
import { AppError } from './errorHandler.js'
import { getMemberRole } from '../services/organizationService.js'
import type { OrganizationRole } from '../types/index.js'

declare global {
  namespace Express {
    interface Request {
      orgMembership?: {
        orgId: string
        role: OrganizationRole
      }
    }
  }
}

export const requireOrgMembership = (): RequestHandler => {
  return async (req, _res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401)
      }

      const orgId = req.params.orgId
      if (!orgId || Array.isArray(orgId)) {
        throw new AppError('Organization ID required', 400)
      }

      const role = await getMemberRole(req.user.id, orgId)
      if (!role) {
        throw new AppError('You are not a member of this organization', 403)
      }

      req.orgMembership = { orgId, role }
      next()
    } catch (error) {
      next(error)
    }
  }
}

export const requireOrgRole = (...allowedRoles: OrganizationRole[]): RequestHandler => {
  return async (req, _res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401)
      }

      const orgId = req.params.orgId
      if (!orgId || Array.isArray(orgId)) {
        throw new AppError('Organization ID required', 400)
      }

      const role = await getMemberRole(req.user.id, orgId)
      if (!role) {
        throw new AppError('You are not a member of this organization', 403)
      }

      if (!allowedRoles.includes(role)) {
        throw new AppError('Insufficient permissions', 403)
      }

      req.orgMembership = { orgId, role }
      next()
    } catch (error) {
      next(error)
    }
  }
}
