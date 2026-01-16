import { createApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './config/database.js'

const app = createApp()

async function main(): Promise<void> {
  try {
    await prisma.$connect()
    console.log('Database connected successfully')

    app.listen(env.PORT, () => {
      console.log(`Server running on http://localhost:${env.PORT}`)
      console.log(`API docs available at http://localhost:${env.PORT}/api-docs`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

main()
