import { z } from 'zod'

export const categoryQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
})

export type CategoryQueryDto = z.infer<typeof categoryQuerySchema>
