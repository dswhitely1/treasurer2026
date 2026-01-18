import request from 'supertest'
import type { Express } from 'express'
import { prisma } from '../../src/config/database.js'

/**
 * Test utilities for common test operations
 */

/**
 * Register a user and return authentication token
 */
export async function registerAndLogin(
  app: Express,
  userData?: {
    email?: string
    password?: string
    name?: string
  }
): Promise<{
  token: string
  userId: string
  email: string
}> {
  const email = userData?.email ?? `test-${Date.now()}@example.com`
  const password = userData?.password ?? 'Password123'
  const name = userData?.name ?? 'Test User'

  const response = await request(app)
    .post('/api/auth/register')
    .send({
      email,
      password,
      name,
    })

  return {
    token: response.body.data.token,
    userId: response.body.data.user.id,
    email,
  }
}

/**
 * Create an organization via API
 */
export async function createOrganization(
  app: Express,
  token: string,
  name?: string
): Promise<{
  orgId: string
  name: string
}> {
  const orgName = name ?? `Test Org ${Date.now()}`

  const response = await request(app)
    .post('/api/organizations')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: orgName })

  return {
    orgId: response.body.data.id,
    name: orgName,
  }
}

/**
 * Create an account via API
 */
export async function createAccount(
  app: Express,
  token: string,
  orgId: string,
  accountData?: {
    name?: string
    accountType?: string
    balance?: number
  }
): Promise<{
  accountId: string
  name: string
}> {
  const name = accountData?.name ?? `Test Account ${Date.now()}`
  const accountType = accountData?.accountType ?? 'CHECKING'
  const balance = accountData?.balance ?? 1000

  const response = await request(app)
    .post(`/api/organizations/${orgId}/accounts`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name,
      accountType,
      balance,
    })

  return {
    accountId: response.body.data.account.id,
    name,
  }
}

/**
 * Create a transaction via API
 */
export async function createTransaction(
  app: Express,
  token: string,
  orgId: string,
  accountId: string,
  transactionData?: {
    memo?: string
    amount?: number
    transactionType?: string
    date?: string
  }
): Promise<{
  transactionId: string
  memo: string
}> {
  const memo = transactionData?.memo ?? `Test Transaction ${Date.now()}`
  const amount = transactionData?.amount ?? 100
  const transactionType = transactionData?.transactionType ?? 'EXPENSE'
  const date = transactionData?.date ?? new Date().toISOString()

  const response = await request(app)
    .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      memo,
      amount,
      transactionType,
      date,
    })

  return {
    transactionId: response.body.data.transaction.id,
    memo,
  }
}

/**
 * Change transaction status via API
 */
export async function changeTransactionStatus(
  app: Express,
  token: string,
  orgId: string,
  accountId: string,
  transactionId: string,
  status: string,
  notes?: string
): Promise<void> {
  await request(app)
    .patch(`/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status, notes })
}

/**
 * Setup complete test environment (user, org, account, transaction)
 */
export async function setupTestEnvironment(app: Express): Promise<{
  token: string
  userId: string
  orgId: string
  accountId: string
  transactionId: string
}> {
  const { token, userId } = await registerAndLogin(app)
  const { orgId } = await createOrganization(app, token)
  const { accountId } = await createAccount(app, token, orgId)
  const { transactionId } = await createTransaction(app, token, orgId, accountId)

  return {
    token,
    userId,
    orgId,
    accountId,
    transactionId,
  }
}

/**
 * Wait for a specified number of milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Verify transaction status in database
 */
export async function verifyTransactionStatus(
  transactionId: string,
  expectedStatus: string
): Promise<boolean> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  })
  return transaction?.status === expectedStatus
}

/**
 * Verify status history exists
 */
export async function verifyStatusHistoryExists(
  transactionId: string,
  expectedCount: number
): Promise<boolean> {
  const history = await prisma.transactionStatusHistory.findMany({
    where: { transactionId },
  })
  return history.length === expectedCount
}

/**
 * Get transaction with full details
 */
export async function getTransactionDetails(transactionId: string) {
  return await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      statusHistory: {
        include: {
          changedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          changedAt: 'desc',
        },
      },
    },
  })
}

/**
 * Assert response is successful (2xx status)
 */
export function assertSuccessResponse(response: request.Response): void {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Expected successful response but got ${response.status}: ${JSON.stringify(response.body)}`
    )
  }
}

/**
 * Assert response is an error (4xx or 5xx status)
 */
export function assertErrorResponse(
  response: request.Response,
  expectedStatus?: number
): void {
  if (response.status < 400) {
    throw new Error(
      `Expected error response but got ${response.status}: ${JSON.stringify(response.body)}`
    )
  }
  if (expectedStatus && response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus} but got ${response.status}: ${JSON.stringify(response.body)}`
    )
  }
}

/**
 * Create multiple transactions with different statuses (via database)
 */
export async function seedTransactionsWithStatuses(
  accountId: string,
  counts: {
    uncleared?: number
    cleared?: number
    reconciled?: number
  }
): Promise<{
  unclearedIds: string[]
  clearedIds: string[]
  reconciledIds: string[]
}> {
  const unclearedIds: string[] = []
  const clearedIds: string[] = []
  const reconciledIds: string[] = []

  // Create uncleared transactions
  for (let i = 0; i < (counts.uncleared ?? 0); i++) {
    const tx = await prisma.transaction.create({
      data: {
        memo: `Uncleared ${i + 1}`,
        amount: (i + 1) * 100,
        transactionType: 'EXPENSE',
        accountId,
        status: 'UNCLEARED',
      },
    })
    unclearedIds.push(tx.id)
  }

  // Create cleared transactions
  for (let i = 0; i < (counts.cleared ?? 0); i++) {
    const tx = await prisma.transaction.create({
      data: {
        memo: `Cleared ${i + 1}`,
        amount: (i + 1) * 100,
        transactionType: 'EXPENSE',
        accountId,
        status: 'CLEARED',
        clearedAt: new Date(),
      },
    })
    clearedIds.push(tx.id)
  }

  // Create reconciled transactions
  for (let i = 0; i < (counts.reconciled ?? 0); i++) {
    const tx = await prisma.transaction.create({
      data: {
        memo: `Reconciled ${i + 1}`,
        amount: (i + 1) * 100,
        transactionType: 'EXPENSE',
        accountId,
        status: 'RECONCILED',
        clearedAt: new Date(),
        reconciledAt: new Date(),
      },
    })
    reconciledIds.push(tx.id)
  }

  return {
    unclearedIds,
    clearedIds,
    reconciledIds,
  }
}

/**
 * Get account summary by status
 */
export async function getAccountSummary(accountId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { accountId },
  })

  const summary = {
    total: transactions.length,
    uncleared: transactions.filter(tx => tx.status === 'UNCLEARED').length,
    cleared: transactions.filter(tx => tx.status === 'CLEARED').length,
    reconciled: transactions.filter(tx => tx.status === 'RECONCILED').length,
  }

  return summary
}

/**
 * Clean specific tables (useful for focused cleanup)
 */
export async function cleanTables(tables: string[]): Promise<void> {
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${table}" CASCADE;`)
    } catch {
      // Table may not exist or may be empty
    }
  }
}
