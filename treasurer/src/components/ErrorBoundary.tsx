import type { ErrorInfo, ReactNode } from 'react'
import type React from 'react'
import { Component } from 'react'
import { logger } from '@/utils/logger'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary Component
 *
 * Catches React errors in the component tree and displays a fallback UI.
 * Logs errors for debugging and can be integrated with error reporting services.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <YourComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console and structured logger
    logger.error('React Error Boundary caught an error', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
    })

    // Update state with error info
    this.setState({
      errorInfo,
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Here you could send to error reporting service like Sentry:
    // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-2xl p-8">
            <div className="text-center">
              <div className="mb-4 text-6xl">⚠️</div>
              <h1 className="mb-2 text-2xl font-bold text-gray-900">
                Oops! Something went wrong
              </h1>
              <p className="mb-6 text-gray-600">
                We&apos;re sorry, but an unexpected error occurred. Our team has
                been notified and is working to fix the issue.
              </p>

              {this.state.error && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-left">
                  <h3 className="mb-2 text-sm font-semibold text-red-900">
                    Error Details:
                  </h3>
                  <p className="break-all font-mono text-sm text-red-800">
                    {this.state.error.message}
                  </p>
                  {process.env.NODE_ENV === 'development' &&
                    this.state.error.stack && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold text-red-900">
                          Stack Trace
                        </summary>
                        <pre className="mt-2 max-h-64 overflow-auto text-xs text-red-700">
                          {this.state.error.stack}
                        </pre>
                      </details>
                    )}
                  {process.env.NODE_ENV === 'development' &&
                    this.state.errorInfo?.componentStack && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold text-red-900">
                          Component Stack
                        </summary>
                        <pre className="mt-2 max-h-64 overflow-auto text-xs text-red-700">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                </div>
              )}

              <div className="flex justify-center gap-3">
                <Button onClick={this.handleReset} variant="primary">
                  Try Again
                </Button>
                <Button
                  onClick={() => {
                    window.location.href = '/'
                  }}
                  variant="secondary"
                >
                  Go to Home
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <p className="mt-6 text-xs text-gray-500">
                  Development mode: Full error details are shown above
                </p>
              )}
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook-based wrapper for functional components
 * Note: This doesn't catch errors in event handlers or async code
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
