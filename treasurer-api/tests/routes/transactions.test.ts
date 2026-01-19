import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

const app = createApp();

// Counter for unique emails across tests
let testCounter = 0;

describe("Transaction Routes", () => {
  let token: string;
  let orgId: string;
  let accountId: string;

  // Helper to create a user, organization, and account for tests
  async function setupUserOrgAndAccount(initialBalance = 1000) {
    testCounter++;
    const uniqueEmail = `transaction-test-${Date.now()}-${testCounter}@example.com`;

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        email: uniqueEmail,
        password: "Password123",
        name: "Test User",
      });

    expect(registerResponse.status).toBe(201);
    token = registerResponse.body.data.token;

    const orgResponse = await request(app)
      .post("/api/organizations")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test Organization" });

    expect(orgResponse.status).toBe(201);
    orgId = orgResponse.body.data.id;

    const accountResponse = await request(app)
      .post(`/api/organizations/${orgId}/accounts`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Test Account",
        accountType: "CHECKING",
        balance: initialBalance,
      });

    expect(accountResponse.status).toBe(201);
    accountId = accountResponse.body.data.account.id;
  }

  beforeEach(async () => {
    await setupUserOrgAndAccount(1000);
  });

  describe("Balance Updates", () => {
    describe("INCOME transactions", () => {
      it("should INCREASE balance when adding an INCOME transaction", async () => {
        // Get initial balance
        const initialAccountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);

        expect(initialAccountResponse.status).toBe(200);
        const initialBalance = parseFloat(
          initialAccountResponse.body.data.account.balance,
        );
        expect(initialBalance).toBe(1000);

        // Create INCOME transaction
        const transactionResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Salary deposit",
            amount: 500,
            transactionType: "INCOME",
            splits: [{ amount: 500, categoryName: "Salary" }],
          });

        expect(transactionResponse.status).toBe(201);
        expect(transactionResponse.body.data.transaction.transactionType).toBe(
          "INCOME",
        );

        // Check that balance INCREASED
        const finalAccountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);

        expect(finalAccountResponse.status).toBe(200);
        const finalBalance = parseFloat(
          finalAccountResponse.body.data.account.balance,
        );
        expect(finalBalance).toBe(1500); // 1000 + 500 = 1500
      });

      it("should INCREASE balance correctly with fee applied on INCOME", async () => {
        // First create an account with a transaction fee
        const feeAccountResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: "Fee Account",
            accountType: "CHECKING",
            balance: 1000,
            transactionFee: 10,
          });

        expect(feeAccountResponse.status).toBe(201);
        const feeAccountId = feeAccountResponse.body.data.account.id;

        // Create INCOME transaction with fee
        const transactionResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${feeAccountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Payment received",
            amount: 500,
            transactionType: "INCOME",
            applyFee: true,
            splits: [{ amount: 500, categoryName: "Sales" }],
          });

        expect(transactionResponse.status).toBe(201);

        // Check balance: should be 1000 + 500 - 10 = 1490
        const finalAccountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${feeAccountId}`)
          .set("Authorization", `Bearer ${token}`);

        expect(finalAccountResponse.status).toBe(200);
        const finalBalance = parseFloat(
          finalAccountResponse.body.data.account.balance,
        );
        expect(finalBalance).toBe(1490); // 1000 + (500 - 10 fee) = 1490
      });
    });

    describe("EXPENSE transactions", () => {
      it("should DECREASE balance when adding an EXPENSE transaction", async () => {
        // Create EXPENSE transaction
        const transactionResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Grocery shopping",
            amount: 150,
            transactionType: "EXPENSE",
            splits: [{ amount: 150, categoryName: "Groceries" }],
          });

        expect(transactionResponse.status).toBe(201);

        // Check that balance DECREASED
        const finalAccountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);

        expect(finalAccountResponse.status).toBe(200);
        const finalBalance = parseFloat(
          finalAccountResponse.body.data.account.balance,
        );
        expect(finalBalance).toBe(850); // 1000 - 150 = 850
      });

      it("should DECREASE balance correctly with fee applied on EXPENSE", async () => {
        // First create an account with a transaction fee
        const feeAccountResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: "Fee Account",
            accountType: "CHECKING",
            balance: 1000,
            transactionFee: 5,
          });

        expect(feeAccountResponse.status).toBe(201);
        const feeAccountId = feeAccountResponse.body.data.account.id;

        // Create EXPENSE transaction with fee
        const transactionResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${feeAccountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Online purchase",
            amount: 100,
            transactionType: "EXPENSE",
            applyFee: true,
            splits: [{ amount: 100, categoryName: "Shopping" }],
          });

        expect(transactionResponse.status).toBe(201);

        // Check balance: should be 1000 - 100 - 5 = 895
        const finalAccountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${feeAccountId}`)
          .set("Authorization", `Bearer ${token}`);

        expect(finalAccountResponse.status).toBe(200);
        const finalBalance = parseFloat(
          finalAccountResponse.body.data.account.balance,
        );
        expect(finalBalance).toBe(895); // 1000 - 100 - 5 = 895
      });
    });

    describe("Default transaction type", () => {
      it("should default to EXPENSE when transactionType is not specified", async () => {
        // Create transaction without specifying type
        const transactionResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Unspecified transaction",
            amount: 100,
            // transactionType not specified - should default to EXPENSE
            splits: [{ amount: 100, categoryName: "Misc" }],
          });

        expect(transactionResponse.status).toBe(201);
        expect(transactionResponse.body.data.transaction.transactionType).toBe(
          "EXPENSE",
        );

        // Balance should DECREASE (EXPENSE behavior)
        const finalAccountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);

        expect(finalAccountResponse.status).toBe(200);
        const finalBalance = parseFloat(
          finalAccountResponse.body.data.account.balance,
        );
        expect(finalBalance).toBe(900); // 1000 - 100 = 900
      });
    });

    describe("Transaction deletion", () => {
      it("should reverse INCOME balance impact when deleting an INCOME transaction", async () => {
        // Create INCOME transaction
        const transactionResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Bonus",
            amount: 200,
            transactionType: "INCOME",
            splits: [{ amount: 200, categoryName: "Bonus" }],
          });

        expect(transactionResponse.status).toBe(201);
        const transactionId = transactionResponse.body.data.transaction.id;

        // Verify balance increased
        let accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(accountResponse.status).toBe(200);
        expect(parseFloat(accountResponse.body.data.account.balance)).toBe(
          1200,
        );

        // Delete the transaction
        const deleteResponse = await request(app)
          .delete(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`);
        expect(deleteResponse.status).toBe(200);

        // Verify balance returned to original
        accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(accountResponse.status).toBe(200);
        expect(parseFloat(accountResponse.body.data.account.balance)).toBe(
          1000,
        );
      });

      it("should reverse EXPENSE balance impact when deleting an EXPENSE transaction", async () => {
        // Create EXPENSE transaction
        const transactionResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Coffee",
            amount: 50,
            transactionType: "EXPENSE",
            splits: [{ amount: 50, categoryName: "Food" }],
          });

        expect(transactionResponse.status).toBe(201);
        const transactionId = transactionResponse.body.data.transaction.id;

        // Verify balance decreased
        let accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(accountResponse.status).toBe(200);
        expect(parseFloat(accountResponse.body.data.account.balance)).toBe(950);

        // Delete the transaction
        const deleteResponse = await request(app)
          .delete(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`);
        expect(deleteResponse.status).toBe(200);

        // Verify balance returned to original
        accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(accountResponse.status).toBe(200);
        expect(parseFloat(accountResponse.body.data.account.balance)).toBe(
          1000,
        );
      });
    });

    describe("Multiple transactions", () => {
      it("should correctly handle mixed INCOME and EXPENSE transactions", async () => {
        // Initial balance: 1000

        // Add INCOME: +500 = 1500
        let response = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Paycheck",
            amount: 500,
            transactionType: "INCOME",
            splits: [{ amount: 500, categoryName: "Salary" }],
          });
        expect(response.status).toBe(201);

        // Add EXPENSE: -200 = 1300
        response = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Rent",
            amount: 200,
            transactionType: "EXPENSE",
            splits: [{ amount: 200, categoryName: "Housing" }],
          });
        expect(response.status).toBe(201);

        // Add INCOME: +100 = 1400
        response = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Side gig",
            amount: 100,
            transactionType: "INCOME",
            splits: [{ amount: 100, categoryName: "Freelance" }],
          });
        expect(response.status).toBe(201);

        // Add EXPENSE: -50 = 1350
        response = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Utilities",
            amount: 50,
            transactionType: "EXPENSE",
            splits: [{ amount: 50, categoryName: "Utilities" }],
          });
        expect(response.status).toBe(201);

        // Check final balance
        const accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);

        expect(accountResponse.status).toBe(200);
        const finalBalance = parseFloat(
          accountResponse.body.data.account.balance,
        );
        // 1000 + 500 - 200 + 100 - 50 = 1350
        expect(finalBalance).toBe(1350);
      });
    });

    describe("INCOME/EXPENSE type conversion", () => {
      it("should correctly update balance when converting INCOME to EXPENSE", async () => {
        // Initial balance: 1000
        // Create an INCOME transaction: +200 = 1200
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            memo: "Initial income",
            amount: 200,
            transactionType: "INCOME",
            splits: [{ amount: 200, categoryName: "Salary" }],
          });
        expect(createResponse.status).toBe(201);
        const transactionId = createResponse.body.data.transaction.id;

        // Verify balance after INCOME
        let accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(accountResponse.body.data.account.balance)).toBe(
          1200,
        );

        // Convert to EXPENSE: should reverse +200 and apply -200 = 1000 - 200 = 800
        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: createResponse.body.data.transaction.version,
            transactionType: "EXPENSE",
            splits: [{ amount: 200, categoryName: "Housing" }],
          });
        expect(updateResponse.status).toBe(200);

        // Verify final balance
        accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(accountResponse.body.data.account.balance)).toBe(800);
      });

      it("should correctly update balance when converting EXPENSE to INCOME", async () => {
        // Initial balance: 1000
        // Create an EXPENSE transaction: -150 = 850
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            memo: "Initial expense",
            amount: 150,
            transactionType: "EXPENSE",
            splits: [{ amount: 150, categoryName: "Groceries" }],
          });
        expect(createResponse.status).toBe(201);
        const transactionId = createResponse.body.data.transaction.id;

        // Verify balance after EXPENSE
        let accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(accountResponse.body.data.account.balance)).toBe(850);

        // Convert to INCOME: should reverse -150 and apply +150 = 1000 + 150 = 1150
        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: createResponse.body.data.transaction.version,
            transactionType: "INCOME",
            splits: [{ amount: 150, categoryName: "Refund" }],
          });
        expect(updateResponse.status).toBe(200);

        // Verify final balance
        accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(accountResponse.body.data.account.balance)).toBe(
          1150,
        );
      });

      it("should handle INCOME to EXPENSE conversion with fees", async () => {
        // Create an account with a transaction fee
        const feeAccountResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: "Fee Account for Conversion",
            accountType: "CHECKING",
            balance: 1000,
            transactionFee: 10,
          });
        expect(feeAccountResponse.status).toBe(201);
        const feeAccountId = feeAccountResponse.body.data.account.id;

        // Initial balance: 1000
        // Create an INCOME transaction with fee: +(300-10) = 1290
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${feeAccountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            memo: "Income with fee",
            amount: 300,
            transactionType: "INCOME",
            applyFee: true,
            splits: [{ amount: 300, categoryName: "Salary" }],
          });
        expect(createResponse.status).toBe(201);
        const transactionId = createResponse.body.data.transaction.id;

        // Verify balance after INCOME with fee
        let accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${feeAccountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(accountResponse.body.data.account.balance)).toBe(
          1290,
        ); // 1000 + 300 - 10

        // Convert to EXPENSE: should reverse +(300-10) and apply -(300+10)
        // Balance: 1000 - 300 - 10 = 690
        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${feeAccountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: createResponse.body.data.transaction.version,
            transactionType: "EXPENSE",
            applyFee: true,
            splits: [{ amount: 300, categoryName: "Purchase" }],
          });
        expect(updateResponse.status).toBe(200);

        // Verify final balance
        accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${feeAccountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(accountResponse.body.data.account.balance)).toBe(690);
      });

      it("should handle amount change during type conversion", async () => {
        // Initial balance: 1000
        // Create INCOME: +100 = 1100
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            memo: "Initial income",
            amount: 100,
            transactionType: "INCOME",
            splits: [{ amount: 100, categoryName: "Salary" }],
          });
        expect(createResponse.status).toBe(201);
        const transactionId = createResponse.body.data.transaction.id;

        // Convert to EXPENSE with new amount: reverse +100, apply -250
        // Balance: 1000 - 250 = 750
        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: createResponse.body.data.transaction.version,
            amount: 250,
            transactionType: "EXPENSE",
            splits: [{ amount: 250, categoryName: "Rent" }],
          });
        expect(updateResponse.status).toBe(200);

        // Verify final balance
        const accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(accountResponse.body.data.account.balance)).toBe(750);
      });
    });

    describe("TRANSFER transactions", () => {
      it("should move money from source to destination account", async () => {
        // Create a second account as the destination
        const destAccountResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: "Destination Account",
            accountType: "SAVINGS",
            balance: 500,
          });

        expect(destAccountResponse.status).toBe(201);
        const destAccountId = destAccountResponse.body.data.account.id;

        // Create TRANSFER transaction: move 200 from source to destination
        const transactionResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Transfer to savings",
            amount: 200,
            transactionType: "TRANSFER",
            destinationAccountId: destAccountId,
            splits: [{ amount: 200, categoryName: "Transfer" }],
          });

        expect(transactionResponse.status).toBe(201);
        expect(transactionResponse.body.data.transaction.transactionType).toBe(
          "TRANSFER",
        );
        expect(
          transactionResponse.body.data.transaction.destinationAccountId,
        ).toBe(destAccountId);

        // Check source account balance decreased
        const sourceAccountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);

        expect(sourceAccountResponse.status).toBe(200);
        const sourceBalance = parseFloat(
          sourceAccountResponse.body.data.account.balance,
        );
        expect(sourceBalance).toBe(800); // 1000 - 200 = 800

        // Check destination account balance increased
        const destAccountCheckResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destAccountId}`)
          .set("Authorization", `Bearer ${token}`);

        expect(destAccountCheckResponse.status).toBe(200);
        const destBalance = parseFloat(
          destAccountCheckResponse.body.data.account.balance,
        );
        expect(destBalance).toBe(700); // 500 + 200 = 700
      });

      it("should apply fee only to source account on TRANSFER", async () => {
        // Create source account with transaction fee
        const feeSourceResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: "Fee Source Account",
            accountType: "CHECKING",
            balance: 1000,
            transactionFee: 10,
          });

        expect(feeSourceResponse.status).toBe(201);
        const feeSourceId = feeSourceResponse.body.data.account.id;

        // Create destination account
        const destResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: "Destination Account",
            accountType: "SAVINGS",
            balance: 500,
          });

        expect(destResponse.status).toBe(201);
        const destId = destResponse.body.data.account.id;

        // Create TRANSFER with fee: move 300, pay 10 fee
        const transactionResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${feeSourceId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Transfer with fee",
            amount: 300,
            transactionType: "TRANSFER",
            destinationAccountId: destId,
            applyFee: true,
            splits: [{ amount: 300, categoryName: "Transfer" }],
          });

        expect(transactionResponse.status).toBe(201);
        expect(transactionResponse.body.data.transaction.feeAmount).toBe("10");

        // Check source: should be 1000 - 300 - 10 = 690
        const sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${feeSourceId}`)
          .set("Authorization", `Bearer ${token}`);

        expect(sourceCheck.status).toBe(200);
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(690);

        // Check destination: should be 500 + 300 = 800 (no fee deducted)
        const destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set("Authorization", `Bearer ${token}`);

        expect(destCheck.status).toBe(200);
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(800);
      });

      it("should require destination account for TRANSFER", async () => {
        const transactionResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Transfer without destination",
            amount: 100,
            transactionType: "TRANSFER",
            splits: [{ amount: 100, categoryName: "Transfer" }],
          });

        expect(transactionResponse.status).toBe(400);
      });

      it("should not allow source and destination to be the same", async () => {
        const transactionResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Transfer to self",
            amount: 100,
            transactionType: "TRANSFER",
            destinationAccountId: accountId, // Same as source
            splits: [{ amount: 100, categoryName: "Transfer" }],
          });

        expect(transactionResponse.status).toBe(400);
      });

      it("should reverse both accounts when deleting a TRANSFER", async () => {
        // Create destination account
        const destResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: "Destination for Delete Test",
            accountType: "SAVINGS",
            balance: 500,
          });

        expect(destResponse.status).toBe(201);
        const destId = destResponse.body.data.account.id;

        // Create TRANSFER
        const transactionResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Transfer to delete",
            amount: 250,
            transactionType: "TRANSFER",
            destinationAccountId: destId,
            splits: [{ amount: 250, categoryName: "Transfer" }],
          });

        expect(transactionResponse.status).toBe(201);
        const transactionId = transactionResponse.body.data.transaction.id;

        // Verify balances after transfer
        let sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(750); // 1000 - 250

        let destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(750); // 500 + 250

        // Delete the transfer
        const deleteResponse = await request(app)
          .delete(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`);
        expect(deleteResponse.status).toBe(200);

        // Verify balances are restored
        sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(1000); // Back to original

        destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(500); // Back to original
      });

      it("should reverse both accounts and fee when deleting a TRANSFER with fee", async () => {
        // First, update source account to have a transaction fee
        await request(app)
          .patch(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`)
          .send({ transactionFee: 10 });

        // Create destination account
        const destResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: "Destination for Fee Delete Test",
            accountType: "SAVINGS",
            balance: 500,
          });

        expect(destResponse.status).toBe(201);
        const destId = destResponse.body.data.account.id;

        // Create TRANSFER with fee applied
        const transactionResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Transfer with fee to delete",
            amount: 200,
            transactionType: "TRANSFER",
            destinationAccountId: destId,
            applyFee: true,
            splits: [{ amount: 200, categoryName: "Transfer" }],
          });

        expect(transactionResponse.status).toBe(201);
        const transactionId = transactionResponse.body.data.transaction.id;

        // Verify balances after transfer with fee
        // Source: 1000 - 200 (amount) - 10 (fee) = 790
        let sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(790);

        // Destination: 500 + 200 (amount, no fee) = 700
        let destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(700);

        // Delete the transfer with fee
        const deleteResponse = await request(app)
          .delete(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`);
        expect(deleteResponse.status).toBe(200);

        // Verify balances are fully restored
        // Source: 790 + 200 (amount) + 10 (fee) = 1000 (back to original)
        sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(1000);

        // Destination: 700 - 200 (amount) = 500 (back to original)
        destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(500);
      });

      it("should not allow TRANSFER to account in different organization", async () => {
        // Create another user and organization
        const otherUserResponse = await request(app)
          .post("/api/auth/register")
          .send({
            email: "otheruser@example.com",
            password: "Password123",
            name: "Other User",
          });

        expect(otherUserResponse.status).toBe(201);
        const otherToken = otherUserResponse.body.data.token;

        const otherOrgResponse = await request(app)
          .post("/api/organizations")
          .set("Authorization", `Bearer ${otherToken}`)
          .send({ name: "Other Organization" });

        expect(otherOrgResponse.status).toBe(201);
        const otherOrgId = otherOrgResponse.body.data.id;

        // Create an account in the other organization
        const otherAccountResponse = await request(app)
          .post(`/api/organizations/${otherOrgId}/accounts`)
          .set("Authorization", `Bearer ${otherToken}`)
          .send({
            name: "Other Org Account",
            accountType: "CHECKING",
            balance: 1000,
          });

        expect(otherAccountResponse.status).toBe(201);
        const otherAccountId = otherAccountResponse.body.data.account.id;

        // Attempt to create a TRANSFER from our account to the other org's account
        // This should fail with 404 (destination account not found in our org)
        const transferResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Cross-org transfer attempt",
            amount: 100,
            transactionType: "TRANSFER",
            destinationAccountId: otherAccountId, // Account from different org
            splits: [{ amount: 100, categoryName: "Transfer" }],
          });

        // Should fail with 404 because destination account doesn't exist in our org
        expect(transferResponse.status).toBe(404);
        expect(transferResponse.body.message).toContain(
          "Destination account not found",
        );

        // Verify balances unchanged (security check - no money moved)
        const sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(1000);

        const otherCheck = await request(app)
          .get(`/api/organizations/${otherOrgId}/accounts/${otherAccountId}`)
          .set("Authorization", `Bearer ${otherToken}`);
        expect(parseFloat(otherCheck.body.data.account.balance)).toBe(1000);
      });

      it("should not allow destinationAccountId for non-TRANSFER transactions", async () => {
        // Create a second account
        const destResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: "Other Account",
            accountType: "SAVINGS",
            balance: 500,
          });

        expect(destResponse.status).toBe(201);
        const destId = destResponse.body.data.account.id;

        // Try to create EXPENSE with destinationAccountId
        const transactionResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Expense with dest account",
            amount: 100,
            transactionType: "EXPENSE",
            destinationAccountId: destId, // Should not be allowed
            splits: [{ amount: 100, categoryName: "Test" }],
          });

        expect(transactionResponse.status).toBe(400);
      });
    });

    describe("TRANSFER update scenarios", () => {
      it("should update TRANSFER amount correctly on both accounts", async () => {
        // Create destination account
        const destResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: "Destination Account",
            accountType: "SAVINGS",
            balance: 500,
          });

        expect(destResponse.status).toBe(201);
        const destId = destResponse.body.data.account.id;

        // Create TRANSFER: 200 from source to dest
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Initial transfer",
            amount: 200,
            transactionType: "TRANSFER",
            destinationAccountId: destId,
            splits: [{ amount: 200, categoryName: "Transfer" }],
          });

        expect(createResponse.status).toBe(201);
        const transactionId = createResponse.body.data.transaction.id;

        // Verify initial balances: source=800, dest=700
        let sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(800);

        let destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(700);

        // Update TRANSFER amount to 300
        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            amount: 300,
            splits: [{ amount: 300, categoryName: "Transfer" }],
          });

        expect(updateResponse.status).toBe(200);

        // Verify updated balances: source=700 (additional 100 deducted), dest=800 (additional 100 added)
        sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(700);

        destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(800);
      });

      it("should update TRANSFER destination correctly", async () => {
        // Create two destination accounts
        const dest1Response = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: "Destination 1",
            accountType: "SAVINGS",
            balance: 500,
          });
        expect(dest1Response.status).toBe(201);
        const dest1Id = dest1Response.body.data.account.id;

        const dest2Response = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: "Destination 2",
            accountType: "SAVINGS",
            balance: 500,
          });
        expect(dest2Response.status).toBe(201);
        const dest2Id = dest2Response.body.data.account.id;

        // Create TRANSFER to dest1
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Transfer to dest1",
            amount: 200,
            transactionType: "TRANSFER",
            destinationAccountId: dest1Id,
            splits: [{ amount: 200, categoryName: "Transfer" }],
          });

        expect(createResponse.status).toBe(201);
        const transactionId = createResponse.body.data.transaction.id;

        // Verify: source=800, dest1=700, dest2=500
        let dest1Check = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${dest1Id}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(dest1Check.body.data.account.balance)).toBe(700);

        // Update destination to dest2
        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            destinationAccountId: dest2Id,
          });

        expect(updateResponse.status).toBe(200);

        // Verify: dest1 back to 500, dest2 now 700
        dest1Check = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${dest1Id}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(dest1Check.body.data.account.balance)).toBe(500);

        const dest2Check = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${dest2Id}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(dest2Check.body.data.account.balance)).toBe(700);
      });

      it("should convert EXPENSE to TRANSFER correctly", async () => {
        // Create destination account
        const destResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: "Destination Account",
            accountType: "SAVINGS",
            balance: 500,
          });
        expect(destResponse.status).toBe(201);
        const destId = destResponse.body.data.account.id;

        // Create EXPENSE
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Original expense",
            amount: 200,
            transactionType: "EXPENSE",
            splits: [{ amount: 200, categoryName: "Shopping" }],
          });

        expect(createResponse.status).toBe(201);
        const transactionId = createResponse.body.data.transaction.id;

        // Verify: source=800 (1000-200), dest=500
        let sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(800);

        // Convert to TRANSFER
        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            transactionType: "TRANSFER",
            destinationAccountId: destId,
          });

        expect(updateResponse.status).toBe(200);

        // EXPENSE reversed (+200), TRANSFER applied (-200 from source, +200 to dest)
        // Net source: 800 + 200 - 200 = 800 (unchanged amount)
        // Dest: 500 + 200 = 700
        sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(800);

        const destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(700);
      });

      it("should convert TRANSFER to EXPENSE correctly", async () => {
        // Create destination account
        const destResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: "Destination Account",
            accountType: "SAVINGS",
            balance: 500,
          });
        expect(destResponse.status).toBe(201);
        const destId = destResponse.body.data.account.id;

        // Create TRANSFER
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Original transfer",
            amount: 200,
            transactionType: "TRANSFER",
            destinationAccountId: destId,
            splits: [{ amount: 200, categoryName: "Transfer" }],
          });

        expect(createResponse.status).toBe(201);
        const transactionId = createResponse.body.data.transaction.id;

        // Verify: source=800, dest=700
        let sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(800);

        let destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(700);

        // Convert to EXPENSE (remove destination)
        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            transactionType: "EXPENSE",
            destinationAccountId: null,
          });

        expect(updateResponse.status).toBe(200);

        // TRANSFER reversed: source +200, dest -200
        // EXPENSE applied: source -200
        // Net source: 800 + 200 - 200 = 800, dest: 700 - 200 = 500
        sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(800);

        destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set("Authorization", `Bearer ${token}`);
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(500);
      });

      it("should reject updating to TRANSFER without destination", async () => {
        // Create EXPENSE
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Expense",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Test" }],
          });

        expect(createResponse.status).toBe(201);
        const transactionId = createResponse.body.data.transaction.id;

        // Try to convert to TRANSFER without destination
        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            transactionType: "TRANSFER",
          });

        expect(updateResponse.status).toBe(400);
      });
    });

    describe("Transaction Edit with Optimistic Locking", () => {
      // NOTE: These optimistic locking tests effectively test database race condition protection.
      // The version-based optimistic locking mechanism prevents lost updates when multiple
      // clients attempt to modify the same transaction concurrently. The first update succeeds
      // and increments the version, causing subsequent updates with stale versions to receive
      // a 409 Conflict response, forcing clients to refresh and retry with the latest data.

      it("should successfully update transaction with correct version", async () => {
        // Create a transaction
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Original transaction",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Food" }],
          });

        expect(createResponse.status).toBe(201);
        const transactionId = createResponse.body.data.transaction.id;
        const initialVersion = createResponse.body.data.transaction.version;
        expect(initialVersion).toBe(1);

        // Update the transaction with correct version
        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            memo: "Updated memo",
            amount: 150,
            splits: [{ amount: 150, categoryName: "Food" }],
          });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.data.transaction.memo).toBe("Updated memo");
        expect(updateResponse.body.data.transaction.amount).toBe("150");
        expect(updateResponse.body.data.transaction.version).toBe(2);
      });

      it("should increment version on each update", async () => {
        // Create a transaction
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Test",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Test" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        // First update: version 1 -> 2
        const update1 = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            memo: "Update 1",
          });

        expect(update1.status).toBe(200);
        expect(update1.body.data.transaction.version).toBe(2);

        // Second update: version 2 -> 3
        const update2 = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 2,
            memo: "Update 2",
          });

        expect(update2.status).toBe(200);
        expect(update2.body.data.transaction.version).toBe(3);
      });

      it("should return 409 conflict when version mismatches", async () => {
        // Create a transaction
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Test",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Test" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        // First update succeeds
        await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            memo: "First update",
          });

        // Second update with stale version fails
        const conflictResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1, // Stale version
            memo: "Second update",
          });

        expect(conflictResponse.status).toBe(409);
        expect(conflictResponse.body.success).toBe(false);
        expect(conflictResponse.body.message).toContain(
          "modified by another user",
        );
      });

      it("should include conflict metadata in 409 response", async () => {
        // Create a transaction
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Test",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Test" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        // First update
        await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            memo: "First update",
          });

        // Second update with stale version
        const conflictResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            memo: "Second update",
          });

        expect(conflictResponse.status).toBe(409);
        expect(conflictResponse.body.conflict).toBeDefined();
        expect(conflictResponse.body.conflict.currentVersion).toBe(2);
        expect(conflictResponse.body.conflict.lastModifiedById).toBeDefined();
        expect(conflictResponse.body.conflict.lastModifiedByName).toBeDefined();
        expect(
          conflictResponse.body.conflict.lastModifiedByEmail,
        ).toBeDefined();
        expect(conflictResponse.body.conflict.lastModifiedAt).toBeDefined();
        expect(conflictResponse.body.currentTransaction).toBeDefined();
        expect(conflictResponse.body.currentTransaction.version).toBe(2);
      });

      it("should prevent editing reconciled transactions", async () => {
        // Create and reconcile a transaction
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            memo: "Test",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Test" }],
          });

        const transactionId = createResponse.body.data.transaction.id;
        expect(createResponse.status).toBe(201);

        // Reconcile the transaction
        const reconcileResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({ status: "RECONCILED" });

        expect(reconcileResponse.status).toBe(200);

        // Try to update reconciled transaction - should fail
        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            memo: "Should fail",
          });

        expect(updateResponse.status).toBe(400);
        expect(updateResponse.body.message).toMatch(
          /reconciled|cannot modify reconciled/i,
        );
      });

      // Version validation edge cases
      it("should reject zero version number", async () => {
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            memo: "Test",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Test" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 0,
            memo: "Should fail",
          });

        expect(updateResponse.status).toBe(400);
        expect(updateResponse.body.message).toMatch(
          /Version must be a positive integer|Validation failed/,
        );
      });

      it("should reject negative version number", async () => {
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            memo: "Test",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Test" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: -5,
            memo: "Should fail",
          });

        expect(updateResponse.status).toBe(400);
        expect(updateResponse.body.message).toMatch(
          /Version must be a positive integer|Validation failed/,
        );
      });

      it("should reject future version number", async () => {
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            memo: "Test",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Test" }],
          });

        const transactionId = createResponse.body.data.transaction.id;
        expect(createResponse.body.data.transaction.version).toBe(1);

        // Try to update with future version (version 5 when current is 1)
        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 5,
            memo: "Should fail",
          });

        expect(updateResponse.status).toBe(409);
        expect(updateResponse.body.message).toContain(
          "modified by another user",
        );
      });

      it("should allow force save to override version conflict", async () => {
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            memo: "Test",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Test" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        // First update: version 1 -> 2
        await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            memo: "First update",
          });

        // Force save with stale version (should succeed)
        const forceResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1, // Stale version
            force: true,
            memo: "Force saved",
          });

        expect(forceResponse.status).toBe(200);
        expect(forceResponse.body.data.transaction.memo).toBe("Force saved");
        expect(forceResponse.body.data.transaction.version).toBe(3);
      });

      it("should prevent lost updates in race condition scenario", async () => {
        // Simulates a classic race condition: Two clients (A and B) fetch the same transaction,
        // both make changes, and both try to save. Only one should succeed.

        // Create a transaction
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            memo: "Original",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Food" }],
          });

        const transactionId = createResponse.body.data.transaction.id;
        const initialVersion = createResponse.body.data.transaction.version;
        expect(initialVersion).toBe(1);

        // Client A and Client B both fetch the transaction at version 1
        // (In reality, both would GET, but here we just use version 1)

        // Client A updates first (should succeed)
        const clientAUpdate = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            memo: "Updated by Client A",
          });

        expect(clientAUpdate.status).toBe(200);
        expect(clientAUpdate.body.data.transaction.version).toBe(2);

        // Client B tries to update with stale version 1 (should fail with 409)
        const clientBUpdate = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1, // Stale version
            memo: "Updated by Client B",
          });

        expect(clientBUpdate.status).toBe(409);
        expect(clientBUpdate.body.message).toContain(
          "modified by another user",
        );

        // Client B must fetch latest version and retry
        const getLatest = await request(app)
          .get(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`);

        expect(getLatest.body.data.transaction.version).toBe(2);
        expect(getLatest.body.data.transaction.memo).toBe(
          "Updated by Client A",
        );

        // Client B retries with correct version (should succeed)
        const clientBRetry = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 2, // Latest version
            memo: "Updated by Client B (after refresh)",
          });

        expect(clientBRetry.status).toBe(200);
        expect(clientBRetry.body.data.transaction.version).toBe(3);
        expect(clientBRetry.body.data.transaction.memo).toBe(
          "Updated by Client B (after refresh)",
        );
      });

      it("should update all field types correctly", async () => {
        // Create destination account
        const destResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            name: "Destination",
            accountType: "SAVINGS",
            balance: 0,
          });
        const destId = destResponse.body.data.account.id;

        // Create a transaction
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Original",
            amount: 100,
            transactionType: "EXPENSE",
            date: "2024-01-01T00:00:00Z",
            splits: [{ amount: 100, categoryName: "Food" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        // Update all fields
        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            memo: "Updated memo",
            amount: 200,
            transactionType: "TRANSFER",
            date: "2024-02-01T00:00:00Z",
            destinationAccountId: destId,
            splits: [{ amount: 200, categoryName: "Savings" }],
          });

        expect(updateResponse.status).toBe(200);
        const transaction = updateResponse.body.data.transaction;
        expect(transaction.memo).toBe("Updated memo");
        expect(transaction.amount).toBe("200");
        expect(transaction.transactionType).toBe("TRANSFER");
        expect(transaction.destinationAccountId).toBe(destId);
        expect(new Date(transaction.date).toISOString()).toBe(
          "2024-02-01T00:00:00.000Z",
        );
      });

      it("should set createdById and lastModifiedById correctly", async () => {
        // Create a transaction
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Test",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Test" }],
          });

        const transactionId = createResponse.body.data.transaction.id;
        expect(createResponse.body.data.transaction.createdById).toBeDefined();
        expect(
          createResponse.body.data.transaction.lastModifiedById,
        ).toBeNull();

        // Update the transaction
        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            memo: "Updated",
          });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.data.transaction.createdById).toBeDefined();
        expect(
          updateResponse.body.data.transaction.lastModifiedById,
        ).toBeDefined();
        expect(
          updateResponse.body.data.transaction.lastModifiedByName,
        ).toBeDefined();
        expect(
          updateResponse.body.data.transaction.lastModifiedByEmail,
        ).toBeDefined();
      });

      it("should require organization membership for updates", async () => {
        // Create another user in different org
        const otherUserResponse = await request(app)
          .post("/api/auth/register")
          .send({
            email: `other-user-${Date.now()}@example.com`,
            password: "Password123",
            name: "Other User",
          });

        const otherToken = otherUserResponse.body.data.token;

        // Create a transaction
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Test",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Test" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        // Try to update with other user's token
        const updateResponse = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${otherToken}`)
          .send({
            version: 1,
            memo: "Should fail",
          });

        expect(updateResponse.status).toBe(403);
      });
    });

    describe("Transaction Edit History", () => {
      it("should create edit history entry on update", async () => {
        // Create a transaction
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Original",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Food" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        // Update the transaction (memo only, no splits)
        await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            memo: "Updated memo",
          });

        // Get edit history
        const historyResponse = await request(app)
          .get(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/history`,
          )
          .set("Authorization", `Bearer ${token}`);

        expect(historyResponse.status).toBe(200);
        expect(historyResponse.body.data.history).toHaveLength(1);

        const edit = historyResponse.body.data.history[0];
        expect(edit.editedById).toBeDefined();
        expect(edit.editedByName).toBeDefined();
        expect(edit.editedByEmail).toBeDefined();
        expect(edit.editType).toBe("UPDATE");
        expect(edit.changes).toBeDefined();
        expect(Array.isArray(edit.changes)).toBe(true);
        expect(edit.previousState).toBeDefined();
      });

      it("should track field changes in edit history", async () => {
        // Create a transaction
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            memo: "Original",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Food" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        // Update memo and transactionType (without changing splits/amount to avoid SPLIT_CHANGE)
        await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            memo: "Updated memo",
            transactionType: "INCOME",
          });

        // Get edit history
        const historyResponse = await request(app)
          .get(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/history`,
          )
          .set("Authorization", `Bearer ${token}`);

        const changes = historyResponse.body.data.history[0].changes;
        expect(changes).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: "memo",
              oldValue: "Original",
              newValue: "Updated memo",
            }),
            expect.objectContaining({
              field: "transactionType",
              oldValue: "EXPENSE",
              newValue: "INCOME",
            }),
          ]),
        );
      });

      it("should mark SPLIT_CHANGE edit type when splits change", async () => {
        // Create a transaction
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Test",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Food" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        // Update splits
        await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            splits: [
              { amount: 50, categoryName: "Food" },
              { amount: 50, categoryName: "Transport" },
            ],
          });

        // Get edit history
        const historyResponse = await request(app)
          .get(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/history`,
          )
          .set("Authorization", `Bearer ${token}`);

        expect(historyResponse.body.data.history[0].editType).toBe(
          "SPLIT_CHANGE",
        );
      });

      it("should order edit history by most recent first", async () => {
        // Create a transaction
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Test",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Test" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        // Make three updates
        await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({ version: 1, memo: "Update 1" });

        await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({ version: 2, memo: "Update 2" });

        await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({ version: 3, memo: "Update 3" });

        // Get edit history
        const historyResponse = await request(app)
          .get(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/history`,
          )
          .set("Authorization", `Bearer ${token}`);

        expect(historyResponse.body.data.history).toHaveLength(3);

        const timestamps = historyResponse.body.data.history.map(
          (h: { editedAt: string }) => new Date(h.editedAt).getTime(),
        );

        // Verify descending order (most recent first)
        for (let i = 0; i < timestamps.length - 1; i++) {
          expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
        }
      });

      it("should return empty array for transactions with no edits", async () => {
        // Create a transaction without updates
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Test",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Test" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        // Get edit history immediately
        const historyResponse = await request(app)
          .get(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/history`,
          )
          .set("Authorization", `Bearer ${token}`);

        expect(historyResponse.status).toBe(200);
        expect(historyResponse.body.data.history).toEqual([]);
      });

      it("should require organization membership to view history", async () => {
        // Create another user
        const otherUserResponse = await request(app)
          .post("/api/auth/register")
          .send({
            email: `other-user-history-${Date.now()}@example.com`,
            password: "Password123",
            name: "Other User",
          });

        const otherToken = otherUserResponse.body.data.token;

        // Create a transaction
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Test",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Test" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        // Try to get history with other user's token
        const historyResponse = await request(app)
          .get(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/history`,
          )
          .set("Authorization", `Bearer ${otherToken}`);

        expect(historyResponse.status).toBe(403);
      });

      it("should include previousState snapshot in edit history", async () => {
        // Create a transaction with explicit memo
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            memo: "Original memo",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Food" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        // Update the transaction
        await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            memo: "Updated memo",
          });

        // Get edit history
        const historyResponse = await request(app)
          .get(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/history`,
          )
          .set("Authorization", `Bearer ${token}`);

        const previousState =
          historyResponse.body.data.history[0].previousState;
        expect(previousState).toBeDefined();
        expect(previousState.memo).toBe("Original memo");
        expect(previousState.amount).toBe(100);
        expect(previousState.transactionType).toBe("EXPENSE");
        expect(previousState.splits).toBeDefined();
        expect(Array.isArray(previousState.splits)).toBe(true);
      });
    });

    describe("Concurrent Edit Scenarios", () => {
      it("should handle concurrent edits by different users", async () => {
        // Create second user in the same organization
        testCounter++;
        const user2Email = `concurrent-user-${Date.now()}-${testCounter}@example.com`;
        const user2Response = await request(app)
          .post("/api/auth/register")
          .send({
            email: user2Email,
            password: "Password123",
            name: "User 2",
          });

        const token2 = user2Response.body.data.token;
        const user2Id = user2Response.body.data.user.id;

        // Add user2 to the organization
        const memberResponse = await request(app)
          .post(`/api/organizations/${orgId}/members`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            email: user2Email,
          });

        expect(memberResponse.status).toBe(201);

        // Update user2's role to ADMIN
        await request(app)
          .patch(`/api/organizations/${orgId}/members/${user2Id}`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            role: "ADMIN",
          });

        // Create a transaction
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            memo: "Shared transaction",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Food" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        // User 1 updates first
        const update1 = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            version: 1,
            memo: "User 1 update",
          });

        expect(update1.status).toBe(200);
        expect(update1.body.data.transaction.version).toBe(2);

        // User 2 tries to update with stale version
        const update2 = await request(app)
          .patch(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
          )
          .set("Authorization", `Bearer ${token2}`)
          .send({
            version: 1, // Stale
            memo: "User 2 update",
          });

        expect(update2.status).toBe(409);
        expect(update2.body.conflict).toBeDefined();
        expect(update2.body.conflict.lastModifiedByName).toBe("Test User");
      });

      it("should handle rapid sequential edits correctly", async () => {
        // Create a transaction
        const createResponse = await request(app)
          .post(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions`,
          )
          .set("Authorization", `Bearer ${token}`)
          .send({
            description: "Test",
            amount: 100,
            transactionType: "EXPENSE",
            splits: [{ amount: 100, categoryName: "Test" }],
          });

        const transactionId = createResponse.body.data.transaction.id;

        // Make 5 rapid updates
        for (let i = 1; i <= 5; i++) {
          const updateResponse = await request(app)
            .patch(
              `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`,
            )
            .set("Authorization", `Bearer ${token}`)
            .send({
              version: i,
              memo: `Update ${i}`,
            });

          expect(updateResponse.status).toBe(200);
          expect(updateResponse.body.data.transaction.version).toBe(i + 1);
        }

        // Verify edit history has all 5 entries
        const historyResponse = await request(app)
          .get(
            `/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/history`,
          )
          .set("Authorization", `Bearer ${token}`);

        expect(historyResponse.body.data.history).toHaveLength(5);
      });
    });
  });
});
