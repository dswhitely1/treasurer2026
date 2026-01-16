import type { RequestHandler } from 'express'
import {
  createAccount,
  getOrganizationAccounts,
  getAccount,
  updateAccount,
  deleteAccount,
} from '../services/accountService.js'
import { sendSuccess } from '../utils/response.js'
import type { CreateAccountDto, UpdateAccountDto } from '../schemas/account.js'

export const create: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as CreateAccountDto
    const account = await createAccount(req.params.orgId as string, data)
    sendSuccess(res, { account }, 'Account created successfully', 201)
  } catch (error) {
    next(error)
  }
}

export const list: RequestHandler = async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === 'true'
    const accounts = await getOrganizationAccounts(req.params.orgId as string, includeInactive)
    sendSuccess(res, { accounts })
  } catch (error) {
    next(error)
  }
}

export const get: RequestHandler = async (req, res, next) => {
  try {
    const account = await getAccount(req.params.orgId as string, req.params.accountId as string)
    sendSuccess(res, { account })
  } catch (error) {
    next(error)
  }
}

export const update: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as UpdateAccountDto
    const account = await updateAccount(
      req.params.orgId as string,
      req.params.accountId as string,
      data
    )
    sendSuccess(res, { account }, 'Account updated successfully')
  } catch (error) {
    next(error)
  }
}

export const remove: RequestHandler = async (req, res, next) => {
  try {
    await deleteAccount(req.params.orgId as string, req.params.accountId as string)
    sendSuccess(res, null, 'Account deleted successfully')
  } catch (error) {
    next(error)
  }
}
