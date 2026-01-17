import type { RequestHandler } from 'express'
import {
  createTransaction,
  getAccountTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
} from '../services/transactionService.js'
import { sendSuccess } from '../utils/response.js'
import type {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryDto,
} from '../schemas/transaction.js'

export const create: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as CreateTransactionDto
    const transaction = await createTransaction(
      req.params.orgId as string,
      req.params.accountId as string,
      data
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
    const transaction = await updateTransaction(
      req.params.orgId as string,
      req.params.accountId as string,
      req.params.transactionId as string,
      data
    )
    sendSuccess(res, { transaction }, 'Transaction updated successfully')
  } catch (error) {
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
