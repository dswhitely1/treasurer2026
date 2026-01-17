import type { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

/**
 * Performance monitoring middleware
 * - Tracks API response times
 * - Warns on slow requests
 * - Monitors memory usage
 */

const SLOW_REQUEST_THRESHOLD = 1000 // 1 second
const VERY_SLOW_REQUEST_THRESHOLD = 3000 // 3 seconds

export function performanceMonitoring(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()
  const startMemory = process.memoryUsage()

  // Capture when response is finished
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const endMemory = process.memoryUsage()
    const memoryDelta = {
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external,
    }

    const performanceData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      memory: {
        heapUsedMB: (endMemory.heapUsed / 1024 / 1024).toFixed(2),
        heapDeltaMB: (memoryDelta.heapUsed / 1024 / 1024).toFixed(2),
      },
    }

    // Log based on severity
    if (duration > VERY_SLOW_REQUEST_THRESHOLD) {
      logger.error(
        { ...performanceData, type: 'very_slow_request' },
        `Very slow request: ${req.method} ${req.url} (${duration}ms)`
      )
    } else if (duration > SLOW_REQUEST_THRESHOLD) {
      logger.warn(
        { ...performanceData, type: 'slow_request' },
        `Slow request: ${req.method} ${req.url} (${duration}ms)`
      )
    } else {
      logger.debug({ ...performanceData, type: 'request_performance' }, 'Request completed')
    }
  })

  next()
}

/**
 * Metrics collection for monitoring systems
 * Can be exposed via /metrics endpoint for Prometheus
 */
interface Metrics {
  requests: {
    total: number
    by_status: Record<number, number>
    by_method: Record<string, number>
  }
  performance: {
    response_times: number[]
    slow_requests: number
    very_slow_requests: number
  }
  errors: {
    total: number
    by_code: Record<number, number>
  }
}

class MetricsCollector {
  private metrics: Metrics = {
    requests: {
      total: 0,
      by_status: {},
      by_method: {},
    },
    performance: {
      response_times: [],
      slow_requests: 0,
      very_slow_requests: 0,
    },
    errors: {
      total: 0,
      by_code: {},
    },
  }

  // Keep only last 1000 response times to avoid memory leak
  private readonly MAX_RESPONSE_TIMES = 1000

  recordRequest(method: string, statusCode: number, duration: number) {
    this.metrics.requests.total++
    this.metrics.requests.by_status[statusCode] =
      (this.metrics.requests.by_status[statusCode] || 0) + 1
    this.metrics.requests.by_method[method] = (this.metrics.requests.by_method[method] || 0) + 1

    // Track response times
    this.metrics.performance.response_times.push(duration)
    if (this.metrics.performance.response_times.length > this.MAX_RESPONSE_TIMES) {
      this.metrics.performance.response_times.shift()
    }

    // Track slow requests
    if (duration > VERY_SLOW_REQUEST_THRESHOLD) {
      this.metrics.performance.very_slow_requests++
    } else if (duration > SLOW_REQUEST_THRESHOLD) {
      this.metrics.performance.slow_requests++
    }

    // Track errors
    if (statusCode >= 400) {
      this.metrics.errors.total++
      this.metrics.errors.by_code[statusCode] = (this.metrics.errors.by_code[statusCode] || 0) + 1
    }
  }

  getMetrics() {
    const responseTimes = this.metrics.performance.response_times
    const sorted = [...responseTimes].sort((a, b) => a - b)

    return {
      ...this.metrics,
      performance: {
        ...this.metrics.performance,
        avg_response_time:
          responseTimes.length > 0
            ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2)
            : 0,
        p50: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.5)] : 0,
        p95: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0,
        p99: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] : 0,
        min: sorted.length > 0 ? sorted[0] : 0,
        max: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
      },
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      },
    }
  }

  reset() {
    this.metrics = {
      requests: {
        total: 0,
        by_status: {},
        by_method: {},
      },
      performance: {
        response_times: [],
        slow_requests: 0,
        very_slow_requests: 0,
      },
      errors: {
        total: 0,
        by_code: {},
      },
    }
  }
}

export const metricsCollector = new MetricsCollector()

/**
 * Middleware to collect metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startTime
    metricsCollector.recordRequest(req.method, res.statusCode, duration)
  })

  next()
}

/**
 * Get current system metrics
 */
export function getSystemMetrics() {
  const memory = process.memoryUsage()
  const cpuUsage = process.cpuUsage()

  return {
    memory: {
      heapUsed: (memory.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      heapTotal: (memory.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
      external: (memory.external / 1024 / 1024).toFixed(2) + ' MB',
      rss: (memory.rss / 1024 / 1024).toFixed(2) + ' MB',
    },
    cpu: {
      user: (cpuUsage.user / 1000000).toFixed(2) + ' s',
      system: (cpuUsage.system / 1000000).toFixed(2) + ' s',
    },
    uptime: process.uptime().toFixed(2) + ' s',
    nodejs: process.version,
  }
}
