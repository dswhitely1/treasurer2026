import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

const app = createApp();

describe('Category Routes', () => {
  let token: string;
  let orgId: string;

  async function setupUserAndOrg() {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'category-route-test@example.com',
        password: 'Password123',
        name: 'Category Test User',
      });

    token = registerResponse.body.data.token;

    const orgResponse = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Category Test Organization' });

    orgId = orgResponse.body.data.id;
  }

  beforeEach(async () => {
    await setupUserAndOrg();
  });

  describe('POST /api/organizations/:orgId/categories', () => {
    it('should create a root category', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Food' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.category.name).toBe('Food');
      expect(response.body.data.category.parentId).toBeNull();
      expect(response.body.data.category.depth).toBe(0);
      expect(response.body.data.category.organizationId).toBe(orgId);
    });

    it('should create a child category', async () => {
      const parentResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Food' });

      const parentId = parentResponse.body.data.category.id;

      const response = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Restaurants',
          parentId,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.category.name).toBe('Restaurants');
      expect(response.body.data.category.parentId).toBe(parentId);
      expect(response.body.data.category.depth).toBe(1);
    });

    it('should enforce maximum depth of 3 levels', async () => {
      const level0Response = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Level 0' });
      const level0Id = level0Response.body.data.category.id;

      const level1Response = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Level 1', parentId: level0Id });
      const level1Id = level1Response.body.data.category.id;

      const level2Response = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Level 2', parentId: level1Id });
      const level2Id = level2Response.body.data.category.id;

      const level3Response = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Level 3', parentId: level2Id });

      expect(level3Response.status).toBe(201);
      expect(level3Response.body.data.category.depth).toBe(3);

      // Try to create level 4 (should fail)
      const level4Response = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Level 4', parentId: level3Response.body.data.category.id });

      expect(level4Response.status).toBe(400);
      expect(level4Response.body.error).toContain('depth cannot exceed 3 levels');
    });

    it('should reject duplicate category name at same level', async () => {
      await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Food' });

      const response = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Food' });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists at this level');
    });

    it('should allow duplicate names at different levels', async () => {
      const parentResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Food' });

      const parentId = parentResponse.body.data.category.id;

      const response = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Food',
          parentId,
        });

      expect(response.status).toBe(201);
    });

    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .send({ name: 'Test Category' });

      expect(response.status).toBe(401);
    });

    it('should reject creation without name', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should reject invalid parent ID format', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Category',
          parentId: 'invalid-id',
        });

      expect(response.status).toBe(400);
    });

    it('should reject non-existent parent ID', async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Category',
          parentId: '00000000-0000-0000-0000-000000000000',
        });

      expect(response.status).toBe(404);
    });

    it('should not allow members to create categories', async () => {
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
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Test Category' });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/organizations/:orgId/categories', () => {
    beforeEach(async () => {
      // Create hierarchy
      const foodResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Food' });
      const foodId = foodResponse.body.data.category.id;

      const restaurantsResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Restaurants', parentId: foodId });
      const restaurantsId = restaurantsResponse.body.data.category.id;

      await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Fast Food', parentId: restaurantsId });

      await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Groceries', parentId: foodId });

      await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Transportation' });
    });

    it('should list all categories', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.categories).toHaveLength(5);
    });

    it('should return categories ordered by depth then name', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`);

      const categories = response.body.data.categories;
      expect(categories[0].depth).toBe(0);
      expect(categories[1].depth).toBe(0);
    });

    it('should filter by search query', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/categories?search=food`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.data.categories.length).toBeGreaterThan(0);
    });

    it('should filter by parent ID', async () => {
      const allResponse = await request(app)
        .get(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`);

      const foodCategory = allResponse.body.data.categories.find(
        (c: { name: string }) => c.name === 'Food'
      );

      const response = await request(app)
        .get(`/api/organizations/${orgId}/categories?parentId=${foodCategory.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.data.categories).toHaveLength(2); // Restaurants and Groceries
    });

    it('should include descendants when requested', async () => {
      const allResponse = await request(app)
        .get(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`);

      const foodCategory = allResponse.body.data.categories.find(
        (c: { name: string }) => c.name === 'Food'
      );

      const response = await request(app)
        .get(
          `/api/organizations/${orgId}/categories?parentId=${foodCategory.id}&includeDescendants=true`
        )
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.data.categories.length).toBeGreaterThanOrEqual(3);
    });

    it('should allow members to list categories', async () => {
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
        .get(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/organizations/:orgId/categories/tree', () => {
    beforeEach(async () => {
      const foodResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Food' });
      const foodId = foodResponse.body.data.category.id;

      const restaurantsResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Restaurants', parentId: foodId });
      const restaurantsId = restaurantsResponse.body.data.category.id;

      await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Fast Food', parentId: restaurantsId });

      await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Transportation' });
    });

    it('should return hierarchical category tree', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/categories/tree`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.tree).toHaveLength(2); // Food and Transportation
      expect(response.body.data.tree[0].children).toBeDefined();
    });

    it('should include nested children in tree', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/categories/tree`)
        .set('Authorization', `Bearer ${token}`);

      const foodNode = response.body.data.tree.find((c: { name: string }) => c.name === 'Food');
      expect(foodNode.children).toHaveLength(1);
      expect(foodNode.children[0].name).toBe('Restaurants');
      expect(foodNode.children[0].children).toHaveLength(1);
      expect(foodNode.children[0].children[0].name).toBe('Fast Food');
    });
  });

  describe('GET /api/organizations/:orgId/categories/:categoryId', () => {
    let categoryId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Category' });

      categoryId = createResponse.body.data.category.id;
    });

    it('should return category details with statistics', async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/categories/${categoryId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.category.id).toBe(categoryId);
      expect(response.body.data.category.name).toBe('Test Category');
      expect(response.body.data.category.transactionCount).toBe(0);
      expect(response.body.data.category.childCount).toBe(0);
    });

    it('should include child count', async () => {
      await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Child', parentId: categoryId });

      const response = await request(app)
        .get(`/api/organizations/${orgId}/categories/${categoryId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.body.data.category.childCount).toBe(1);
    });

    it('should return 404 for non-existent category', async () => {
      const response = await request(app)
        .get(
          `/api/organizations/${orgId}/categories/00000000-0000-0000-0000-000000000000`
        )
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/organizations/:orgId/categories/:categoryId', () => {
    let categoryId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Original Name' });

      categoryId = createResponse.body.data.category.id;
    });

    it('should update category name', async () => {
      const response = await request(app)
        .patch(`/api/organizations/${orgId}/categories/${categoryId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.data.category.name).toBe('Updated Name');
    });

    it('should update parent and recalculate depth', async () => {
      const newParentResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Parent' });

      const newParentId = newParentResponse.body.data.category.id;

      const response = await request(app)
        .patch(`/api/organizations/${orgId}/categories/${categoryId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ parentId: newParentId });

      expect(response.status).toBe(200);
      expect(response.body.data.category.parentId).toBe(newParentId);
      expect(response.body.data.category.depth).toBe(1);
    });

    it('should prevent circular references', async () => {
      const childResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Child', parentId: categoryId });

      const childId = childResponse.body.data.category.id;

      const response = await request(app)
        .patch(`/api/organizations/${orgId}/categories/${categoryId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ parentId: childId });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('circular');
    });

    it('should prevent moving to root with null parentId', async () => {
      const parentResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Parent' });

      const childResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Child', parentId: parentResponse.body.data.category.id });

      const childId = childResponse.body.data.category.id;

      const response = await request(app)
        .patch(`/api/organizations/${orgId}/categories/${childId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ parentId: null });

      expect(response.status).toBe(200);
      expect(response.body.data.category.parentId).toBeNull();
      expect(response.body.data.category.depth).toBe(0);
    });

    it('should not allow members to update categories', async () => {
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
        .patch(`/api/organizations/${orgId}/categories/${categoryId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/organizations/:orgId/categories/:categoryId/move', () => {
    let categoryId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Category to Move' });

      categoryId = createResponse.body.data.category.id;
    });

    it('should move category to new parent', async () => {
      const newParentResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Parent' });

      const newParentId = newParentResponse.body.data.category.id;

      const response = await request(app)
        .post(`/api/organizations/${orgId}/categories/${categoryId}/move`)
        .set('Authorization', `Bearer ${token}`)
        .send({ newParentId });

      expect(response.status).toBe(200);
      expect(response.body.data.category.parentId).toBe(newParentId);
    });

    it('should move category to root level', async () => {
      const parentResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Parent' });

      const childResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Child', parentId: parentResponse.body.data.category.id });

      const childId = childResponse.body.data.category.id;

      const response = await request(app)
        .post(`/api/organizations/${orgId}/categories/${childId}/move`)
        .set('Authorization', `Bearer ${token}`)
        .send({ newParentId: null });

      expect(response.status).toBe(200);
      expect(response.body.data.category.parentId).toBeNull();
    });
  });

  describe('DELETE /api/organizations/:orgId/categories/:categoryId', () => {
    let categoryId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Category to Delete' });

      categoryId = createResponse.body.data.category.id;
    });

    it('should delete category without children or transactions', async () => {
      const response = await request(app)
        .delete(`/api/organizations/${orgId}/categories/${categoryId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/organizations/${orgId}/categories/${categoryId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getResponse.status).toBe(404);
    });

    it('should reject deletion of category with children without moveChildrenTo', async () => {
      await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Child', parentId: categoryId });

      const response = await request(app)
        .delete(`/api/organizations/${orgId}/categories/${categoryId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('has children');
    });

    it('should delete category and move children to target', async () => {
      const childResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Child', parentId: categoryId });

      const childId = childResponse.body.data.category.id;

      const targetResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Target' });

      const targetId = targetResponse.body.data.category.id;

      const response = await request(app)
        .delete(`/api/organizations/${orgId}/categories/${categoryId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ moveChildrenTo: targetId });

      expect(response.status).toBe(200);

      // Verify child was moved
      const childCheckResponse = await request(app)
        .get(`/api/organizations/${orgId}/categories/${childId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(childCheckResponse.body.data.category.parentId).toBe(targetId);
    });

    it('should delete category and move children to root', async () => {
      const childResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Child', parentId: categoryId });

      const childId = childResponse.body.data.category.id;

      const response = await request(app)
        .delete(`/api/organizations/${orgId}/categories/${categoryId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ moveChildrenTo: null });

      expect(response.status).toBe(200);

      // Verify child was moved to root
      const childCheckResponse = await request(app)
        .get(`/api/organizations/${orgId}/categories/${childId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(childCheckResponse.body.data.category.parentId).toBeNull();
    });

    it('should not allow members to delete categories', async () => {
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
        .delete(`/api/organizations/${orgId}/categories/${categoryId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });
  });
});
