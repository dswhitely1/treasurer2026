import { createApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './config/database.js'
import { logger } from './utils/logger.js'
import { setupPrismaLogging, queryCache } from './config/prisma-logging.js'

const app = createApp()

async function main(): Promise<void> {
  try {
    // Setup Prisma query logging
    setupPrismaLogging()

    // Start cache cleanup
    queryCache.startCleanup()

    await prisma.$connect()
    logger.info('Database connected successfully')

    app.listen(env.PORT, () => {
      logger.info(
        {
          port: env.PORT,
          environment: env.NODE_ENV,
          nodeVersion: process.version,
        },
        `Server running on http://localhost:${env.PORT}`
      )
      logger.info(`API docs available at http://localhost:${env.PORT}/api-docs`)
    })
  } catch (error) {
    logger.error({ error }, 'Failed to start server')
    process.exit(1)
  }
}

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully')
  await prisma.$disconnect()
  logger.info('Database disconnected')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully')
  await prisma.$disconnect()
  logger.info('Database disconnected')
  process.exit(0)
})

main()
