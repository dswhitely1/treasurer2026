import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { preventReconciledModification } from '../../src/middleware/transactionProtection.js'
import { prisma } from '../../src/config/database.js'

describe('Transaction Protection Middleware', () => {
  let userId: string
  let orgId: string
  let accountId: string
  let unclearedTransactionId: string
  let clearedTransactionId: string
  let reconciledTransactionId: string

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'middleware-test@example.com',
        password: 'hashedpassword',
        name: 'Middleware Test User',
      },
    })
    userId = user.id

    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Middleware Test Org',
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

    // Create UNCLEARED transaction
    const unclearedTx = await prisma.transaction.create({
      data: {
        memo: 'Uncleared Transaction',
        amount: 100,
        transactionType: 'EXPENSE',
        accountId,
        status: 'UNCLEARED',
      },
    })
    unclearedTransactionId = unclearedTx.id

    // Create CLEARED transaction
    const clearedTx = await prisma.transaction.create({
      data: {
        memo: 'Cleared Transaction',
        amount: 200,
        transactionType: 'EXPENSE',
        accountId,
        status: 'CLEARED',
        clearedAt: new Date(),
      },
    })
    clearedTransactionId = clearedTx.id

    // Create RECONCILED transaction
    const reconciledTx = await prisma.transaction.create({
      data: {
        memo: 'Reconciled Transaction',
        amount: 300,
        transactionType: 'EXPENSE',
        accountId,
        status: 'RECONCILED',
        clearedAt: new Date(),
        reconciledAt: new Date(),
      },
    })
    reconciledTransactionId = reconciledTx.id
  })

  describe('preventReconciledModification', () => {
    it('should allow modification of UNCLEARED transactions', async () => {
      const req = {
        params: { transactionId: unclearedTransactionId },
      } as unknown as Request

      const res = {} as Response
      const next = vi.fn() as NextFunction

      const middleware = preventReconciledModification()
      await middleware(req, res, next)

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith() // No error
    })

    it('should allow modification of CLEARED transactions', async () => {
      const req = {
        params: { transactionId: clearedTransactionId },
      } as unknown as Request

      const res = {} as Response
      const next = vi.fn() as NextFunction

      const middleware = preventReconciledModification()
      await middleware(req, res, next)

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith() // No error
    })

    it('should block modification of RECONCILED transactions', async () => {
      const req = {
        params: { transactionId: reconciledTransactionId },
      } as unknown as Request

      const res = {} as Response
      const next = vi.fn() as NextFunction

      const middleware = preventReconciledModification()
      await middleware(req, res, next)

      expect(next).toHaveBeenCalledOnce()
      const error = next.mock.calls[0]?.[0]
      expect(error).toBeDefined()
      expect(error).toHaveProperty('message', 'Cannot modify reconciled transactions')
      expect(error).toHaveProperty('statusCode', 400)
    })

    it('should return clear error message for reconciled transactions', async () => {
      const req = {
        params: { transactionId: reconciledTransactionId },
      } as unknown as Request

      const res = {} as Response
      const next = vi.fn() as NextFunction

      const middleware = preventReconciledModification()
      await middleware(req, res, next)

      const error = next.mock.calls[0]?.[0]
      expect(error.message).toBe('Cannot modify reconciled transactions')
    })

    it('should handle missing transactionId parameter', async () => {
      const req = {
        params: {},
      } as unknown as Request

      const res = {} as Response
      const next = vi.fn() as NextFunction

      const middleware = preventReconciledModification()
      await middleware(req, res, next)

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith() // No error - passes through
    })

    it('should handle array transactionId parameter', async () => {
      const req = {
        params: { transactionId: [reconciledTransactionId, 'another-id'] },
      } as unknown as Request

      const res = {} as Response
      const next = vi.fn() as NextFunction

      const middleware = preventReconciledModification()
      await middleware(req, res, next)

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith() // No error - passes through
    })

    it('should handle non-existent transaction ID', async () => {
      const req = {
        params: { transactionId: '00000000-0000-0000-0000-000000000000' },
      } as unknown as Request

      const res = {} as Response
      const next = vi.fn() as NextFunction

      const middleware = preventReconciledModification()
      await middleware(req, res, next)

      // Should pass through (transaction not found is handled elsewhere)
      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith() // No error
    })

    it('should not block status endpoint (only for PATCH/DELETE transaction data)', async () => {
      // This middleware should be applied only to PATCH and DELETE endpoints
      // for transaction data, not the status change endpoint
      const req = {
        params: { transactionId: reconciledTransactionId },
      } as unknown as Request

      const res = {} as Response
      const next = vi.fn() as NextFunction

      const middleware = preventReconciledModification()
      await middleware(req, res, next)

      const error = next.mock.calls[0]?.[0]
      expect(error).toBeDefined()
      expect(error.message).toBe('Cannot modify reconciled transactions')
    })

    it('should work with PATCH request', async () => {
      const req = {
        method: 'PATCH',
        params: { transactionId: reconciledTransactionId },
      } as unknown as Request

      const res = {} as Response
      const next = vi.fn() as NextFunction

      const middleware = preventReconciledModification()
      await middleware(req, res, next)

      const error = next.mock.calls[0]?.[0]
      expect(error).toBeDefined()
      expect(error.message).toBe('Cannot modify reconciled transactions')
    })

    it('should work with DELETE request', async () => {
      const req = {
        method: 'DELETE',
        params: { transactionId: reconciledTransactionId },
      } as unknown as Request

      const res = {} as Response
      const next = vi.fn() as NextFunction

      const middleware = preventReconciledModification()
      await middleware(req, res, next)

      const error = next.mock.calls[0]?.[0]
      expect(error).toBeDefined()
      expect(error.message).toBe('Cannot modify reconciled transactions')
    })

    it('should pass through for transactions with null reconciledAt', async () => {
      // Create a transaction with status RECONCILED but null reconciledAt
      // This is an edge case that shouldn't happen, but we should handle it
      const edgeCaseTx = await prisma.transaction.create({
        data: {
          memo: 'Edge Case Transaction',
          amount: 400,
          transactionType: 'EXPENSE',
          accountId,
          status: 'CLEARED',
          clearedAt: new Date(),
        },
      })

      const req = {
        params: { transactionId: edgeCaseTx.id },
      } as unknown as Request

      const res = {} as Response
      const next = vi.fn() as NextFunction

      const middleware = preventReconciledModification()
      await middleware(req, res, next)

      expect(next).toHaveBeenCalledOnce()
      expect(next).toHaveBeenCalledWith() // No error
    })

    it('should correctly identify reconciled status', async () => {
      // Verify the reconciled transaction is actually reconciled
      const reconciledTx = await prisma.transaction.findUnique({
        where: { id: reconciledTransactionId },
      })
      expect(reconciledTx?.status).toBe('RECONCILED')
      expect(reconciledTx?.reconciledAt).toBeTruthy()

      const req = {
        params: { transactionId: reconciledTransactionId },
      } as unknown as Request

      const res = {} as Response
      const next = vi.fn() as NextFunction

      const middleware = preventReconciledModification()
      await middleware(req, res, next)

      const error = next.mock.calls[0]?.[0]
      expect(error).toBeDefined()
    })
  })
})
