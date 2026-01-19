import type { RequestHandler } from 'express'
import {
  createTransaction,
  getAccountTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  VersionConflictError,
} from '../services/transactionService.js'
import { getTransactionEditHistory } from '../services/transactionEditHistoryService.js'
import { sendSuccess, sendError } from '../utils/response.js'
import type {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryDto,
} from '../schemas/transaction.js'

export const create: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as CreateTransactionDto
    const userId = req.user?.id
    const transaction = await createTransaction(
      req.params.orgId as string,
      req.params.accountId as string,
      data,
      userId
    )
    sendSuccess(res, { transaction }, 'Transaction created successfully', 201)
  } catch (error) {
    next(error)
  }
}

export const list: RequestHandler = async (req, res, next) => {
  try {
    const query = req.query as unknown as TransactionQueryDto
    const result = await getAccountTransactions(
      req.params.orgId as string,
      req.params.accountId as string,
      query
    )
    sendSuccess(res, result)
  } catch (error) {
    next(error)
  }
}

export const get: RequestHandler = async (req, res, next) => {
  try {
    const transaction = await getTransaction(
      req.params.orgId as string,
      req.params.accountId as string,
      req.params.transactionId as string
    )
    sendSuccess(res, { transaction })
  } catch (error) {
    next(error)
  }
}

export const update: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as UpdateTransactionDto
    const userId = req.user?.id

    if (!userId) {
      sendError(res, 'User not authenticated', 401)
      return
    }

    const transaction = await updateTransaction(
      req.params.orgId as string,
      req.params.accountId as string,
      req.params.transactionId as string,
      data,
      userId
    )
    sendSuccess(res, { transaction }, 'Transaction updated successfully')
  } catch (error) {
    // Handle version conflict errors with detailed metadata
    if (error instanceof VersionConflictError) {
      res.status(409).json({
        success: false,
        message: error.message,
        conflict: {
          currentVersion: error.conflictMetadata.currentVersion,
          lastModifiedById: error.conflictMetadata.lastModifiedById,
          lastModifiedByName: error.conflictMetadata.lastModifiedByName,
          lastModifiedByEmail: error.conflictMetadata.lastModifiedByEmail,
          lastModifiedAt: error.conflictMetadata.lastModifiedAt,
        },
        currentTransaction: error.currentTransaction,
      })
      return
    }
    next(error)
  }
}

export const remove: RequestHandler = async (req, res, next) => {
  try {
    await deleteTransaction(
      req.params.orgId as string,
      req.params.accountId as string,
      req.params.transactionId as string
    )
    sendSuccess(res, null, 'Transaction deleted successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get the edit history for a specific transaction
 * Returns all changes made to the transaction with user information
 */
export const getEditHistory: RequestHandler = async (req, res, next) => {
  try {
    const history = await getTransactionEditHistory(
      req.params.orgId as string,
      req.params.accountId as string,
      req.params.transactionId as string
    )
    sendSuccess(res, { history })
  } catch (error) {
    next(error)
  }
}
