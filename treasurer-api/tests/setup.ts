import { beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '../src/config/database.js'

beforeAll(async () => {
  // Setup test database connection
})

beforeEach(async () => {
  // Clean up database before each test in the correct order
  // Delete in order to respect foreign key constraints
  await prisma.transactionStatusHistory.deleteMany()
  await prisma.transactionSplit.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.account.deleteMany()
  await prisma.category.deleteMany()
  await prisma.vendor.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
