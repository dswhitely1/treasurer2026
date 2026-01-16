import type { RequestHandler } from 'express'
import {
  createOrganization,
  getUserOrganizations,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationMembers,
  addMember,
  updateMemberRole,
  removeMember,
  leaveOrganization,
  switchOrganization,
} from '../services/organizationService.js'
import { sendSuccess } from '../utils/response.js'
import type {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  AddMemberDto,
  UpdateMemberRoleDto,
} from '../schemas/organization.js'

export const create: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as CreateOrganizationDto
    const result = await createOrganization(req.user!.id, data)
    sendSuccess(res, result, 'Organization created successfully', 201)
  } catch (error) {
    next(error)
  }
}

export const list: RequestHandler = async (req, res, next) => {
  try {
    const organizations = await getUserOrganizations(req.user!.id)
    sendSuccess(res, { organizations })
  } catch (error) {
    next(error)
  }
}

export const get: RequestHandler = async (req, res, next) => {
  try {
    const org = await getOrganization(req.params.orgId as string)
    sendSuccess(res, {
      organization: {
        id: org.id,
        name: org.name,
        role: req.orgMembership!.role,
        createdAt: org.createdAt.toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}

export const update: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as UpdateOrganizationDto
    const org = await updateOrganization(req.params.orgId as string, data)
    sendSuccess(res, {
      organization: { id: org.id, name: org.name },
    }, 'Organization updated successfully')
  } catch (error) {
    next(error)
  }
}

export const remove: RequestHandler = async (req, res, next) => {
  try {
    await deleteOrganization(req.params.orgId as string)
    sendSuccess(res, null, 'Organization deleted successfully')
  } catch (error) {
    next(error)
  }
}

export const listMembers: RequestHandler = async (req, res, next) => {
  try {
    const members = await getOrganizationMembers(req.params.orgId as string)
    sendSuccess(res, { members })
  } catch (error) {
    next(error)
  }
}

export const addMemberHandler: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as AddMemberDto
    const member = await addMember(req.params.orgId as string, data.email)
    sendSuccess(res, { member }, 'Member added successfully', 201)
  } catch (error) {
    next(error)
  }
}

export const updateMemberRoleHandler: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as UpdateMemberRoleDto
    await updateMemberRole(req.params.orgId as string, req.params.userId as string, data.role)
    sendSuccess(res, null, 'Member role updated successfully')
  } catch (error) {
    next(error)
  }
}

export const removeMemberHandler: RequestHandler = async (req, res, next) => {
  try {
    await removeMember(req.params.orgId as string, req.params.userId as string)
    sendSuccess(res, null, 'Member removed successfully')
  } catch (error) {
    next(error)
  }
}

export const leave: RequestHandler = async (req, res, next) => {
  try {
    await leaveOrganization(req.user!.id, req.params.orgId as string)
    sendSuccess(res, null, 'Successfully left organization')
  } catch (error) {
    next(error)
  }
}

export const switchOrg: RequestHandler = async (req, res, next) => {
  try {
    await switchOrganization(req.user!.id, req.params.orgId as string)
    sendSuccess(res, null, 'Switched organization successfully')
  } catch (error) {
    next(error)
  }
}
