import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { prisma } from '../../src/config/database.js'
import jwt from 'jsonwebtoken'
import { env } from '../../src/config/env.js'

const app = createApp()

describe('Health Routes', () => {
  let adminToken: string
  let userToken: string

  beforeAll(async () => {
    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@health-test.com',
        password: 'hashed-password',
        name: 'Admin User',
        role: 'ADMIN',
      },
    })

    // Create regular user
    const regularUser = await prisma.user.create({
      data: {
        email: 'user@health-test.com',
        password: 'hashed-password',
        name: 'Regular User',
        role: 'USER',
      },
    })

    // Generate tokens
    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: 'ADMIN' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    userToken = jwt.sign(
      { userId: regularUser.id, email: regularUser.email, role: 'USER' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    )
  })

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe('healthy')
    })
  })

  describe('GET /health/ready', () => {
    it('should return ready status', async () => {
      const response = await request(app).get('/health/ready')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe('ready')
    })
  })

  describe('GET /health/live', () => {
    it('should return alive status', async () => {
      const response = await request(app).get('/health/live')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe('alive')
    })
  })

  describe('GET /health/metrics', () => {
    it('should return metrics for authenticated admin', async () => {
      const response = await request(app)
        .get('/health/metrics')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.system).toBeDefined()
    })

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/health/metrics')

      expect(response.status).toBe(401)
    })

    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/health/metrics')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(403)
      expect(response.body.message).toContain('Insufficient permissions')
    })

    it('should include performance metrics', async () => {
      const response = await request(app)
        .get('/health/metrics')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.system).toBeDefined()
      expect(response.body.data.system.memory).toBeDefined()
      expect(response.body.data.system.uptime).toBeDefined()
    })
  })
})
