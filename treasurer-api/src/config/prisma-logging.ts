import { Prisma } from '@prisma/client'
import { prisma } from './database.js'
import { logQuery } from '../utils/logger.js'

/**
 * Add Prisma middleware to log slow queries
 * This helps identify performance bottlenecks in database operations
 */
export function setupPrismaLogging() {
  prisma.$use(async (params: Prisma.MiddlewareParams, next) => {
    const before = Date.now()

    const result = await next(params)

    const after = Date.now()
    const duration = after - before

    // Create a readable query description
    const query = `${params.model}.${params.action}`

    // Log slow queries (>100ms) as warnings
    logQuery(query, duration, 100)

    return result
  })
}

/**
 * Simple in-memory cache for query results
 * Use sparingly and only for data that doesn't change frequently
 */
class QueryCache {
  private cache: Map<string, { data: unknown; expires: number }> = new Map()
  private readonly defaultTTL = 60000 // 1 minute default

  set(key: string, data: unknown, ttl: number = this.defaultTTL) {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  delete(key: string) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  // Periodically clean expired entries
  startCleanup(interval = 300000) {
    // 5 minutes
    setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expires) {
          this.cache.delete(key)
        }
      }
    }, interval)
  }
}

export const queryCache = new QueryCache()

/**
 * Helper function to cache query results
 * Usage:
 *   const result = await cacheQuery(
 *     'org:123:accounts',
 *     () => prisma.account.findMany({ where: { organizationId: '123' } }),
 *     60000 // 1 minute TTL
 *   )
 */
export async function cacheQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = queryCache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Execute query
  const result = await queryFn()

  // Cache result
  queryCache.set(key, result, ttl)

  return result
}

/**
 * Invalidate cache entries by pattern
 * Example: invalidateCachePattern('org:123') will delete all keys starting with 'org:123'
 */
export function invalidateCachePattern(pattern: string) {
  const keys = Array.from(queryCache['cache'].keys())
  for (const key of keys) {
    if (key.startsWith(pattern)) {
      queryCache.delete(key)
    }
  }
}
