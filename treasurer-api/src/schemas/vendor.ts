import { z } from 'zod'

export const createVendorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
})

export const updateVendorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less').optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').nullable().optional(),
})

export const vendorIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
  vendorId: z.string().uuid('Invalid vendor ID'),
})

export const vendorQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export const vendorSearchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
})

export type CreateVendorDto = z.infer<typeof createVendorSchema>
export type UpdateVendorDto = z.infer<typeof updateVendorSchema>
export type VendorQueryDto = z.infer<typeof vendorQuerySchema>
export type VendorSearchDto = z.infer<typeof vendorSearchSchema>
