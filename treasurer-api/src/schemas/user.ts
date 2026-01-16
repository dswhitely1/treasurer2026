import { z } from 'zod'

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email('Invalid email address').optional(),
})

export const userIdSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
})

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

export type UpdateUserDto = z.infer<typeof updateUserSchema>
export type PaginationParams = z.infer<typeof paginationSchema>
