import { Router, type IRouter } from 'express'
import { prisma } from '../config/database.js'
import { sendSuccess, sendError } from '../utils/response.js'

export const healthRouter: IRouter = Router()

healthRouter.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    sendSuccess(res, { status: 'healthy', database: 'connected' })
  } catch {
    sendError(res, 'Database connection failed', 503)
  }
})
