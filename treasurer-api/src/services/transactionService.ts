import { Prisma } from '@prisma/client'
import { prisma } from '../config/database.js'
import { AppError } from '../middleware/errorHandler.js'
import type {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionType,
  TransactionQueryDto,
} from '../schemas/transaction.js'

export interface TransactionSplitInfo {
  id: string
  amount: string
  categoryId: string
  categoryName: string
}

export interface TransactionInfo {
  id: string
  description: string
  amount: string
  transactionType: TransactionType
  date: string
  feeAmount: string | null
  accountId: string
  splits: TransactionSplitInfo[]
  createdAt: string
  updatedAt: string
}

interface TransactionWithSplits {
  id: string
  description: string
  amount: Prisma.Decimal
  transactionType: string
  date: Date
  feeAmount: Prisma.Decimal | null
  accountId: string
  createdAt: Date
  updatedAt: Date
  splits: Array<{
    id: string
    amount: Prisma.Decimal
    categoryId: string
    category: {
      id: string
      name: string
    }
  }>
}

function formatTransaction(transaction: TransactionWithSplits): TransactionInfo {
  return {
    id: transaction.id,
    description: transaction.description,
    amount: transaction.amount.toString(),
    transactionType: transaction.transactionType as TransactionType,
    date: transaction.date.toISOString(),
    feeAmount: transaction.feeAmount?.toString() ?? null,
    accountId: transaction.accountId,
    splits: transaction.splits.map((split) => ({
      id: split.id,
      amount: split.amount.toString(),
      categoryId: split.categoryId,
      categoryName: split.category.name,
    })),
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  }
}

async function getOrCreateCategory(
  organizationId: string,
  categoryName: string
): Promise<string> {
  const normalizedName = categoryName.trim()

  const existing = await prisma.category.findUnique({
    where: {
      organizationId_name: {
        organizationId,
        name: normalizedName,
      },
    },
  })

  if (existing) {
    return existing.id
  }

  const category = await prisma.category.create({
    data: {
      name: normalizedName,
      organizationId,
    },
  })

  return category.id
}

export async function createTransaction(
  organizationId: string,
  accountId: string,
  input: CreateTransactionDto
): Promise<TransactionInfo> {
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

  // Calculate fee if applicable
  let feeAmount: number | null = null
  if (input.applyFee && account.transactionFee) {
    feeAmount = account.transactionFee.toNumber()
  }

  // Get or create categories
  const categoryIds = await Promise.all(
    input.splits.map((split) => getOrCreateCategory(organizationId, split.categoryName))
  )

  // Create transaction with splits in a transaction
  const transaction = await prisma.$transaction(async (tx) => {
    const newTransaction = await tx.transaction.create({
      data: {
        description: input.description,
        amount: input.amount,
        transactionType: input.transactionType ?? 'EXPENSE',
        date: input.date ? new Date(input.date) : new Date(),
        feeAmount,
        account: {
          connect: { id: accountId },
        },
        splits: {
          create: input.splits.map((split, index) => ({
            amount: split.amount,
            category: {
              connect: { id: categoryIds[index] },
            },
          })),
        },
      },
      include: {
        splits: {
          include: {
            category: true,
          },
        },
      },
    })

    // Update account balance
    const totalAmount = input.transactionType === 'INCOME'
      ? input.amount
      : -input.amount
    const totalWithFee = feeAmount
      ? totalAmount - feeAmount
      : totalAmount

    await tx.account.update({
      where: { id: accountId },
      data: {
        balance: {
          increment: totalWithFee,
        },
      },
    })

    return newTransaction
  })

  return formatTransaction(transaction)
}

export async function getAccountTransactions(
  organizationId: string,
  accountId: string,
  query: TransactionQueryDto
): Promise<{ transactions: TransactionInfo[]; total: number }> {
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

  const where: Prisma.TransactionWhereInput = {
    accountId,
    ...(query.startDate && { date: { gte: new Date(query.startDate) } }),
    ...(query.endDate && { date: { lte: new Date(query.endDate) } }),
    ...(query.type && { transactionType: query.type }),
    ...(query.category && {
      splits: {
        some: {
          category: {
            name: { contains: query.category, mode: 'insensitive' },
          },
        },
      },
    }),
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        splits: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      take: query.limit,
      skip: query.offset,
    }),
    prisma.transaction.count({ where }),
  ])

  return {
    transactions: transactions.map(formatTransaction),
    total,
  }
}

export async function getTransaction(
  organizationId: string,
  accountId: string,
  transactionId: string
): Promise<TransactionInfo> {
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

  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      accountId,
    },
    include: {
      splits: {
        include: {
          category: true,
        },
      },
    },
  })

  if (!transaction) {
    throw new AppError('Transaction not found', 404)
  }

  return formatTransaction(transaction)
}

export async function updateTransaction(
  organizationId: string,
  accountId: string,
  transactionId: string,
  input: UpdateTransactionDto
): Promise<TransactionInfo> {
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

  const existing = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      accountId,
    },
    include: {
      splits: true,
    },
  })

  if (!existing) {
    throw new AppError('Transaction not found', 404)
  }

  // Calculate old balance impact
  const oldAmount = existing.transactionType === 'INCOME'
    ? existing.amount.toNumber()
    : -existing.amount.toNumber()
  const oldFee = existing.feeAmount?.toNumber() ?? 0
  const oldTotalImpact = oldAmount - oldFee

  // Calculate new values
  const newTransactionType = input.transactionType ?? existing.transactionType
  const newAmount = input.amount ?? existing.amount.toNumber()
  let newFeeAmount: number | null = existing.feeAmount?.toNumber() ?? null

  if (input.applyFee !== undefined) {
    if (input.applyFee && account.transactionFee) {
      newFeeAmount = account.transactionFee.toNumber()
    } else if (!input.applyFee) {
      newFeeAmount = null
    }
  }

  // Calculate new balance impact
  const newAmountImpact = newTransactionType === 'INCOME' ? newAmount : -newAmount
  const newTotalImpact = newFeeAmount ? newAmountImpact - newFeeAmount : newAmountImpact

  // Prepare splits update if provided
  let categoryIds: string[] = []
  if (input.splits) {
    categoryIds = await Promise.all(
      input.splits.map((split) => getOrCreateCategory(organizationId, split.categoryName))
    )
  }

  const transaction = await prisma.$transaction(async (tx) => {
    // Delete old splits if updating
    if (input.splits) {
      await tx.transactionSplit.deleteMany({
        where: { transactionId },
      })
    }

    // Build update data
    const updateData: Prisma.TransactionUpdateInput = {
      ...(input.description !== undefined && { description: input.description }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.transactionType !== undefined && { transactionType: input.transactionType }),
      ...(input.date !== undefined && { date: new Date(input.date) }),
      feeAmount: newFeeAmount,
    }

    // Add splits if provided
    if (input.splits) {
      updateData.splits = {
        create: input.splits.map((split, index) => ({
          amount: split.amount,
          category: {
            connect: { id: categoryIds[index] },
          },
        })),
      }
    }

    // Update transaction
    const updated = await tx.transaction.update({
      where: { id: transactionId },
      data: updateData,
      include: {
        splits: {
          include: {
            category: true,
          },
        },
      },
    })

    // Adjust account balance
    const balanceAdjustment = newTotalImpact - oldTotalImpact
    if (balanceAdjustment !== 0) {
      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: balanceAdjustment,
          },
        },
      })
    }

    return updated
  })

  return formatTransaction(transaction)
}

export async function deleteTransaction(
  organizationId: string,
  accountId: string,
  transactionId: string
): Promise<void> {
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

  const existing = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      accountId,
    },
  })

  if (!existing) {
    throw new AppError('Transaction not found', 404)
  }

  // Calculate balance reversal
  const amountImpact = existing.transactionType === 'INCOME'
    ? -existing.amount.toNumber()
    : existing.amount.toNumber()
  const feeReversal = existing.feeAmount?.toNumber() ?? 0
  const totalReversal = amountImpact + feeReversal

  await prisma.$transaction(async (tx) => {
    await tx.transaction.delete({
      where: { id: transactionId },
    })

    await tx.account.update({
      where: { id: accountId },
      data: {
        balance: {
          increment: totalReversal,
        },
      },
    })
  })
}
