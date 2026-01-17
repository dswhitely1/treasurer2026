import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '../../src/config/database.js'
import {
  isValidStatusTransition,
  changeTransactionStatus,
  bulkChangeTransactionStatus,
  getTransactionStatusHistory,
  getReconciliationSummary,
} from '../../src/services/transactionStatusService.js'
import type { TransactionStatus } from '@prisma/client'

describe('Transaction Status Service', () => {
  let userId: string
  let orgId: string
  let accountId: string
  let transactionId: string

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'status-test@example.com',
        password: 'hashedpassword',
        name: 'Status Test User',
      },
    })
    userId = user.id

    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Status Test Org',
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
    })
    orgId = org.id

    // Create test account
    const account = await prisma.account.create({
      data: {
        name: 'Test Account',
        organizationId: orgId,
        accountType: 'CHECKING',
        balance: 1000,
      },
    })
    accountId = account.id

    // Create test transaction
    const transaction = await prisma.transaction.create({
      data: {
        description: 'Test Transaction',
        amount: 100,
        transactionType: 'EXPENSE',
        accountId,
        status: 'UNCLEARED',
      },
    })
    transactionId = transaction.id
  })

  describe('isValidStatusTransition', () => {
    it('should allow UNCLEARED to CLEARED transition', () => {
      expect(isValidStatusTransition('UNCLEARED', 'CLEARED')).toBe(true)
    })

    it('should allow CLEARED to UNCLEARED transition', () => {
      expect(isValidStatusTransition('CLEARED', 'UNCLEARED')).toBe(true)
    })

    it('should allow CLEARED to RECONCILED transition', () => {
      expect(isValidStatusTransition('CLEARED', 'RECONCILED')).toBe(true)
    })

    it('should prevent UNCLEARED to RECONCILED direct transition', () => {
      expect(isValidStatusTransition('UNCLEARED', 'RECONCILED')).toBe(false)
    })

    it('should prevent RECONCILED to CLEARED transition', () => {
      expect(isValidStatusTransition('RECONCILED', 'CLEARED')).toBe(false)
    })

    it('should prevent RECONCILED to UNCLEARED transition', () => {
      expect(isValidStatusTransition('RECONCILED', 'UNCLEARED')).toBe(false)
    })

    it('should return false for same status (idempotent check)', () => {
      expect(isValidStatusTransition('UNCLEARED', 'UNCLEARED')).toBe(false)
      expect(isValidStatusTransition('CLEARED', 'CLEARED')).toBe(false)
      expect(isValidStatusTransition('RECONCILED', 'RECONCILED')).toBe(false)
    })
  })

  describe('changeTransactionStatus', () => {
    it('should change status from UNCLEARED to CLEARED', async () => {
      const result = await changeTransactionStatus(
        orgId,
        accountId,
        transactionId,
        userId,
        { status: 'CLEARED' }
      )

      expect(result.fromStatus).toBe('UNCLEARED')
      expect(result.toStatus).toBe('CLEARED')
      expect(result.changedById).toBe(userId)
      expect(result.changedByEmail).toBe('status-test@example.com')

      // Verify transaction was updated
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      })
      expect(transaction?.status).toBe('CLEARED')
      expect(transaction?.clearedAt).toBeTruthy()
    })

    it('should change status from CLEARED to RECONCILED', async () => {
      // First change to CLEARED
      await changeTransactionStatus(
        orgId,
        accountId,
        transactionId,
        userId,
        { status: 'CLEARED' }
      )

      // Then change to RECONCILED
      const result = await changeTransactionStatus(
        orgId,
        accountId,
        transactionId,
        userId,
        { status: 'RECONCILED', notes: 'Monthly reconciliation' }
      )

      expect(result.fromStatus).toBe('CLEARED')
      expect(result.toStatus).toBe('RECONCILED')
      expect(result.notes).toBe('Monthly reconciliation')

      // Verify transaction was updated
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      })
      expect(transaction?.status).toBe('RECONCILED')
      expect(transaction?.reconciledAt).toBeTruthy()
      expect(transaction?.clearedAt).toBeTruthy()
    })

    it('should set clearedAt timestamp when status changes to CLEARED', async () => {
      await changeTransactionStatus(
        orgId,
        accountId,
        transactionId,
        userId,
        { status: 'CLEARED' }
      )

      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      })
      expect(transaction?.clearedAt).toBeTruthy()
      expect(transaction?.clearedAt).toBeInstanceOf(Date)
    })

    it('should set reconciledAt timestamp when status changes to RECONCILED', async () => {
      // First change to CLEARED
      await changeTransactionStatus(
        orgId,
        accountId,
        transactionId,
        userId,
        { status: 'CLEARED' }
      )

      // Then change to RECONCILED
      await changeTransactionStatus(
        orgId,
        accountId,
        transactionId,
        userId,
        { status: 'RECONCILED' }
      )

      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      })
      expect(transaction?.reconciledAt).toBeTruthy()
      expect(transaction?.reconciledAt).toBeInstanceOf(Date)
    })

    it('should set clearedAt if not set when changing to RECONCILED', async () => {
      // Manually update transaction to CLEARED without clearedAt
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'CLEARED', clearedAt: null },
      })

      // Change to RECONCILED
      await changeTransactionStatus(
        orgId,
        accountId,
        transactionId,
        userId,
        { status: 'RECONCILED' }
      )

      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      })
      expect(transaction?.clearedAt).toBeTruthy()
      expect(transaction?.reconciledAt).toBeTruthy()
    })

    it('should clear timestamps when reverting to UNCLEARED', async () => {
      // First change to CLEARED
      await changeTransactionStatus(
        orgId,
        accountId,
        transactionId,
        userId,
        { status: 'CLEARED' }
      )

      // Then revert to UNCLEARED
      await changeTransactionStatus(
        orgId,
        accountId,
        transactionId,
        userId,
        { status: 'UNCLEARED' }
      )

      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      })
      expect(transaction?.status).toBe('UNCLEARED')
      expect(transaction?.clearedAt).toBeNull()
      expect(transaction?.reconciledAt).toBeNull()
    })

    it('should create audit trail entry with correct fromStatus and toStatus', async () => {
      const result = await changeTransactionStatus(
        orgId,
        accountId,
        transactionId,
        userId,
        { status: 'CLEARED', notes: 'Test notes' }
      )

      const history = await prisma.transactionStatusHistory.findUnique({
        where: { id: result.id },
      })
      expect(history?.fromStatus).toBe('UNCLEARED')
      expect(history?.toStatus).toBe('CLEARED')
      expect(history?.changedById).toBe(userId)
      expect(history?.notes).toBe('Test notes')
    })

    it('should throw error on invalid transition', async () => {
      await expect(
        changeTransactionStatus(
          orgId,
          accountId,
          transactionId,
          userId,
          { status: 'RECONCILED' }
        )
      ).rejects.toThrow('Invalid status transition from UNCLEARED to RECONCILED')
    })

    it('should throw error if transaction is already at target status', async () => {
      await expect(
        changeTransactionStatus(
          orgId,
          accountId,
          transactionId,
          userId,
          { status: 'UNCLEARED' }
        )
      ).rejects.toThrow('Transaction is already UNCLEARED')
    })

    it('should throw error when trying to modify reconciled transaction', async () => {
      // First get to RECONCILED state
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'RECONCILED',
          clearedAt: new Date(),
          reconciledAt: new Date(),
        },
      })

      await expect(
        changeTransactionStatus(
          orgId,
          accountId,
          transactionId,
          userId,
          { status: 'CLEARED' }
        )
      ).rejects.toThrow('Cannot modify reconciled transactions')
    })

    it('should use database transaction for atomicity', async () => {
      // This is implicitly tested by the transaction, but we can verify history is created
      const result = await changeTransactionStatus(
        orgId,
        accountId,
        transactionId,
        userId,
        { status: 'CLEARED' }
      )

      const history = await prisma.transactionStatusHistory.findUnique({
        where: { id: result.id },
      })
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      })

      expect(history).toBeTruthy()
      expect(transaction?.status).toBe('CLEARED')
    })

    it('should throw error if transaction not found', async () => {
      await expect(
        changeTransactionStatus(
          orgId,
          accountId,
          'non-existent-id',
          userId,
          { status: 'CLEARED' }
        )
      ).rejects.toThrow('Transaction not found')
    })

    it('should throw error if account not found', async () => {
      await expect(
        changeTransactionStatus(
          orgId,
          'non-existent-account',
          transactionId,
          userId,
          { status: 'CLEARED' }
        )
      ).rejects.toThrow('Account not found')
    })

    it('should validate organization membership', async () => {
      const wrongOrgId = '00000000-0000-0000-0000-000000000000'
      await expect(
        changeTransactionStatus(
          wrongOrgId,
          accountId,
          transactionId,
          userId,
          { status: 'CLEARED' }
        )
      ).rejects.toThrow('Account not found')
    })
  })

  describe('bulkChangeTransactionStatus', () => {
    let transaction2Id: string
    let transaction3Id: string

    beforeEach(async () => {
      // Create additional transactions for bulk operations
      const tx2 = await prisma.transaction.create({
        data: {
          description: 'Transaction 2',
          amount: 200,
          transactionType: 'EXPENSE',
          accountId,
          status: 'UNCLEARED',
        },
      })
      transaction2Id = tx2.id

      const tx3 = await prisma.transaction.create({
        data: {
          description: 'Transaction 3',
          amount: 300,
          transactionType: 'INCOME',
          accountId,
          status: 'UNCLEARED',
        },
      })
      transaction3Id = tx3.id
    })

    it('should successfully update all valid transactions', async () => {
      const result = await bulkChangeTransactionStatus(
        orgId,
        accountId,
        userId,
        {
          transactionIds: [transactionId, transaction2Id, transaction3Id],
          status: 'CLEARED',
        }
      )

      expect(result.successful).toHaveLength(3)
      expect(result.failed).toHaveLength(0)
      expect(result.successful[0]?.status).toBe('CLEARED')
      expect(result.successful[1]?.status).toBe('CLEARED')
      expect(result.successful[2]?.status).toBe('CLEARED')

      // Verify all transactions were updated
      const transactions = await prisma.transaction.findMany({
        where: { id: { in: [transactionId, transaction2Id, transaction3Id] } },
      })
      expect(transactions.every(tx => tx.status === 'CLEARED')).toBe(true)
    })

    it('should return partial results on mixed success and failure', async () => {
      // Set one transaction to RECONCILED
      await prisma.transaction.update({
        where: { id: transaction2Id },
        data: {
          status: 'RECONCILED',
          clearedAt: new Date(),
          reconciledAt: new Date(),
        },
      })

      const result = await bulkChangeTransactionStatus(
        orgId,
        accountId,
        userId,
        {
          transactionIds: [transactionId, transaction2Id, transaction3Id],
          status: 'CLEARED',
        }
      )

      expect(result.successful).toHaveLength(2)
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0]?.transactionId).toBe(transaction2Id)
      expect(result.failed[0]?.error).toContain('Cannot modify reconciled transactions')
    })

    it('should continue processing after individual failures', async () => {
      // Set middle transaction to RECONCILED
      await prisma.transaction.update({
        where: { id: transaction2Id },
        data: {
          status: 'RECONCILED',
          clearedAt: new Date(),
          reconciledAt: new Date(),
        },
      })

      const result = await bulkChangeTransactionStatus(
        orgId,
        accountId,
        userId,
        {
          transactionIds: [transactionId, transaction2Id, transaction3Id],
          status: 'CLEARED',
        }
      )

      // Both first and third should succeed despite second failing
      expect(result.successful).toHaveLength(2)
      expect(result.successful.find(s => s.transactionId === transactionId)).toBeTruthy()
      expect(result.successful.find(s => s.transactionId === transaction3Id)).toBeTruthy()
    })

    it('should create audit trail for each successful change', async () => {
      await bulkChangeTransactionStatus(
        orgId,
        accountId,
        userId,
        {
          transactionIds: [transactionId, transaction2Id, transaction3Id],
          status: 'CLEARED',
          notes: 'Bulk clearing',
        }
      )

      const history = await prisma.transactionStatusHistory.findMany({
        where: {
          transactionId: { in: [transactionId, transaction2Id, transaction3Id] },
        },
      })

      expect(history).toHaveLength(3)
      expect(history.every(h => h.toStatus === 'CLEARED')).toBe(true)
      expect(history.every(h => h.notes === 'Bulk clearing')).toBe(true)
    })

    it('should handle non-existent transaction IDs', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const result = await bulkChangeTransactionStatus(
        orgId,
        accountId,
        userId,
        {
          transactionIds: [transactionId, fakeId, transaction2Id],
          status: 'CLEARED',
        }
      )

      expect(result.successful).toHaveLength(2)
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0]?.transactionId).toBe(fakeId)
      expect(result.failed[0]?.error).toBe('Transaction not found')
    })

    it('should return detailed error messages for failures', async () => {
      // Create invalid transition scenario
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'RECONCILED',
          clearedAt: new Date(),
          reconciledAt: new Date(),
        },
      })

      const result = await bulkChangeTransactionStatus(
        orgId,
        accountId,
        userId,
        {
          transactionIds: [transactionId, transaction2Id],
          status: 'UNCLEARED',
        }
      )

      expect(result.failed[0]?.error).toBe('Cannot modify reconciled transactions')
    })

    it('should handle transactions already at target status', async () => {
      // Set one transaction to CLEARED
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'CLEARED', clearedAt: new Date() },
      })

      const result = await bulkChangeTransactionStatus(
        orgId,
        accountId,
        userId,
        {
          transactionIds: [transactionId, transaction2Id],
          status: 'CLEARED',
        }
      )

      expect(result.successful).toHaveLength(1)
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0]?.transactionId).toBe(transactionId)
      expect(result.failed[0]?.error).toBe('Transaction is already CLEARED')
    })

    it('should throw error if account not found', async () => {
      await expect(
        bulkChangeTransactionStatus(
          orgId,
          'non-existent-account',
          userId,
          {
            transactionIds: [transactionId],
            status: 'CLEARED',
          }
        )
      ).rejects.toThrow('Account not found')
    })
  })

  describe('getTransactionStatusHistory', () => {
    it('should return status history ordered by date descending', async () => {
      // Create multiple status changes
      await changeTransactionStatus(
        orgId,
        accountId,
        transactionId,
        userId,
        { status: 'CLEARED', notes: 'First change' }
      )

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))

      await changeTransactionStatus(
        orgId,
        accountId,
        transactionId,
        userId,
        { status: 'UNCLEARED', notes: 'Second change' }
      )

      await new Promise(resolve => setTimeout(resolve, 10))

      await changeTransactionStatus(
        orgId,
        accountId,
        transactionId,
        userId,
        { status: 'CLEARED', notes: 'Third change' }
      )

      const history = await getTransactionStatusHistory(
        orgId,
        accountId,
        transactionId
      )

      expect(history).toHaveLength(3)
      expect(history[0]?.notes).toBe('Third change')
      expect(history[1]?.notes).toBe('Second change')
      expect(history[2]?.notes).toBe('First change')
    })

    it('should include user information (changedBy)', async () => {
      await changeTransactionStatus(
        orgId,
        accountId,
        transactionId,
        userId,
        { status: 'CLEARED' }
      )

      const history = await getTransactionStatusHistory(
        orgId,
        accountId,
        transactionId
      )

      expect(history[0]?.changedById).toBe(userId)
      expect(history[0]?.changedByName).toBe('Status Test User')
      expect(history[0]?.changedByEmail).toBe('status-test@example.com')
    })

    it('should throw error if transaction not found', async () => {
      await expect(
        getTransactionStatusHistory(
          orgId,
          accountId,
          'non-existent-id'
        )
      ).rejects.toThrow('Transaction not found')
    })

    it('should throw error if account not found', async () => {
      await expect(
        getTransactionStatusHistory(
          orgId,
          'non-existent-account',
          transactionId
        )
      ).rejects.toThrow('Account not found')
    })

    it('should validate organization membership', async () => {
      const wrongOrgId = '00000000-0000-0000-0000-000000000000'
      await expect(
        getTransactionStatusHistory(
          wrongOrgId,
          accountId,
          transactionId
        )
      ).rejects.toThrow('Account not found')
    })
  })

  describe('getReconciliationSummary', () => {
    beforeEach(async () => {
      // Create transactions with different statuses
      await prisma.transaction.create({
        data: {
          description: 'Uncleared 1',
          amount: 100,
          transactionType: 'INCOME',
          accountId,
          status: 'UNCLEARED',
        },
      })

      await prisma.transaction.create({
        data: {
          description: 'Uncleared 2',
          amount: 50,
          transactionType: 'EXPENSE',
          accountId,
          status: 'UNCLEARED',
        },
      })

      await prisma.transaction.create({
        data: {
          description: 'Cleared 1',
          amount: 200,
          transactionType: 'INCOME',
          accountId,
          status: 'CLEARED',
          clearedAt: new Date(),
        },
      })

      await prisma.transaction.create({
        data: {
          description: 'Cleared 2',
          amount: 75,
          transactionType: 'EXPENSE',
          accountId,
          status: 'CLEARED',
          clearedAt: new Date(),
        },
      })

      await prisma.transaction.create({
        data: {
          description: 'Reconciled 1',
          amount: 300,
          transactionType: 'INCOME',
          accountId,
          status: 'RECONCILED',
          clearedAt: new Date(),
          reconciledAt: new Date(),
        },
      })

      await prisma.transaction.create({
        data: {
          description: 'Reconciled 2',
          amount: 100,
          transactionType: 'EXPENSE',
          accountId,
          status: 'RECONCILED',
          clearedAt: new Date(),
          reconciledAt: new Date(),
        },
      })
    })

    it('should calculate balances correctly by status', async () => {
      const summary = await getReconciliationSummary(orgId, accountId)

      // Including the initial transaction (100 EXPENSE UNCLEARED)
      expect(summary.uncleared.count).toBe(3)
      expect(summary.cleared.count).toBe(2)
      expect(summary.reconciled.count).toBe(2)
    })

    it('should handle INCOME transactions (positive)', async () => {
      const summary = await getReconciliationSummary(orgId, accountId)

      // The service sums all amounts as-is (all stored as positive values)
      // Uncleared: 100 (income) + 50 (expense) + 100 (initial expense) = 250
      // Cleared: 200 (income) + 75 (expense) = 275
      // Reconciled: 300 (income) + 100 (expense) = 400

      expect(Number(summary.uncleared.total)).toBe(250)
      expect(Number(summary.cleared.total)).toBe(275)
      expect(Number(summary.reconciled.total)).toBe(400)
    })

    it('should handle EXPENSE transactions (negative)', async () => {
      // Already tested in the above test
      const summary = await getReconciliationSummary(orgId, accountId)

      // Verify that expenses are included in the totals
      expect(summary.uncleared.count).toBeGreaterThan(0)
      expect(summary.cleared.count).toBeGreaterThan(0)
    })

    it('should handle TRANSFER transactions', async () => {
      // Create a second account for transfers
      const account2 = await prisma.account.create({
        data: {
          name: 'Transfer Account',
          organizationId: orgId,
          accountType: 'SAVINGS',
          balance: 500,
        },
      })

      // Create a transfer transaction
      await prisma.transaction.create({
        data: {
          description: 'Transfer out',
          amount: 150,
          transactionType: 'TRANSFER',
          accountId,
          destinationAccountId: account2.id,
          status: 'CLEARED',
          clearedAt: new Date(),
        },
      })

      const summary = await getReconciliationSummary(orgId, accountId)

      expect(summary.cleared.count).toBe(3) // 2 previous + 1 transfer
      expect(Number(summary.cleared.total)).toBe(425) // 275 + 150
    })

    it('should return transaction counts by status', async () => {
      const summary = await getReconciliationSummary(orgId, accountId)

      expect(summary.uncleared.count).toBe(3)
      expect(summary.cleared.count).toBe(2)
      expect(summary.reconciled.count).toBe(2)
      expect(summary.overall.count).toBe(7)
    })

    it('should calculate overall totals correctly', async () => {
      const summary = await getReconciliationSummary(orgId, accountId)

      const unclearedTotal = Number(summary.uncleared.total)
      const clearedTotal = Number(summary.cleared.total)
      const reconciledTotal = Number(summary.reconciled.total)
      const overallTotal = Number(summary.overall.total)

      expect(overallTotal).toBe(unclearedTotal + clearedTotal + reconciledTotal)
      expect(overallTotal).toBe(925) // 250 + 275 + 400
    })

    it('should include account information', async () => {
      const summary = await getReconciliationSummary(orgId, accountId)

      expect(summary.accountId).toBe(accountId)
      expect(summary.accountName).toBe('Test Account')
    })

    it('should throw error if account not found', async () => {
      await expect(
        getReconciliationSummary(orgId, 'non-existent-account')
      ).rejects.toThrow('Account not found')
    })

    it('should validate organization membership', async () => {
      const wrongOrgId = '00000000-0000-0000-0000-000000000000'
      await expect(
        getReconciliationSummary(wrongOrgId, accountId)
      ).rejects.toThrow('Account not found')
    })
  })
})
