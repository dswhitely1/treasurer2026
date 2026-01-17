import { Router, type IRouter } from 'express'
import { prisma } from '../config/database.js'
import { sendSuccess, sendError } from '../utils/response.js'
import { getSystemMetrics, metricsCollector } from '../middleware/performance.js'

export const healthRouter: IRouter = Router()

/**
 * Basic health check
 * Returns 200 if service is up and database is connected
 */
healthRouter.get('/', async (_req, res) => {
  try {
    // Check database connection
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbLatency = Date.now() - dbStart

    const memory = process.memoryUsage()
    const memoryUsagePercent = ((memory.heapUsed / memory.heapTotal) * 100).toFixed(2)

    sendSuccess(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        latency: `${dbLatency}ms`,
      },
      memory: {
        heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        usage: `${memoryUsagePercent}%`,
      },
      uptime: `${process.uptime().toFixed(2)}s`,
    })
  } catch (error) {
    sendError(res, 'Database connection failed', 503)
  }
})

/**
 * Kubernetes readiness probe
 * Returns 200 when service is ready to accept traffic
 */
healthRouter.get('/ready', async (_req, res) => {
  try {
    // Check if database is accessible
    await prisma.$queryRaw`SELECT 1`

    // Check memory usage - not ready if > 90% memory used
    const memory = process.memoryUsage()
    const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100

    if (memoryUsagePercent > 90) {
      sendError(res, 'Service not ready - high memory usage', 503)
      return
    }

    sendSuccess(res, { status: 'ready' })
  } catch {
    sendError(res, 'Service not ready', 503)
  }
})

/**
 * Kubernetes liveness probe
 * Returns 200 if service is alive (should restart if this fails)
 */
healthRouter.get('/live', (_req, res) => {
  // Simple check - if we can respond, we're alive
  sendSuccess(res, { status: 'alive' })
})

/**
 * Performance metrics endpoint
 * Returns collected metrics for monitoring systems
 */
healthRouter.get('/metrics', (_req, res) => {
  const metrics = metricsCollector.getMetrics()
  const systemMetrics = getSystemMetrics()

  sendSuccess(res, {
    ...metrics,
    system: systemMetrics,
  })
})
