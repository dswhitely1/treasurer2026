import { prisma } from '../../src/config/database.js'
import type { TransactionStatus, TransactionType, AccountType } from '@prisma/client'

/**
 * Test data factories for creating consistent test data
 */

export interface TestUser {
  id: string
  email: string
  name: string | null
  password: string
}

export interface TestOrganization {
  id: string
  name: string
}

export interface TestAccount {
  id: string
  name: string
  organizationId: string
  accountType: AccountType
  balance: string
}

export interface TestTransaction {
  id: string
  memo: string | null
  amount: string
  transactionType: TransactionType
  accountId: string
  status: TransactionStatus
  clearedAt: Date | null
  reconciledAt: Date | null
}

let userCounter = 0
let orgCounter = 0
let accountCounter = 0
let transactionCounter = 0

/**
 * Create a test user
 */
export async function createTestUser(
  overrides?: Partial<{ email: string; password: string; name: string }>
): Promise<TestUser> {
  userCounter++
  const email = overrides?.email ?? `test-user-${userCounter}@example.com`
  const password = overrides?.password ?? 'Password123'
  const name = overrides?.name ?? `Test User ${userCounter}`

  const user = await prisma.user.create({
    data: {
      email,
      password,
      name,
    },
  })

  return user
}

/**
 * Create a test organization with a user as owner
 */
export async function createTestOrganization(
  userId: string,
  overrides?: Partial<{ name: string; role: 'OWNER' | 'ADMIN' | 'MEMBER' }>
): Promise<TestOrganization> {
  orgCounter++
  const name = overrides?.name ?? `Test Organization ${orgCounter}`
  const role = overrides?.role ?? 'OWNER'

  const org = await prisma.organization.create({
    data: {
      name,
      members: {
        create: {
          userId,
          role,
        },
      },
    },
  })

  return org
}

/**
 * Create a test account
 */
export async function createTestAccount(
  organizationId: string,
  overrides?: Partial<{
    name: string
    accountType: AccountType
    balance: number
    currency: string
    transactionFee: number
  }>
): Promise<TestAccount> {
  accountCounter++
  const name = overrides?.name ?? `Test Account ${accountCounter}`
  const accountType = overrides?.accountType ?? 'CHECKING'
  const balance = overrides?.balance ?? 0
  const currency = overrides?.currency ?? 'USD'

  const account = await prisma.account.create({
    data: {
      name,
      accountType,
      balance,
      currency,
      organizationId,
      transactionFee: overrides?.transactionFee,
    },
  })

  return {
    ...account,
    balance: account.balance.toString(),
  }
}

/**
 * Create a test transaction
 */
export async function createTestTransaction(
  accountId: string,
  overrides?: Partial<{
    memo: string
    amount: number
    transactionType: TransactionType
    status: TransactionStatus
    date: Date
    feeAmount: number
    destinationAccountId: string
    clearedAt: Date
    reconciledAt: Date
  }>
): Promise<TestTransaction> {
  transactionCounter++
  const memo = overrides?.memo ?? `Test Transaction ${transactionCounter}`
  const amount = overrides?.amount ?? 100
  const transactionType = overrides?.transactionType ?? 'EXPENSE'
  const status = overrides?.status ?? 'UNCLEARED'
  const date = overrides?.date ?? new Date()

  // Set timestamps based on status if not explicitly provided
  let clearedAt = overrides?.clearedAt ?? null
  let reconciledAt = overrides?.reconciledAt ?? null

  if (status === 'CLEARED' && !clearedAt) {
    clearedAt = new Date()
  } else if (status === 'RECONCILED' && !reconciledAt) {
    clearedAt = clearedAt ?? new Date()
    reconciledAt = new Date()
  }

  const transaction = await prisma.transaction.create({
    data: {
      memo,
      amount,
      transactionType,
      status,
      date,
      accountId,
      feeAmount: overrides?.feeAmount,
      destinationAccountId: overrides?.destinationAccountId,
      clearedAt,
      reconciledAt,
    },
  })

  return {
    ...transaction,
    amount: transaction.amount.toString(),
  }
}

/**
 * Create a complete test setup with user, org, account, and transaction
 */
export async function createFullTestSetup(overrides?: {
  user?: Partial<{ email: string; password: string; name: string }>
  organization?: Partial<{ name: string }>
  account?: Partial<{
    name: string
    accountType: AccountType
    balance: number
  }>
  transaction?: Partial<{
    memo: string
    amount: number
    transactionType: TransactionType
    status: TransactionStatus
  }>
}): Promise<{
  user: TestUser
  organization: TestOrganization
  account: TestAccount
  transaction: TestTransaction
}> {
  const user = await createTestUser(overrides?.user)
  const organization = await createTestOrganization(user.id, overrides?.organization)
  const account = await createTestAccount(organization.id, overrides?.account)
  const transaction = await createTestTransaction(account.id, overrides?.transaction)

  return {
    user,
    organization,
    account,
    transaction,
  }
}

/**
 * Create multiple transactions with different statuses
 */
export async function createTransactionsWithStatuses(
  accountId: string,
  counts: {
    uncleared?: number
    cleared?: number
    reconciled?: number
  }
): Promise<{
  uncleared: TestTransaction[]
  cleared: TestTransaction[]
  reconciled: TestTransaction[]
}> {
  const uncleared: TestTransaction[] = []
  const cleared: TestTransaction[] = []
  const reconciled: TestTransaction[] = []

  // Create uncleared transactions
  for (let i = 0; i < (counts.uncleared ?? 0); i++) {
    const tx = await createTestTransaction(accountId, {
      memo: `Uncleared ${i + 1}`,
      amount: (i + 1) * 100,
      status: 'UNCLEARED',
    })
    uncleared.push(tx)
  }

  // Create cleared transactions
  for (let i = 0; i < (counts.cleared ?? 0); i++) {
    const tx = await createTestTransaction(accountId, {
      memo: `Cleared ${i + 1}`,
      amount: (i + 1) * 100,
      status: 'CLEARED',
    })
    cleared.push(tx)
  }

  // Create reconciled transactions
  for (let i = 0; i < (counts.reconciled ?? 0); i++) {
    const tx = await createTestTransaction(accountId, {
      memo: `Reconciled ${i + 1}`,
      amount: (i + 1) * 100,
      status: 'RECONCILED',
    })
    reconciled.push(tx)
  }

  return { uncleared, cleared, reconciled }
}

/**
 * Create a status history entry
 */
export async function createStatusHistory(
  transactionId: string,
  changedById: string,
  overrides?: Partial<{
    fromStatus: TransactionStatus | null
    toStatus: TransactionStatus
    notes: string
    changedAt: Date
  }>
): Promise<{
  id: string
  transactionId: string
  fromStatus: TransactionStatus | null
  toStatus: TransactionStatus
  changedById: string
  notes: string | null
  changedAt: Date
}> {
  const fromStatus = overrides?.fromStatus ?? null
  const toStatus = overrides?.toStatus ?? 'CLEARED'
  const notes = overrides?.notes ?? null
  const changedAt = overrides?.changedAt ?? new Date()

  const history = await prisma.transactionStatusHistory.create({
    data: {
      transactionId,
      fromStatus,
      toStatus,
      changedById,
      notes,
      changedAt,
    },
  })

  return history
}

/**
 * Reset counters (useful for predictable test data)
 */
export function resetCounters(): void {
  userCounter = 0
  orgCounter = 0
  accountCounter = 0
  transactionCounter = 0
}
