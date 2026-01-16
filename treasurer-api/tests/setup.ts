import { beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '../src/config/database.js'

beforeAll(async () => {
  // Setup test database connection
})

beforeEach(async () => {
  // Clean up database before each test
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`)
      } catch {
        // Table may not exist in test environment
      }
    }
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})
