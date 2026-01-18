import rateLimit from 'express-rate-limit'
import type { RequestHandler } from 'express'

/**
 * Rate limiter for search/autocomplete endpoints
 * Limits: 60 requests per minute per user
 */
export const searchRateLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Rate limit per authenticated user ID only (no IP fallback to avoid IPv6 issues)
    // If not authenticated, the auth middleware will reject the request anyway
    return req.user?.id ?? 'unauthenticated'
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    })
  },
  skip: (req) => {
    // Skip rate limiting if user is not authenticated (auth middleware will handle)
    return !req.user
  },
})

/**
 * Rate limiter for tree/hierarchy operations
 * Limits: 30 requests per minute per user
 */
export const treeRateLimiter: RequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per authenticated user ID only (no IP fallback to avoid IPv6 issues)
    // If not authenticated, the auth middleware will reject the request anyway
    return req.user?.id ?? 'unauthenticated'
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    })
  },
  skip: (req) => {
    // Skip rate limiting if user is not authenticated (auth middleware will handle)
    return !req.user
  },
})
