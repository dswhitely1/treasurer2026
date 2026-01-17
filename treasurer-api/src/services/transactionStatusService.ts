import { Prisma, TransactionStatus } from '@prisma/client'
import { prisma } from '../config/database.js'
import { AppError } from '../middleware/errorHandler.js'
import type {
  StatusChangeRequestDto,
  BulkStatusChangeRequestDto,
} from '../schemas/transactionStatus.js'

// Status transition state machine
const STATUS_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  UNCLEARED: ['CLEARED'],
  CLEARED: ['UNCLEARED', 'RECONCILED'],
  RECONCILED: [], // RECONCILED is terminal - no transitions allowed
}

// Status history info
export interface StatusHistoryInfo {
  id: string
  fromStatus: TransactionStatus | null
  toStatus: TransactionStatus
  changedById: string
  changedByName: string | null
  changedByEmail: string
  changedAt: string
  notes: string | null
}

// Reconciliation summary
export interface ReconciliationSummary {
  accountId: string
  accountName: string
  uncleared: {
    count: number
    total: string
  }
  cleared: {
    count: number
    total: string
  }
  reconciled: {
    count: number
    total: string
  }
  overall: {
    count: number
    total: string
  }
}

// Bulk operation result
export interface BulkStatusChangeResult {
  successful: Array<{
    transactionId: string
    status: TransactionStatus
  }>
  failed: Array<{
    transactionId: string
    error: string
  }>
}

// Validate status transition
export function isValidStatusTransition(
  currentStatus: TransactionStatus,
  newStatus: TransactionStatus
): boolean {
  if (currentStatus === newStatus) {
    return false // No-op transition
  }
  return STATUS_TRANSITIONS[currentStatus].includes(newStatus)
}

// Change transaction status
export async function changeTransactionStatus(
  organizationId: string,
  accountId: string,
  transactionId: string,
  userId: string,
  input: StatusChangeRequestDto
): Promise<StatusHistoryInfo> {
  // Verify account exists and belongs to org
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      organizationId,
    },
  })

  if (!account) {
    throw new AppError('Account not found', 404)
  }

  // Get existing transaction
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      accountId,
    },
  })

  if (!transaction) {
    throw new AppError('Transaction not found', 404)
  }

  // Validate status transition
  if (!isValidStatusTransition(transaction.status, input.status)) {
    if (transaction.status === input.status) {
      throw new AppError(`Transaction is already ${input.status}`, 400)
    }
    if (transaction.status === 'RECONCILED') {
      throw new AppError('Cannot modify reconciled transactions', 400)
    }
    throw new AppError(
      `Invalid status transition from ${transaction.status} to ${input.status}`,
      400
    )
  }

  // Update transaction status and create history record in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update transaction status and timestamp
    const updateData: Prisma.TransactionUpdateInput = {
      status: input.status,
    }

    if (input.status === 'CLEARED') {
      updateData.clearedAt = new Date()
    } else if (input.status === 'RECONCILED') {
      updateData.reconciledAt = new Date()
      // Also set clearedAt if not already set
      if (!transaction.clearedAt) {
        updateData.clearedAt = new Date()
      }
    } else if (input.status === 'UNCLEARED') {
      // Moving back to uncleared clears both timestamps
      updateData.clearedAt = null
      updateData.reconciledAt = null
    }

    await tx.transaction.update({
      where: { id: transactionId },
      data: updateData,
    })

    // Create history record
    const history = await tx.transactionStatusHistory.create({
      data: {
        transactionId,
        fromStatus: transaction.status,
        toStatus: input.status,
        changedById: userId,
        notes: input.notes,
      },
      include: {
        changedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return history
  })

  return {
    id: result.id,
    fromStatus: result.fromStatus,
    toStatus: result.toStatus,
    changedById: result.changedById,
    changedByName: result.changedBy.name,
    changedByEmail: result.changedBy.email,
    changedAt: result.changedAt.toISOString(),
    notes: result.notes,
  }
}

// Bulk change transaction status
export async function bulkChangeTransactionStatus(
  organizationId: string,
  accountId: string,
  userId: string,
  input: BulkStatusChangeRequestDto
): Promise<BulkStatusChangeResult> {
  // Verify account exists and belongs to org
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      organizationId,
    },
  })

  if (!account) {
    throw new AppError('Account not found', 404)
  }

  // Fetch all transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      id: { in: input.transactionIds },
      accountId,
    },
  })

  const successful: BulkStatusChangeResult['successful'] = []
  const failed: BulkStatusChangeResult['failed'] = []

  // Validate all transactions first and collect valid ones for batch processing
  const validTransactions: Array<{
    id: string
    currentStatus: TransactionStatus
  }> = []

  for (const transactionId of input.transactionIds) {
    const transaction = transactions.find((t) => t.id === transactionId)

    if (!transaction) {
      failed.push({
        transactionId,
        error: 'Transaction not found',
      })
      continue
    }

    // Validate status transition
    if (!isValidStatusTransition(transaction.status, input.status)) {
      if (transaction.status === input.status) {
        failed.push({
          transactionId,
          error: `Transaction is already ${input.status}`,
        })
      } else if (transaction.status === 'RECONCILED') {
        failed.push({
          transactionId,
          error: 'Cannot modify reconciled transactions',
        })
      } else {
        failed.push({
          transactionId,
          error: `Invalid status transition from ${transaction.status} to ${input.status}`,
        })
      }
      continue
    }

    validTransactions.push({
      id: transactionId,
      currentStatus: transaction.status,
    })
  }

  // Batch process all valid transactions in a single database transaction
  if (validTransactions.length > 0) {
    try {
      await prisma.$transaction(async (tx) => {
        const now = new Date()

        // Update all transactions in a single operation for each status type
        for (const validTx of validTransactions) {
          const updateData: Prisma.TransactionUpdateInput = {
            status: input.status,
          }

          if (input.status === 'CLEARED') {
            updateData.clearedAt = now
          } else if (input.status === 'RECONCILED') {
            updateData.reconciledAt = now
            // Get current transaction to check clearedAt
            const currentTx = transactions.find((t) => t.id === validTx.id)
            if (currentTx && !currentTx.clearedAt) {
              updateData.clearedAt = now
            }
          } else if (input.status === 'UNCLEARED') {
            updateData.clearedAt = null
            updateData.reconciledAt = null
          }

          await tx.transaction.update({
            where: { id: validTx.id },
            data: updateData,
          })
        }

        // Create all history records in batch
        await tx.transactionStatusHistory.createMany({
          data: validTransactions.map((validTx) => ({
            transactionId: validTx.id,
            fromStatus: validTx.currentStatus,
            toStatus: input.status,
            changedById: userId,
            changedAt: now,
            notes: input.notes,
          })),
        })
      })

      // Mark all as successful
      validTransactions.forEach((validTx) => {
        successful.push({
          transactionId: validTx.id,
          status: input.status,
        })
      })
    } catch (error) {
      // If the entire batch fails, mark all as failed
      validTransactions.forEach((validTx) => {
        failed.push({
          transactionId: validTx.id,
          error: error instanceof Error ? error.message : 'Batch update failed',
        })
      })
    }
  }

  return { successful, failed }
}

// Get transaction status history
export async function getTransactionStatusHistory(
  organizationId: string,
  accountId: string,
  transactionId: string
): Promise<StatusHistoryInfo[]> {
  // Verify account exists and belongs to org
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      organizationId,
    },
  })

  if (!account) {
    throw new AppError('Account not found', 404)
  }

  // Verify transaction exists and belongs to account
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      accountId,
    },
  })

  if (!transaction) {
    throw new AppError('Transaction not found', 404)
  }

  // Fetch status history
  const history = await prisma.transactionStatusHistory.findMany({
    where: { transactionId },
    include: {
      changedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { changedAt: 'desc' },
  })

  return history.map((h) => ({
    id: h.id,
    fromStatus: h.fromStatus,
    toStatus: h.toStatus,
    changedById: h.changedById,
    changedByName: h.changedBy.name,
    changedByEmail: h.changedBy.email,
    changedAt: h.changedAt.toISOString(),
    notes: h.notes,
  }))
}

// Get reconciliation summary
export async function getReconciliationSummary(
  organizationId: string,
  accountId: string
): Promise<ReconciliationSummary> {
  // Verify account exists and belongs to org
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      organizationId,
    },
  })

  if (!account) {
    throw new AppError('Account not found', 404)
  }

  // Get aggregated data by status
  const statusAggregates = await prisma.transaction.groupBy({
    by: ['status'],
    where: { accountId },
    _count: { id: true },
    _sum: { amount: true },
  })

  // Initialize summary structure
  const summary: ReconciliationSummary = {
    accountId,
    accountName: account.name,
    uncleared: { count: 0, total: '0' },
    cleared: { count: 0, total: '0' },
    reconciled: { count: 0, total: '0' },
    overall: { count: 0, total: '0' },
  }

  // Populate summary from aggregates
  let overallCount = 0
  let overallTotal = 0

  for (const aggregate of statusAggregates) {
    const count = aggregate._count.id
    const total = aggregate._sum.amount?.toNumber() ?? 0

    overallCount += count
    overallTotal += total

    if (aggregate.status === 'UNCLEARED') {
      summary.uncleared = { count, total: total.toString() }
    } else if (aggregate.status === 'CLEARED') {
      summary.cleared = { count, total: total.toString() }
    } else if (aggregate.status === 'RECONCILED') {
      summary.reconciled = { count, total: total.toString() }
    }
  }

  summary.overall = {
    count: overallCount,
    total: overallTotal.toString(),
  }

  return summary
}

// Validate transaction is not reconciled (helper for middleware)
export async function validateTransactionNotReconciled(
  transactionId: string
): Promise<void> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { status: true },
  })

  if (transaction?.status === 'RECONCILED') {
    throw new AppError('Cannot modify reconciled transactions', 400)
  }
}
