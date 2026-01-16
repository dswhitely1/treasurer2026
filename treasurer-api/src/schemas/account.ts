import { z } from 'zod'

export const accountTypeEnum = z.enum([
  'CHECKING',
  'SAVINGS',
  'CREDIT_CARD',
  'CASH',
  'INVESTMENT',
  'OTHER',
])

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  institution: z.string().max(100, 'Institution must be 100 characters or less').optional(),
  accountType: accountTypeEnum.optional().default('CHECKING'),
  balance: z.number().optional().default(0),
  currency: z.string().length(3, 'Currency must be a 3-letter code').optional().default('USD'),
})

export const updateAccountSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  institution: z.string().max(100, 'Institution must be 100 characters or less').optional(),
  accountType: accountTypeEnum.optional(),
  balance: z.number().optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter code').optional(),
  isActive: z.boolean().optional(),
})

export const accountIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
  accountId: z.string().uuid('Invalid account ID'),
})

export type CreateAccountDto = z.infer<typeof createAccountSchema>
export type UpdateAccountDto = z.infer<typeof updateAccountSchema>
export type AccountType = z.infer<typeof accountTypeEnum>
