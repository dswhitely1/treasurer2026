/**
 * Frontend Structured Logging Utility
 *
 * Provides consistent logging throughout the application with:
 * - Structured log format
 * - Different log levels
 * - Context enrichment
 * - Integration point for error reporting services
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  url?: string
  userAgent?: string
}

class Logger {
  private isDevelopment: boolean
  private minLevel: LogLevel

  constructor() {
    this.isDevelopment = import.meta.env.DEV
    this.minLevel = this.isDevelopment ? 'debug' : 'info'
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.minLevel)
    const requestedLevelIndex = levels.indexOf(level)
    return requestedLevelIndex >= currentLevelIndex
  }

  private createLogEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent,
    }
  }

  private formatMessage(entry: LogEntry): string {
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : ''
    return `[${entry.level.toUpperCase()}] ${entry.message}${contextStr}`
  }

  private sendLog(entry: LogEntry) {
    if (!this.shouldLog(entry.level)) {
      return
    }

    // Console output
    const message = this.formatMessage(entry)
    switch (entry.level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(message, entry.context)
        }
        break
      case 'info':
        console.info(message, entry.context)
        break
      case 'warn':
        console.warn(message, entry.context)
        break
      case 'error':
        console.error(message, entry.context)
        break
    }

    // Send to external logging service in production
    if (!this.isDevelopment && entry.level === 'error') {
      this.sendToExternalService(entry)
    }
  }

  private sendToExternalService(entry: LogEntry) {
    // Integration point for error reporting services like Sentry, LogRocket, etc.
    // Example with Sentry:
    // if (window.Sentry) {
    //   window.Sentry.captureMessage(entry.message, {
    //     level: entry.level,
    //     extra: entry.context,
    //   })
    // }

    // For now, we'll just store in a queue that could be sent to backend
    try {
      const logs = JSON.parse(localStorage.getItem('error_logs') || '[]')
      logs.push(entry)
      // Keep only last 50 errors
      if (logs.length > 50) {
        logs.shift()
      }
      localStorage.setItem('error_logs', JSON.stringify(logs))
    } catch (error) {
      // Silently fail if localStorage is not available
      console.error('Failed to store error log', error)
    }
  }

  debug(message: string, context?: LogContext) {
    this.sendLog(this.createLogEntry('debug', message, context))
  }

  info(message: string, context?: LogContext) {
    this.sendLog(this.createLogEntry('info', message, context))
  }

  warn(message: string, context?: LogContext) {
    this.sendLog(this.createLogEntry('warn', message, context))
  }

  error(message: string, context?: LogContext) {
    this.sendLog(this.createLogEntry('error', message, context))
  }

  /**
   * Log API errors with full context
   */
  apiError(message: string, error: unknown, context?: LogContext) {
    const errorContext: LogContext = {
      ...context,
      error: error instanceof Error ? error.message : String(error),
    }

    if (error instanceof Error && error.stack) {
      errorContext.stack = error.stack
    }

    this.error(message, errorContext)
  }

  /**
   * Log user actions for debugging
   */
  userAction(action: string, details?: LogContext) {
    this.debug(`User action: ${action}`, details)
  }

  /**
   * Get stored error logs (useful for sending to backend on demand)
   */
  getStoredErrors(): LogEntry[] {
    try {
      return JSON.parse(localStorage.getItem('error_logs') || '[]')
    } catch {
      return []
    }
  }

  /**
   * Clear stored error logs
   */
  clearStoredErrors() {
    try {
      localStorage.removeItem('error_logs')
    } catch {
      // Silently fail
    }
  }
}

export const logger = new Logger()

/**
 * Log unhandled errors and promise rejections
 */
export function setupGlobalErrorHandlers() {
  // Catch unhandled errors
  window.addEventListener('error', (event) => {
    logger.error('Unhandled error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack,
    })
  })

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', {
      reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
      stack: event.reason instanceof Error ? event.reason.stack : undefined,
    })
  })

  logger.debug('Global error handlers initialized')
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(baseContext: LogContext) {
  return {
    debug: (message: string, context?: LogContext) =>
      logger.debug(message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) =>
      logger.info(message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      logger.warn(message, { ...baseContext, ...context }),
    error: (message: string, context?: LogContext) =>
      logger.error(message, { ...baseContext, ...context }),
    apiError: (message: string, error: unknown, context?: LogContext) =>
      logger.apiError(message, error, { ...baseContext, ...context }),
    userAction: (action: string, details?: LogContext) =>
      logger.userAction(action, { ...baseContext, ...details }),
  }
}

// Type declarations for external services
declare global {
  interface Window {
    Sentry?: {
      captureMessage: (message: string, options?: { level?: string; extra?: LogContext }) => void
      captureException: (error: Error, options?: { contexts?: LogContext }) => void
    }
  }
}
