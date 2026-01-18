import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  parentId: z.string().uuid('Invalid parent category ID').nullable().optional(),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less').optional(),
  parentId: z.string().uuid('Invalid parent category ID').nullable().optional(),
})

export const categoryIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
  categoryId: z.string().uuid('Invalid category ID'),
})

export const categoryQuerySchema = z.object({
  search: z.string().optional(),
  parentId: z.string().uuid('Invalid parent category ID').optional(),
  includeDescendants: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
})

export const moveCategorySchema = z.object({
  newParentId: z.string().uuid('Invalid parent category ID').nullable(),
})

export const deleteCategorySchema = z.object({
  moveChildrenTo: z.string().uuid('Invalid category ID to move children to').nullable().optional(),
})

export type CreateCategoryDto = z.infer<typeof createCategorySchema>
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>
export type CategoryQueryDto = z.infer<typeof categoryQuerySchema>
export type MoveCategoryDto = z.infer<typeof moveCategorySchema>
export type DeleteCategoryDto = z.infer<typeof deleteCategorySchema>
