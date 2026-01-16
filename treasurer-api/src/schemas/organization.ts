import { z } from 'zod'

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
})

export const addMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
})

export const orgIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
})

export const memberParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
  userId: z.string().uuid('Invalid user ID'),
})

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>
export type AddMemberDto = z.infer<typeof addMemberSchema>
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>
