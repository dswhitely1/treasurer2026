import { z } from 'zod'

export const transactionTypeEnum = z.enum(['INCOME', 'EXPENSE', 'TRANSFER'])

export const transactionSplitSchema = z.object({
  amount: z.number().positive('Split amount must be positive'),
  categoryName: z.string().min(1, 'Category name is required').max(100, 'Category name must be 100 characters or less'),
})

export const createTransactionSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500, 'Description must be 500 characters or less'),
  amount: z.number().positive('Amount must be positive'),
  transactionType: transactionTypeEnum.optional().default('EXPENSE'),
  date: z.string().datetime({ offset: true }).optional(),
  applyFee: z.boolean().optional().default(false),
  destinationAccountId: z.string().uuid('Invalid destination account ID').optional(),
  splits: z.array(transactionSplitSchema).min(1, 'At least one category split is required'),
}).refine(
  (data) => {
    const splitsTotal = data.splits.reduce((sum, split) => sum + split.amount, 0)
    // Allow small floating point differences
    return Math.abs(splitsTotal - data.amount) < 0.01
  },
  {
    message: 'Split amounts must equal the transaction amount',
    path: ['splits'],
  }
).refine(
  (data) => {
    // Destination account is required for TRANSFER transactions
    if (data.transactionType === 'TRANSFER') {
      return !!data.destinationAccountId
    }
    return true
  },
  {
    message: 'Destination account is required for transfer transactions',
    path: ['destinationAccountId'],
  }
).refine(
  (data) => {
    // Destination account should not be provided for non-TRANSFER transactions
    if (data.transactionType !== 'TRANSFER' && data.destinationAccountId) {
      return false
    }
    return true
  },
  {
    message: 'Destination account should only be provided for transfer transactions',
    path: ['destinationAccountId'],
  }
)

export const updateTransactionSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500, 'Description must be 500 characters or less').optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  transactionType: transactionTypeEnum.optional(),
  date: z.string().datetime({ offset: true }).optional(),
  applyFee: z.boolean().optional(),
  destinationAccountId: z.string().uuid('Invalid destination account ID').nullable().optional(),
  splits: z.array(transactionSplitSchema).min(1, 'At least one category split is required').optional(),
}).refine(
  (data) => {
    if (data.splits && data.amount) {
      const splitsTotal = data.splits.reduce((sum, split) => sum + split.amount, 0)
      return Math.abs(splitsTotal - data.amount) < 0.01
    }
    return true
  },
  {
    message: 'Split amounts must equal the transaction amount',
    path: ['splits'],
  }
)

export const transactionIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
  accountId: z.string().uuid('Invalid account ID'),
  transactionId: z.string().uuid('Invalid transaction ID'),
})

export const accountTransactionParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
  accountId: z.string().uuid('Invalid account ID'),
})

export const transactionQuerySchema = z.object({
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  type: transactionTypeEnum.optional(),
  category: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>
export type TransactionType = z.infer<typeof transactionTypeEnum>
export type TransactionSplitDto = z.infer<typeof transactionSplitSchema>
export type TransactionQueryDto = z.infer<typeof transactionQuerySchema>
