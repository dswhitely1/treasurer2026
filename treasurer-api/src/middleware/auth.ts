import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { AppError } from './errorHandler.js'
import type { JwtPayload } from '../types/index.js'

export const authenticate: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401)
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role as 'USER' | 'ADMIN',
    }
    next()
  } catch {
    throw new AppError('Invalid or expired token', 401)
  }
}

export const requireRole = (...roles: string[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401)
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403)
    }

    next()
  }
}
