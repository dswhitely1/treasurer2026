import type { RequestHandler } from 'express'
import {
  changeTransactionStatus,
  bulkChangeTransactionStatus,
  getTransactionStatusHistory,
  getReconciliationSummary,
  completeReconciliation as completeReconciliationService,
} from '../services/transactionStatusService.js'
import { sendSuccess } from '../utils/response.js'
import type {
  StatusChangeRequestDto,
  BulkStatusChangeRequestDto,
  CompleteReconciliationRequestDto,
} from '../schemas/transactionStatus.js'

export const changeStatus: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }

    const data = req.body as StatusChangeRequestDto
    const history = await changeTransactionStatus(
      req.params.orgId as string,
      req.params.accountId as string,
      req.params.transactionId as string,
      req.user.id,
      data
    )
    sendSuccess(res, { history }, 'Transaction status updated successfully')
  } catch (error) {
    next(error)
  }
}

export const bulkChangeStatus: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }

    const data = req.body as BulkStatusChangeRequestDto
    const result = await bulkChangeTransactionStatus(
      req.params.orgId as string,
      req.params.accountId as string,
      req.user.id,
      data
    )

    // Return 207 Multi-Status if there are any failures
    if (result.failed.length > 0) {
      res.status(207).json({
        success: true,
        data: result,
        message: `Bulk operation completed with ${result.successful.length} successes and ${result.failed.length} failures`,
      })
      return
    }

    sendSuccess(res, result, 'All transactions updated successfully')
  } catch (error) {
    next(error)
  }
}

export const getStatusHistory: RequestHandler = async (req, res, next) => {
  try {
    const history = await getTransactionStatusHistory(
      req.params.orgId as string,
      req.params.accountId as string,
      req.params.transactionId as string
    )
    sendSuccess(res, { history })
  } catch (error) {
    next(error)
  }
}

export const getSummary: RequestHandler = async (req, res, next) => {
  try {
    const summary = await getReconciliationSummary(
      req.params.orgId as string,
      req.params.accountId as string
    )
    sendSuccess(res, { summary })
  } catch (error) {
    next(error)
  }
}

export const completeReconciliation: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' })
      return
    }

    const data = req.body as CompleteReconciliationRequestDto
    const result = await completeReconciliationService({
      accountId: req.params.accountId as string,
      organizationId: req.params.orgId as string,
      userId: req.user.id,
      statementBalance: data.statementBalance,
      statementDate: data.statementDate,
      transactionIds: data.transactionIds,
      notes: data.notes,
    })

    sendSuccess(res, { result }, 'Reconciliation completed successfully')
  } catch (error) {
    next(error)
  }
}
