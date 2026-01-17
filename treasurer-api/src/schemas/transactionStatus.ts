import { z } from 'zod'

export const transactionStatusEnum = z.enum(['UNCLEARED', 'CLEARED', 'RECONCILED'])

export const statusChangeRequestSchema = z.object({
  status: transactionStatusEnum,
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
})

export const bulkStatusChangeRequestSchema = z.object({
  transactionIds: z.array(z.string().uuid('Invalid transaction ID')).min(1, 'At least one transaction ID is required').max(100, 'Maximum 100 transactions per request'),
  status: transactionStatusEnum,
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
})

export const statusFilterQuerySchema = z.object({
  status: transactionStatusEnum.optional(),
  statuses: z.array(transactionStatusEnum).optional(),
  clearedAfter: z.string().datetime({ offset: true }).optional(),
  clearedBefore: z.string().datetime({ offset: true }).optional(),
  reconciledAfter: z.string().datetime({ offset: true }).optional(),
  reconciledBefore: z.string().datetime({ offset: true }).optional(),
})

export const transactionStatusParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
  accountId: z.string().uuid('Invalid account ID'),
  transactionId: z.string().uuid('Invalid transaction ID'),
})

export const accountStatusParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
  accountId: z.string().uuid('Invalid account ID'),
})

export type TransactionStatus = z.infer<typeof transactionStatusEnum>
export type StatusChangeRequestDto = z.infer<typeof statusChangeRequestSchema>
export type BulkStatusChangeRequestDto = z.infer<typeof bulkStatusChangeRequestSchema>
export type StatusFilterQueryDto = z.infer<typeof statusFilterQuerySchema>
