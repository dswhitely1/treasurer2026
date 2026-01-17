import pino from 'pino'
import { env } from '../config/env.js'

/**
 * Pino logger instance with structured logging
 * - JSON format in production
 * - Pretty format in development
 * - Silent in test environment
 */
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'production' ? 'info' : 'debug',
  formatters: {
    level: (label) => {
      return { level: label }
    },
    bindings: (bindings) => {
      return {
        pid: bindings.pid,
        hostname: bindings.hostname,
        node_version: process.version,
      }
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Use pino-pretty in development for better readability
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'HH:MM:ss.l',
            singleLine: false,
          },
        }
      : undefined,
})

/**
 * Create a child logger with additional context
 * Useful for adding request-specific context to all log entries
 */
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context)
}

/**
 * Log database query performance
 * Logs queries that exceed the threshold as warnings
 */
export function logQuery(query: string, duration: number, threshold = 100) {
  if (duration > threshold) {
    logger.warn(
      {
        query,
        duration,
        type: 'slow_query',
      },
      `Slow database query detected (${duration}ms)`
    )
  } else {
    logger.debug(
      {
        query,
        duration,
        type: 'query',
      },
      'Database query executed'
    )
  }
}

/**
 * Log errors with full context
 */
export function logError(error: Error | unknown, context?: Record<string, unknown>) {
  if (error instanceof Error) {
    logger.error(
      {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        ...context,
      },
      error.message
    )
  } else {
    logger.error(
      {
        error: String(error),
        ...context,
      },
      'Unknown error occurred'
    )
  }
}

/**
 * Performance marker for critical operations
 */
export class PerformanceMarker {
  private startTime: number
  private operation: string
  private context: Record<string, unknown>

  constructor(operation: string, context: Record<string, unknown> = {}) {
    this.operation = operation
    this.context = context
    this.startTime = Date.now()
    logger.debug({ operation, ...context }, `Starting: ${operation}`)
  }

  end(additionalContext?: Record<string, unknown>) {
    const duration = Date.now() - this.startTime
    const logContext = {
      operation: this.operation,
      duration,
      ...this.context,
      ...additionalContext,
    }

    if (duration > 1000) {
      logger.warn(logContext, `Slow operation completed: ${this.operation} (${duration}ms)`)
    } else {
      logger.debug(logContext, `Completed: ${this.operation} (${duration}ms)`)
    }

    return duration
  }
}
