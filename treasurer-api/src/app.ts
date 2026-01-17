import express, { type Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import swaggerUi from 'swagger-ui-express'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger, correlationId } from './middleware/logging.js'
import { performanceMonitoring, metricsMiddleware } from './middleware/performance.js'
import { healthRouter } from './routes/health.js'
import { authRouter } from './routes/auth.js'
import { userRouter } from './routes/users.js'
import organizationRouter from './routes/organizations.js'
import { openApiSpec } from './config/openapi.js'

export function createApp(): Express {
  const app = express()

  // Security middleware
  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN }))

  // Compression middleware - gzip/deflate responses
  app.use(compression())

  // Request parsing
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Observability middleware
  if (env.NODE_ENV !== 'test') {
    app.use(correlationId) // Add correlation IDs to all requests
    app.use(requestLogger) // Structured logging with Pino
    app.use(performanceMonitoring) // Track response times
    app.use(metricsMiddleware) // Collect metrics
  }

  // API Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec))

  // Routes
  app.use('/health', healthRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/users', userRouter)
  app.use('/api/organizations', organizationRouter)

  // Error handling
  app.use(errorHandler)

  return app
}
