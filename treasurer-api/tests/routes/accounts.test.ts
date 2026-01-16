import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { prisma } from '../../src/config/database.js'

const app = createApp()

describe('Account Routes', () => {
  let token: string
  let orgId: string
  let userId: string

  // Helper to create a user and organization for tests
  async function setupUserAndOrg() {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'account-test@example.com',
        password: 'Password123',
        name: 'Test User',
      })

    token = registerResponse.body.data.token
    userId = registerResponse.body.data.user.id

    const orgResponse = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Organization' })

    orgId = orgResponse.body.data.id
  }

  beforeEach(async () => {
    await setupUserAndOrg()
  })

  describe('POST /api/organizations/:orgId/accounts', () => {
    it('should create a new account with valid data', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Main Checking',
          accountType: 'CHECKING',
          balance: 1000,
          currency: 'USD',
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.account.name).toBe('Main Checking')
      expect(response.body.data.account.accountType).toBe('CHECKING')
      expect(response.body.data.account.balance).toBe('1000')
      expect(response.body.data.account.currency).toBe('USD')
      expect(response.body.data.account.organizationId).toBe(orgId)
    })

    it('should create account with minimal data (name only)', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Simple Account' })

      expect(response.status).toBe(201)
      expect(response.body.data.account.name).toBe('Simple Account')
      expect(response.body.data.account.accountType).toBe('CHECKING')
      expect(response.body.data.account.balance).toBe('0')
      expect(response.body.data.account.currency).toBe('USD')
    })

    it('should create account with institution name', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Savings Account',
          institution: 'Chase Bank',
          accountType: 'SAVINGS',
        })

      expect(response.status).toBe(201)
      expect(response.body.data.account.institution).toBe('Chase Bank')
    })

    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/accounts`)
        .send({ name: 'Test Account' })

      expect(response.status).toBe(401)
    })

    it('should reject creation without name', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)
        .send({ accountType: 'CHECKING' })

      expect(response.status).toBe(400)
    })

    it('should reject creation with invalid account type', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Account',
          accountType: 'INVALID_TYPE',
        })

      expect(response.status).toBe(400)
    })

    it('should reject creation for non-member organization', async () => {
      // Create another user and org
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'other@example.com',
          password: 'Password123',
        })
      const otherToken = otherUserResponse.body.data.token

      const otherOrgResponse = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Other Organization' })
      const otherOrgId = otherOrgResponse.body.data.id

      // Try to create account in other org with original user
      const response = await request(app)
        .post(`/api/organizations/${otherOrgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Account' })

      expect(response.status).toBe(403)
    })
  })

  describe('GET /api/organizations/:orgId/accounts', () => {
    beforeEach(async () => {
      // Create some accounts
      await request(app)
        .post(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Checking Account', accountType: 'CHECKING' })

      await request(app)
        .post(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Savings Account', accountType: 'SAVINGS' })
    })

    it('should list all accounts for organization', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.accounts).toHaveLength(2)
    })

    it('should only list active accounts by default', async () => {
      // Deactivate one account
      const listResponse = await request(app)
        .get(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)

      const accountId = listResponse.body.data.accounts[0].id

      await request(app)
        .patch(`/api/organizations/${orgId}/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })

      const response = await request(app)
        .get(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.body.data.accounts).toHaveLength(1)
    })

    it('should include inactive accounts when requested', async () => {
      // Deactivate one account
      const listResponse = await request(app)
        .get(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)

      const accountId = listResponse.body.data.accounts[0].id

      await request(app)
        .patch(`/api/organizations/${orgId}/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })

      const response = await request(app)
        .get(`/api/organizations/${orgId}/accounts?includeInactive=true`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.body.data.accounts).toHaveLength(2)
    })

    it('should reject without authentication', async () => {
      const response = await request(app).get(`/api/organizations/${orgId}/accounts`)

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/organizations/:orgId/accounts/:accountId', () => {
    let accountId: string

    beforeEach(async () => {
      const createResponse = await request(app)
        .post(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Account',
          description: 'A test account',
          institution: 'Test Bank',
        })

      accountId = createResponse.body.data.account.id
    })

    it('should return account details', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body.data.account.id).toBe(accountId)
      expect(response.body.data.account.name).toBe('Test Account')
      expect(response.body.data.account.description).toBe('A test account')
      expect(response.body.data.account.institution).toBe('Test Bank')
    })

    it('should return 404 for non-existent account', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/accounts/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /api/organizations/:orgId/accounts/:accountId', () => {
    let accountId: string

    beforeEach(async () => {
      const createResponse = await request(app)
        .post(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Original Name', balance: 100 })

      accountId = createResponse.body.data.account.id
    })

    it('should update account name', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${orgId}/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' })

      expect(response.status).toBe(200)
      expect(response.body.data.account.name).toBe('Updated Name')
    })

    it('should update account balance', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${orgId}/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ balance: 500.50 })

      expect(response.status).toBe(200)
      expect(response.body.data.account.balance).toBe('500.5')
    })

    it('should deactivate account', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${orgId}/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })

      expect(response.status).toBe(200)
      expect(response.body.data.account.isActive).toBe(false)
    })

    it('should return 404 for non-existent account', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${orgId}/accounts/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/organizations/:orgId/accounts/:accountId', () => {
    let accountId: string

    beforeEach(async () => {
      const createResponse = await request(app)
        .post(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Account to Delete' })

      accountId = createResponse.body.data.account.id
    })

    it('should delete account', async () => {
      const response = await request(app)
        .delete(`/api/organizations/${orgId}/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body.message).toContain('deleted')

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/organizations/${orgId}/accounts/${accountId}`)
        .set('Authorization', `Bearer ${token}`)

      expect(getResponse.status).toBe(404)
    })

    it('should return 404 for non-existent account', async () => {
      const response = await request(app)
        .delete(`/api/organizations/${orgId}/accounts/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(404)
    })
  })

  describe('Role-based access control', () => {
    let memberToken: string

    beforeEach(async () => {
      // Create a member user
      const memberResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member@example.com',
          password: 'Password123',
        })
      memberToken = memberResponse.body.data.token

      // Add as member to the organization
      await request(app)
        .post(`/api/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'member@example.com' })
    })

    it('should allow members to list accounts', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${memberToken}`)

      expect(response.status).toBe(200)
    })

    it('should not allow members to create accounts', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Test Account' })

      expect(response.status).toBe(403)
    })

    it('should not allow members to update accounts', async () => {
      // First create an account as owner
      const createResponse = await request(app)
        .post(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Account' })

      const accountId = createResponse.body.data.account.id

      // Try to update as member
      const response = await request(app)
        .patch(`/api/organizations/${orgId}/accounts/${accountId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Updated Name' })

      expect(response.status).toBe(403)
    })

    it('should not allow members to delete accounts', async () => {
      // First create an account as owner
      const createResponse = await request(app)
        .post(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Account' })

      const accountId = createResponse.body.data.account.id

      // Try to delete as member
      const response = await request(app)
        .delete(`/api/organizations/${orgId}/accounts/${accountId}`)
        .set('Authorization', `Bearer ${memberToken}`)

      expect(response.status).toBe(403)
    })
  })
})
