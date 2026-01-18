import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/config/database.js";

const app = createApp();

describe("Transaction Status Routes", () => {
  let token: string;
  let orgId: string;
  let accountId: string;
  let transactionId: string;
  let userId: string;

  // Helper to create a user, organization, account, and transaction
  async function setupTestData() {
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        email: "status-route-test@example.com",
        password: "Password123",
        name: "Status Route Test User",
      });

    token = registerResponse.body.data.token;
    userId = registerResponse.body.data.user.id;

    const orgResponse = await request(app)
      .post("/api/organizations")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test Organization" });

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

    const transactionResponse = await request(app)
      .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        description: "Test Transaction",
        amount: 100,
        transactionType: "EXPENSE",
        date: new Date().toISOString(),
        splits: [{ amount: 100, categoryName: "Test Category" }],
      });

    if (!transactionResponse.body.data?.transaction) {
      throw new Error(
        `Transaction creation failed: ${JSON.stringify(transactionResponse.body)}`,
      );
    }

    transactionId = transactionResponse.body.data.transaction.id;
  }

  beforeEach(async () => {
    await setupTestData();
  });

  describe("PATCH /api/organizations/:orgId/accounts/:accountId/transactions/:transactionId/status", () => {
    it("should change status successfully with auth", async () => {
      const response = await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "CLEARED" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.history.fromStatus).toBe("UNCLEARED");
      expect(response.body.data.history.toStatus).toBe("CLEARED");
      expect(response.body.data.history.changedById).toBe(userId);

      // Verify transaction was updated
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      });
      expect(transaction?.status).toBe("CLEARED");
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
        )
        .send({ status: "CLEARED" });

      expect(response.status).toBe(401);
    });

    it("should return 403 without organization membership", async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post("/api/auth/register")
        .send({
          email: "other-user@example.com",
          password: "Password123",
        });
      const otherToken = otherUserResponse.body.data.token;

      const response = await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
        )
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ status: "CLEARED" });

      expect(response.status).toBe(403);
    });

    it("should return 400 on invalid transition", async () => {
      const response = await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "RECONCILED" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid status transition");
    });

    it("should return 404 for non-existent transaction", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${fakeId}/status`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "CLEARED" });

      expect(response.status).toBe(404);
    });

    it("should return updated transaction with statusHistory", async () => {
      const response = await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "CLEARED", notes: "Test notes" });

      expect(response.status).toBe(200);
      expect(response.body.data.history).toBeDefined();
      expect(response.body.data.history.notes).toBe("Test notes");
    });

    it("should validate Zod schema for request body", async () => {
      // Invalid status value
      const response = await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "INVALID_STATUS" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should reject notes longer than 500 characters", async () => {
      const longNotes = "a".repeat(501);
      const response = await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "CLEARED", notes: longNotes });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should accept notes within 500 character limit", async () => {
      const validNotes = "a".repeat(500);
      const response = await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "CLEARED", notes: validNotes });

      expect(response.status).toBe(200);
      expect(response.body.data.history.notes).toBe(validNotes);
    });

    it("should handle concurrent updates gracefully", async () => {
      // Make two concurrent status change requests
      const [response1, response2] = await Promise.all([
        request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({ status: "CLEARED" }),
        request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({ status: "CLEARED" }),
      ]);

      // One should succeed, one should fail with "already CLEARED"
      const statuses = [response1.status, response2.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(400);
    });
  });

  describe("POST /api/organizations/:orgId/accounts/:accountId/transactions/status/bulk", () => {
    let transaction2Id: string;
    let transaction3Id: string;

    beforeEach(async () => {
      // Create additional transactions
      const tx2Response = await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          description: "Transaction 2",
          amount: 200,
          transactionType: "EXPENSE",
          date: new Date().toISOString(),
          splits: [{ amount: 200, categoryName: "Test Category" }],
        });
      transaction2Id = tx2Response.body.data.transaction.id;

      const tx3Response = await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          description: "Transaction 3",
          amount: 300,
          transactionType: "INCOME",
          date: new Date().toISOString(),
          splits: [{ amount: 300, categoryName: "Test Category" }],
        });
      transaction3Id = tx3Response.body.data.transaction.id;
    });

    it("should update multiple transactions successfully", async () => {
      const response = await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/bulk`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({
          transactionIds: [transactionId, transaction2Id, transaction3Id],
          status: "CLEARED",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.successful).toHaveLength(3);
      expect(response.body.data.failed).toHaveLength(0);

      // Verify all transactions were updated
      const transactions = await prisma.transaction.findMany({
        where: { id: { in: [transactionId, transaction2Id, transaction3Id] } },
      });
      expect(transactions.every((tx) => tx.status === "CLEARED")).toBe(true);
    });

    it("should return 207 Multi-Status on partial failure", async () => {
      // Set one transaction to RECONCILED
      await prisma.transaction.update({
        where: { id: transaction2Id },
        data: {
          status: "RECONCILED",
          clearedAt: new Date(),
          reconciledAt: new Date(),
        },
      });

      const response = await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/bulk`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({
          transactionIds: [transactionId, transaction2Id, transaction3Id],
          status: "CLEARED",
        });

      expect(response.status).toBe(207);
      expect(response.body.data.successful).toHaveLength(2);
      expect(response.body.data.failed).toHaveLength(1);
      expect(response.body.message).toContain("2 successes and 1 failures");
    });

    it("should return detailed results array", async () => {
      const response = await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/bulk`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({
          transactionIds: [transactionId, transaction2Id],
          status: "CLEARED",
        });

      expect(response.body.data.successful).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            transactionId: expect.any(String),
            status: "CLEARED",
          }),
        ]),
      );
      expect(response.body.data.failed).toEqual([]);
    });

    it("should return 400 if batch size exceeds 100", async () => {
      const manyIds = Array.from(
        { length: 101 },
        (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
      );

      const response = await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/bulk`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({
          transactionIds: manyIds,
          status: "CLEARED",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/bulk`,
        )
        .send({
          transactionIds: [transactionId],
          status: "CLEARED",
        });

      expect(response.status).toBe(401);
    });

    it("should return 403 without organization membership", async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post("/api/auth/register")
        .send({
          email: "other-user2@example.com",
          password: "Password123",
        });
      const otherToken = otherUserResponse.body.data.token;

      const response = await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/bulk`,
        )
        .set("Authorization", `Bearer ${otherToken}`)
        .send({
          transactionIds: [transactionId],
          status: "CLEARED",
        });

      expect(response.status).toBe(403);
    });

    it("should validate all transaction IDs exist", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/bulk`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({
          transactionIds: [transactionId, fakeId],
          status: "CLEARED",
        });

      expect(response.status).toBe(207);
      expect(response.body.data.successful).toHaveLength(1);
      expect(response.body.data.failed).toHaveLength(1);
      expect(response.body.data.failed[0]?.error).toBe("Transaction not found");
    });

    it("should create audit trail for all successful changes", async () => {
      await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/bulk`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({
          transactionIds: [transactionId, transaction2Id, transaction3Id],
          status: "CLEARED",
          notes: "Bulk operation",
        });

      const history = await prisma.transactionStatusHistory.findMany({
        where: {
          transactionId: {
            in: [transactionId, transaction2Id, transaction3Id],
          },
        },
      });

      expect(history).toHaveLength(3);
      expect(history.every((h) => h.toStatus === "CLEARED")).toBe(true);
      expect(history.every((h) => h.notes === "Bulk operation")).toBe(true);
    });

    it("should reject empty transaction ID array", async () => {
      const response = await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/bulk`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({
          transactionIds: [],
          status: "CLEARED",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should reject invalid transaction ID format", async () => {
      const response = await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/bulk`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({
          transactionIds: ["not-a-uuid"],
          status: "CLEARED",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/organizations/:orgId/accounts/:accountId/transactions/:transactionId/status/history", () => {
    beforeEach(async () => {
      // Create some status history
      await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "CLEARED", notes: "First change" });

      await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "UNCLEARED", notes: "Second change" });
    });

    it("should return status history successfully", async () => {
      const response = await request(app)
        .get(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status/history`,
        )
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.history).toHaveLength(2);
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).get(
        `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status/history`,
      );

      expect(response.status).toBe(401);
    });

    it("should return 403 without organization membership", async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post("/api/auth/register")
        .send({
          email: "other-user3@example.com",
          password: "Password123",
        });
      const otherToken = otherUserResponse.body.data.token;

      const response = await request(app)
        .get(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status/history`,
        )
        .set("Authorization", `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent transaction", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .get(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${fakeId}/status/history`,
        )
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it("should include user information in history entries", async () => {
      const response = await request(app)
        .get(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status/history`,
        )
        .set("Authorization", `Bearer ${token}`);

      expect(response.body.data.history[0]).toMatchObject({
        changedById: expect.any(String),
        changedByName: expect.any(String),
        changedByEmail: expect.any(String),
      });
    });

    it("should order history by date descending", async () => {
      const response = await request(app)
        .get(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status/history`,
        )
        .set("Authorization", `Bearer ${token}`);

      const history = response.body.data.history;
      expect(history[0]?.notes).toBe("Second change");
      expect(history[1]?.notes).toBe("First change");
    });
  });

  describe("GET /api/organizations/:orgId/accounts/:accountId/transactions/status/summary", () => {
    beforeEach(async () => {
      // Create transactions with different statuses
      await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          description: "Uncleared 1",
          amount: 100,
          transactionType: "INCOME",
          date: new Date().toISOString(),
          splits: [{ amount: 100, categoryName: "Test Category" }],
        });

      const tx2Response = await request(app)
        .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          description: "For clearing",
          amount: 200,
          transactionType: "INCOME",
          date: new Date().toISOString(),
          splits: [{ amount: 200, categoryName: "Test Category" }],
        });

      // Clear one transaction
      await request(app)
        .patch(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/${tx2Response.body.data.transaction.id}/status`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "CLEARED" });
    });

    it("should return reconciliation summary successfully", async () => {
      const response = await request(app)
        .get(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/summary`,
        )
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBeDefined();
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app).get(
        `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/summary`,
      );

      expect(response.status).toBe(401);
    });

    it("should return 403 without organization membership", async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post("/api/auth/register")
        .send({
          email: "other-user4@example.com",
          password: "Password123",
        });
      const otherToken = otherUserResponse.body.data.token;

      const response = await request(app)
        .get(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/summary`,
        )
        .set("Authorization", `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent account", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .get(
          `/api/organizations/${orgId}/accounts/${fakeId}/transactions/status/summary`,
        )
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it("should calculate balances correctly", async () => {
      const response = await request(app)
        .get(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/summary`,
        )
        .set("Authorization", `Bearer ${token}`);

      const summary = response.body.data.summary;
      expect(summary.uncleared).toBeDefined();
      expect(summary.cleared).toBeDefined();
      expect(summary.reconciled).toBeDefined();
      expect(summary.overall).toBeDefined();

      // Verify counts are numbers
      expect(typeof summary.uncleared.count).toBe("number");
      expect(typeof summary.cleared.count).toBe("number");
      expect(typeof summary.reconciled.count).toBe("number");
      expect(typeof summary.overall.count).toBe("number");
    });

    it("should include transaction counts", async () => {
      const response = await request(app)
        .get(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/summary`,
        )
        .set("Authorization", `Bearer ${token}`);

      const summary = response.body.data.summary;
      expect(summary.uncleared.count).toBeGreaterThan(0);
      expect(summary.cleared.count).toBeGreaterThan(0);
      expect(summary.overall.count).toBe(
        summary.uncleared.count +
          summary.cleared.count +
          summary.reconciled.count,
      );
    });

    it("should include account information", async () => {
      const response = await request(app)
        .get(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/summary`,
        )
        .set("Authorization", `Bearer ${token}`);

      const summary = response.body.data.summary;
      expect(summary.accountId).toBe(accountId);
      expect(summary.accountName).toBe("Test Account");
    });
  });

  describe("POST /api/organizations/:orgId/accounts/:accountId/transactions/status/reconcile", () => {
    it("should complete reconciliation successfully", async () => {
      // First create some CLEARED transactions
      const transaction1 = await prisma.transaction.create({
        data: {
          accountId,
          transactionType: "INCOME",
          amount: "100.00",
          description: "Income transaction",
          date: new Date(),
          status: "CLEARED",
          clearedAt: new Date(),
        },
      });

      const transaction2 = await prisma.transaction.create({
        data: {
          accountId,
          transactionType: "EXPENSE",
          amount: "50.00",
          description: "Expense transaction",
          date: new Date(),
          status: "CLEARED",
          clearedAt: new Date(),
        },
      });

      const response = await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/reconcile`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({
          statementBalance: 50.0,
          statementDate: "2026-01-17",
          transactionIds: [transaction1.id, transaction2.id],
          notes: "Test reconciliation",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.result.reconciled).toBe(2);
      expect(response.body.data.result.clearedBalance).toBe(50.0);
      expect(response.body.data.result.statementBalance).toBe(50.0);
      expect(response.body.data.result.difference).toBe(0);

      // Verify transactions are now RECONCILED
      const updatedTx1 = await prisma.transaction.findUnique({
        where: { id: transaction1.id },
      });
      const updatedTx2 = await prisma.transaction.findUnique({
        where: { id: transaction2.id },
      });

      expect(updatedTx1?.status).toBe("RECONCILED");
      expect(updatedTx2?.status).toBe("RECONCILED");
      expect(updatedTx1?.reconciledAt).toBeDefined();
      expect(updatedTx2?.reconciledAt).toBeDefined();
    });

    it("should return 401 without authentication", async () => {
      const response = await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/reconcile`,
        )
        .send({
          statementBalance: 100.0,
          statementDate: "2026-01-17",
          transactionIds: ["some-id"],
        });

      expect(response.status).toBe(401);
    });

    it("should return 403 without organization membership", async () => {
      const otherUserResponse = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Other User",
          email: "other-user-reconcile@example.com",
          password: "Password123",
        });
      const otherToken = otherUserResponse.body.data.token;

      const response = await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/reconcile`,
        )
        .set("Authorization", `Bearer ${otherToken}`)
        .send({
          statementBalance: 100.0,
          statementDate: "2026-01-17",
          transactionIds: ["00000000-0000-0000-0000-000000000000"], // Valid UUID format
        });

      expect(response.status).toBe(403);
    });

    it("should return 400 for non-CLEARED transactions", async () => {
      // Create an UNCLEARED transaction
      const transaction = await prisma.transaction.create({
        data: {
          accountId,
          transactionType: "INCOME",
          amount: "100.00",
          description: "Uncleared transaction",
          date: new Date(),
          status: "UNCLEARED",
        },
      });

      const response = await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/reconcile`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({
          statementBalance: 100.0,
          statementDate: "2026-01-17",
          transactionIds: [transaction.id],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("CLEARED");
    });

    it("should return 404 for non-existent transactions", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/reconcile`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({
          statementBalance: 100.0,
          statementDate: "2026-01-17",
          transactionIds: [fakeId],
        });

      expect(response.status).toBe(404);
    });

    it("should validate request body schema", async () => {
      const response = await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/reconcile`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({
          statementBalance: "not-a-number",
          statementDate: "invalid-date",
          transactionIds: "not-an-array",
        });

      expect(response.status).toBe(400);
    });

    it("should create status history records", async () => {
      // Create a CLEARED transaction
      const transaction = await prisma.transaction.create({
        data: {
          accountId,
          transactionType: "INCOME",
          amount: "100.00",
          description: "Test transaction",
          date: new Date(),
          status: "CLEARED",
          clearedAt: new Date(),
        },
      });

      await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/reconcile`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({
          statementBalance: 100.0,
          statementDate: "2026-01-17",
          transactionIds: [transaction.id],
          notes: "Test reconciliation with history",
        });

      // Check status history was created
      const history = await prisma.transactionStatusHistory.findMany({
        where: { transactionId: transaction.id },
      });

      expect(history.length).toBeGreaterThan(0);
      const reconcileHistory = history.find((h) => h.toStatus === "RECONCILED");
      expect(reconcileHistory).toBeDefined();
      expect(reconcileHistory?.fromStatus).toBe("CLEARED");
      expect(reconcileHistory?.notes).toContain(
        "Test reconciliation with history",
      );
    });

    it("should calculate difference correctly", async () => {
      const transaction = await prisma.transaction.create({
        data: {
          accountId,
          transactionType: "INCOME",
          amount: "100.00",
          description: "Test transaction",
          date: new Date(),
          status: "CLEARED",
          clearedAt: new Date(),
        },
      });

      const response = await request(app)
        .post(
          `/api/organizations/${orgId}/accounts/${accountId}/transactions/status/reconcile`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({
          statementBalance: 150.0,
          statementDate: "2026-01-17",
          transactionIds: [transaction.id],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.result.clearedBalance).toBe(100.0);
      expect(response.body.data.result.statementBalance).toBe(150.0);
      expect(response.body.data.result.difference).toBe(50.0);
    });
  });
});
