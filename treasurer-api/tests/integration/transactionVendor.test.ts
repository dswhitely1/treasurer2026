import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

const app = createApp();

describe("Transaction-Vendor Integration", () => {
  let token: string;
  let orgId: string;
  let accountId: string;
  let vendorId: string;

  async function setupUserOrgAccountAndVendor() {
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        email: `transaction-vendor-test-${Date.now()}@example.com`,
        password: "Password123",
        name: "Integration Test User",
      });

    token = registerResponse.body.data.token;

    const orgResponse = await request(app)
      .post("/api/organizations")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Integration Test Organization" });

    orgId = orgResponse.body.data.id;

    const accountResponse = await request(app)
      .post(`/api/organizations/${orgId}/accounts`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Test Account",
        accountType: "CHECKING",
        balance: 1000,
      });

    accountId = accountResponse.body.data.account.id;

    const vendorResponse = await request(app)
      .post(`/api/organizations/${orgId}/vendors`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Test Vendor",
        description: "Test vendor for integration",
      });

    vendorId = vendorResponse.body.data.vendor.id;
  }

  beforeEach(async () => {
    await setupUserOrgAccountAndVendor();
  });

  describe("Creating transactions with vendors", () => {
    it("should create transaction with vendor", async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          amount: 100,
          transactionType: "EXPENSE",
          vendorId,
          memo: "Office supplies",
          splits: [{ amount: 100, categoryName: "General" }],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.transaction.vendorId).toBe(vendorId);
      expect(response.body.data.transaction.memo).toBe("Office supplies");
    });

    it("should create transaction without vendor", async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          memo: "Purchase without vendor",
          amount: 50,
          transactionType: "EXPENSE",
          splits: [{ amount: 50, categoryName: "General" }],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.transaction.vendorId).toBeNull();
    });

    it("should reject transaction with non-existent vendor", async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          memo: "Purchase",
          amount: 100,
          transactionType: "EXPENSE",
          vendorId: "00000000-0000-0000-0000-000000000000",
          splits: [{ amount: 100, categoryName: "General" }],
        });

      expect(response.status).toBe(404);
    });

    it("should reject transaction with vendor from different organization", async () => {
      // Create another organization with vendor
      const otherUserResponse = await request(app)
        .post("/api/auth/register")
        .send({
          email: "other-user@example.com",
          password: "Password123",
        });

      const otherToken = otherUserResponse.body.data.token;

      const otherOrgResponse = await request(app)
        .post("/api/organizations")
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ name: "Other Organization" });

      const otherOrgId = otherOrgResponse.body.data.id;

      const otherVendorResponse = await request(app)
        .post(`/api/organizations/${otherOrgId}/vendors`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ name: "Other Vendor" });

      const otherVendorId = otherVendorResponse.body.data.vendor.id;

      // Try to create transaction with other org's vendor
      const response = await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          memo: "Purchase",
          amount: 100,
          transactionType: "EXPENSE",
          vendorId: otherVendorId,
          splits: [{ amount: 100, categoryName: "General" }],
        });

      expect(response.status).toBe(404);
    });
  });

  describe("Updating transactions with vendors", () => {
    let transactionId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          memo: "Initial transaction",
          amount: 100,
          transactionType: "EXPENSE",
          splits: [{ amount: 100, categoryName: "General" }],
        });

      transactionId = response.body.data.transaction.id;
    });

    it("should add vendor to existing transaction", async () => {
      const response = await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ vendorId, version: 1 });

      expect(response.status).toBe(200);
      expect(response.body.data.transaction.vendorId).toBe(vendorId);
    });

    it("should update vendor on transaction", async () => {
      // First add vendor
      await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ vendorId, version: 1 });

      // Create another vendor
      const newVendorResponse = await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "New Vendor" });

      const newVendorId = newVendorResponse.body.data.vendor.id;

      // Update to new vendor
      const response = await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ vendorId: newVendorId, version: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.transaction.vendorId).toBe(newVendorId);
    });

    it("should remove vendor from transaction", async () => {
      // First add vendor
      await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ vendorId, version: 1 });

      // Remove vendor
      const response = await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ vendorId: null, version: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.transaction.vendorId).toBeNull();
    });

    it("should update memo field", async () => {
      const response = await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ memo: "Updated memo text", version: 1 });

      expect(response.status).toBe(200);
      expect(response.body.data.transaction.memo).toBe("Updated memo text");
    });
  });

  describe("Filtering transactions by vendor", () => {
    let vendor1Id: string;
    let vendor2Id: string;

    beforeEach(async () => {
      // Create two vendors
      const vendor1Response = await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Vendor 1" });
      vendor1Id = vendor1Response.body.data.vendor.id;

      const vendor2Response = await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Vendor 2" });
      vendor2Id = vendor2Response.body.data.vendor.id;

      // Create transactions with different vendors
      await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          memo: "Transaction 1",
          amount: 100,
          transactionType: "EXPENSE",
          vendorId: vendor1Id,
          splits: [{ amount: 100, categoryName: "General" }],
        });

      await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          memo: "Transaction 2",
          amount: 200,
          transactionType: "EXPENSE",
          vendorId: vendor1Id,
          splits: [{ amount: 200, categoryName: "General" }],
        });

      await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          memo: "Transaction 3",
          amount: 150,
          transactionType: "EXPENSE",
          vendorId: vendor2Id,
          splits: [{ amount: 150, categoryName: "General" }],
        });

      await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          memo: "Transaction 4",
          amount: 75,
          transactionType: "EXPENSE",
          splits: [{ amount: 75, categoryName: "General" }],
        });
    });

    it("should filter transactions by vendor", async () => {
      const response = await request(app)
        .get(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions?vendorId=${vendor1Id}`,
        )
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.transactions).toHaveLength(2);
      expect(
        response.body.data.transactions.every(
          (t: { vendorId: string }) => t.vendorId === vendor1Id,
        ),
      ).toBe(true);
    });

    it("should list all transactions when no vendor filter", async () => {
      const response = await request(app)
        .get(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.transactions).toHaveLength(4);
    });
  });

  describe("Vendor deletion protection", () => {
    it("should prevent deletion of vendor with transactions", async () => {
      // Create transaction with vendor
      await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          memo: "Purchase",
          amount: 100,
          transactionType: "EXPENSE",
          vendorId,
          splits: [{ amount: 100, categoryName: "General" }],
        });

      // Try to delete vendor
      const response = await request(app)
        .delete(`/api/organizations/${orgId}/vendors/${vendorId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        "Cannot delete vendor with transactions",
      );
    });

    it("should allow deletion of vendor without transactions", async () => {
      // Create a new vendor without transactions
      const newVendorResponse = await request(app)
        .post(`/api/organizations/${orgId}/vendors`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Unused Vendor" });

      const unusedVendorId = newVendorResponse.body.data.vendor.id;

      // Delete vendor
      const response = await request(app)
        .delete(`/api/organizations/${orgId}/vendors/${unusedVendorId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("Vendor statistics", () => {
    it("should reflect transaction count in vendor details", async () => {
      // Create multiple transactions with vendor
      await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          memo: "Purchase 1",
          amount: 100,
          transactionType: "EXPENSE",
          vendorId,
          splits: [{ amount: 100, categoryName: "General" }],
        });

      await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          memo: "Purchase 2",
          amount: 200,
          transactionType: "EXPENSE",
          vendorId,
          splits: [{ amount: 200, categoryName: "General" }],
        });

      // Get vendor details
      const response = await request(app)
        .get(`/api/organizations/${orgId}/vendors/${vendorId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.vendor.transactionCount).toBe(2);
    });
  });

  describe("Memo field", () => {
    it("should save and retrieve memo field", async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          memo: "Purchase",
          amount: 100,
          transactionType: "EXPENSE",
          vendorId,
          memo: "Invoice #12345 - Office supplies for Q1",
          splits: [{ amount: 100, categoryName: "General" }],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.transaction.memo).toBe(
        "Invoice #12345 - Office supplies for Q1",
      );

      // Verify memo is persisted
      const getResponse = await request(app)
        .get(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${response.body.data.transaction.id}`,
        )
        .set("Authorization", `Bearer ${token}`);

      expect(getResponse.body.data.transaction.memo).toBe(
        "Invoice #12345 - Office supplies for Q1",
      );
    });

    it("should allow null memo", async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          amount: 100,
          transactionType: "EXPENSE",
          vendorId,
          splits: [{ amount: 100, categoryName: "General" }],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.transaction.memo).toBeNull();
    });

    it("should allow clearing memo field", async () => {
      // Create with memo
      const createResponse = await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          memo: "Original memo",
          amount: 100,
          transactionType: "EXPENSE",
          vendorId,
          splits: [{ amount: 100, categoryName: "General" }],
        });

      const transactionId = createResponse.body.data.transaction.id;

      // Clear memo
      const updateResponse = await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ memo: null, version: 1 });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.transaction.memo).toBeNull();
    });
  });

  describe("Transaction with hierarchical categories and vendors", () => {
    let categoryId: string;

    beforeEach(async () => {
      // Create a category
      const categoryResponse = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Office Expenses" });

      categoryId = categoryResponse.body.data.category.id;
    });

    it("should create transaction with both vendor and category", async () => {
      const response = await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          memo: "Quarterly office supplies",
          amount: 100,
          transactionType: "EXPENSE",
          vendorId,
          splits: [
            {
              amount: 100,
              categoryName: "Office Expenses",
              categoryId,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.transaction.vendorId).toBe(vendorId);
      expect(response.body.data.transaction.memo).toBe(
        "Quarterly office supplies",
      );
      expect(response.body.data.transaction.splits).toHaveLength(1);
      expect(response.body.data.transaction.splits[0].categoryId).toBe(
        categoryId,
      );
    });

    it("should handle transaction with vendor and multiple category splits", async () => {
      // Create another category
      const category2Response = await request(app)
        .post(`/api/organizations/${orgId}/categories`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Equipment" });

      const category2Id = category2Response.body.data.category.id;

      const response = await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          memo: "Mixed purchase",
          amount: 200,
          transactionType: "EXPENSE",
          vendorId,
          splits: [
            {
              amount: 120,
              categoryName: "Office Expenses",
              categoryId,
            },
            {
              amount: 80,
              categoryName: "Equipment",
              categoryId: category2Id,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.transaction.vendorId).toBe(vendorId);
      expect(response.body.data.transaction.splits).toHaveLength(2);
    });
  });
});
