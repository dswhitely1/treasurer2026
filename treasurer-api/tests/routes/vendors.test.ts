import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

const app = createApp();

describe('Vendor Routes', () => {
  let token: string;
  let orgId: string;

  async function setupUserAndOrg() {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'vendor-route-test@example.com',
        password: 'Password123',
        name: 'Vendor Test User',
      });

    token = registerResponse.body.data.token;

    const orgResponse = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Vendor Test Organization' });

    orgId = orgResponse.body.data.id;
  }

  beforeEach(async () => {
    await setupUserAndOrg();
  });

  describe('POST /api/organizations/:orgId/vendors', () => {
    it('should create a new vendor with valid data', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Acme Corp',
          description: 'Office supplies vendor',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.vendor.name).toBe('Acme Corp');
      expect(response.body.data.vendor.description).toBe('Office supplies vendor');
      expect(response.body.data.vendor.organizationId).toBe(orgId);
    });

    it('should create vendor with only name', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Simple Vendor' });

      expect(response.status).toBe(201);
      expect(response.body.data.vendor.name).toBe('Simple Vendor');
      expect(response.body.data.vendor.description).toBeNull();
    });

    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .send({ name: 'Test Vendor' });

      expect(response.status).toBe(401);
    });

    it('should reject creation without name', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'No name vendor' });

      expect(response.status).toBe(400);
    });

    it('should reject empty name', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' });

      expect(response.status).toBe(400);
    });

    it('should reject name longer than 100 characters', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'a'.repeat(101) });

      expect(response.status).toBe(400);
    });

    it('should reject description longer than 500 characters', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Vendor',
          description: 'a'.repeat(501),
        });

      expect(response.status).toBe(400);
    });

    it('should reject duplicate vendor name', async () => {
      await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Acme Corp' });

      const response = await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Acme Corp' });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject creation for non-member organization', async () => {
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'other@example.com',
          password: 'Password123',
        });
      const otherToken = otherUserResponse.body.data.token;

      const otherOrgResponse = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Other Organization' });
      const otherOrgId = otherOrgResponse.body.data.id;

      const response = await request(app)
        .post(`/api/organizations/${otherOrgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Vendor' });

      expect(response.status).toBe(403);
    });

    it('should not allow members to create vendors (OWNER/ADMIN only)', async () => {
      const memberResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member@example.com',
          password: 'Password123',
        });
      const memberToken = memberResponse.body.data.token;

      await request(app)
        .post(`/api/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'member@example.com' });

      const response = await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Test Vendor' });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/organizations/:orgId/vendors', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Acme Corp' });

      await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Beta Inc' });

      await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Gamma LLC' });
    });

    it('should list all vendors for organization', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.vendors).toHaveLength(3);
      expect(response.body.data.total).toBe(3);
    });

    it('should return vendors sorted by name', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.data.vendors[0].name).toBe('Acme Corp');
      expect(response.body.data.vendors[1].name).toBe('Beta Inc');
      expect(response.body.data.vendors[2].name).toBe('Gamma LLC');
    });

    it('should filter vendors by search query', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/vendors?search=acme`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.data.vendors).toHaveLength(1);
      expect(response.body.data.vendors[0].name).toBe('Acme Corp');
    });

    it('should support pagination with limit', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/vendors?limit=2`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.data.vendors).toHaveLength(2);
      expect(response.body.data.total).toBe(3);
    });

    it('should support pagination with offset', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/vendors?limit=2&offset=2`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.data.vendors).toHaveLength(1);
      expect(response.body.data.vendors[0].name).toBe('Gamma LLC');
    });

    it('should reject without authentication', async () => {
      const response = await request(app).get(`/api/organizations/${orgId}/vendors`);

      expect(response.status).toBe(401);
    });

    it('should allow members to list vendors', async () => {
      const memberResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member@example.com',
          password: 'Password123',
        });
      const memberToken = memberResponse.body.data.token;

      await request(app)
        .post(`/api/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'member@example.com' });

      const response = await request(app)
        .get(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/organizations/:orgId/vendors/search', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Amazon' });

      await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Apple Store' });

      await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Best Buy' });
    });

    it('should search vendors by query', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/vendors/search?q=A`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.vendors.length).toBeGreaterThan(0);
    });

    it('should limit search results', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/vendors/search?q=a&limit=1`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.data.vendors).toHaveLength(1);
    });

    it('should require search query parameter', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/vendors/search`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });

    it('should reject empty search query', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/vendors/search?q=`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/organizations/:orgId/vendors/:vendorId', () => {
    let vendorId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Vendor',
          description: 'A test vendor',
        });

      vendorId = createResponse.body.data.vendor.id;
    });

    it('should return vendor details with statistics', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.vendor.id).toBe(vendorId);
      expect(response.body.data.vendor.name).toBe('Test Vendor');
      expect(response.body.data.vendor.description).toBe('A test vendor');
      expect(response.body.data.vendor.transactionCount).toBe(0);
    });

    it('should return 404 for non-existent vendor', async () => {
      const response = await request(app)
        .get(
          `/api/organizations/${orgId}/vendors/00000000-0000-0000-0000-000000000000`
        )
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should reject invalid vendor ID format', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/vendors/invalid-id`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/organizations/:orgId/vendors/:vendorId', () => {
    let vendorId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Original Name', description: 'Original description' });

      vendorId = createResponse.body.data.vendor.id;
    });

    it('should update vendor name', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${orgId}/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.data.vendor.name).toBe('Updated Name');
    });

    it('should update vendor description', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${orgId}/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Updated description' });

      expect(response.status).toBe(200);
      expect(response.body.data.vendor.description).toBe('Updated description');
    });

    it('should set description to null', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${orgId}/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: null });

      expect(response.status).toBe(200);
      expect(response.body.data.vendor.description).toBeNull();
    });

    it('should reject duplicate name', async () => {
      await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Another Vendor' });

      const response = await request(app)
        .patch(`/api/organizations/${orgId}/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Another Vendor' });

      expect(response.status).toBe(409);
    });

    it('should return 404 for non-existent vendor', async () => {
      const response = await request(app)
        .patch(
          `/api/organizations/${orgId}/vendors/00000000-0000-0000-0000-000000000000`
        )
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('should not allow members to update vendors', async () => {
      const memberResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member@example.com',
          password: 'Password123',
        });
      const memberToken = memberResponse.body.data.token;

      await request(app)
        .post(`/api/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'member@example.com' });

      const response = await request(app)
        .patch(`/api/organizations/${orgId}/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/organizations/:orgId/vendors/:vendorId', () => {
    let vendorId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Vendor to Delete' });

      vendorId = createResponse.body.data.vendor.id;
    });

    it('should delete vendor without transactions', async () => {
      const response = await request(app)
        .delete(`/api/organizations/${orgId}/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/organizations/${orgId}/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getResponse.status).toBe(404);
    });

    it('should prevent deletion of vendor with transactions', async () => {
      // Create account and transaction
      const accountResponse = await request(app)
        .post(`/api/organizations/${orgId}/accounts`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Account' });

      const accountId = accountResponse.body.data.account.id;

      await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'Test transaction',
          amount: 100,
          transactionType: 'EXPENSE',
          vendorId,
        });

      const response = await request(app)
        .delete(`/api/organizations/${orgId}/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot delete vendor with transactions');
    });

    it('should return 404 for non-existent vendor', async () => {
      const response = await request(app)
        .delete(
          `/api/organizations/${orgId}/vendors/00000000-0000-0000-0000-000000000000`
        )
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should not allow members to delete vendors', async () => {
      const memberResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'member@example.com',
          password: 'Password123',
        });
      const memberToken = memberResponse.body.data.token;

      await request(app)
        .post(`/api/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'member@example.com' });

      const response = await request(app)
        .delete(`/api/organizations/${orgId}/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });
  });
});
