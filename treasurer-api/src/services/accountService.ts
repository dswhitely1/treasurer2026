import { Prisma } from '@prisma/client'
import { prisma } from '../config/database.js'
import { AppError } from '../middleware/errorHandler.js'
import type { CreateAccountDto, UpdateAccountDto, AccountType } from '../schemas/account.js'

export interface AccountInfo {
  id: string
  name: string
  description: string | null
  institution: string | null
  accountType: AccountType
  balance: string
  currency: string
  isActive: boolean
  transactionFee: string | null
  organizationId: string
  createdAt: string
  updatedAt: string
}

function formatAccount(account: {
  id: string
  name: string
  description: string | null
  institution: string | null
  accountType: string
  balance: Prisma.Decimal
  currency: string
  isActive: boolean
  transactionFee: Prisma.Decimal | null
  organizationId: string
  createdAt: Date
  updatedAt: Date
}): AccountInfo {
  return {
    id: account.id,
    name: account.name,
    description: account.description,
    institution: account.institution,
    accountType: account.accountType as AccountType,
    balance: account.balance.toString(),
    currency: account.currency,
    isActive: account.isActive,
    transactionFee: account.transactionFee?.toString() ?? null,
    organizationId: account.organizationId,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  }
}

export async function createAccount(
  organizationId: string,
  input: CreateAccountDto
): Promise<AccountInfo> {
  const account = await prisma.account.create({
    data: {
      name: input.name,
      description: input.description,
      institution: input.institution,
      accountType: input.accountType ?? 'CHECKING',
      balance: input.balance ?? 0,
      currency: input.currency ?? 'USD',
      transactionFee: input.transactionFee,
      organizationId,
    },
  })

  return formatAccount(account)
}

export async function getOrganizationAccounts(
  organizationId: string,
  includeInactive = false
): Promise<AccountInfo[]> {
  const accounts = await prisma.account.findMany({
    where: {
      organizationId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { createdAt: 'asc' },
  })

  return accounts.map(formatAccount)
}

export async function getAccount(
  organizationId: string,
  accountId: string
): Promise<AccountInfo> {
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      organizationId,
    },
  })

  if (!account) {
    throw new AppError('Account not found', 404)
  }

  return formatAccount(account)
}

export async function updateAccount(
  organizationId: string,
  accountId: string,
  input: UpdateAccountDto
): Promise<AccountInfo> {
  const existing = await prisma.account.findFirst({
    where: {
      id: accountId,
      organizationId,
    },
  })

  if (!existing) {
    throw new AppError('Account not found', 404)
  }

  const account = await prisma.account.update({
    where: { id: accountId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.institution !== undefined && { institution: input.institution }),
      ...(input.accountType !== undefined && { accountType: input.accountType }),
      ...(input.balance !== undefined && { balance: input.balance }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.transactionFee !== undefined && { transactionFee: input.transactionFee }),
    },
  })

  return formatAccount(account)
}

export async function deleteAccount(
  organizationId: string,
  accountId: string
): Promise<void> {
  const existing = await prisma.account.findFirst({
    where: {
      id: accountId,
      organizationId,
    },
  })

  if (!existing) {
    throw new AppError('Account not found', 404)
  }

  await prisma.account.delete({
    where: { id: accountId },
  })
}
