import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { env } from '../config/env.js'
import { sendError } from '../utils/response.js'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.errors)
    return
  }

  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {}
    for (const issue of err.issues) {
      const path = issue.path.join('.')
      if (!errors[path]) {
        errors[path] = []
      }
      errors[path].push(issue.message)
    }
    sendError(res, 'Validation failed', 400, errors)
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      sendError(res, 'A record with this value already exists', 409)
      return
    }
    if (err.code === 'P2025') {
      sendError(res, 'Record not found', 404)
      return
    }
  }

  console.error('Unhandled error:', err)

  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  sendError(res, message, 500)
}
