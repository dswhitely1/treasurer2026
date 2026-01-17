import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'

const app = createApp()

// Counter for unique emails across tests
let testCounter = 0

describe('Transaction Routes', () => {
  let token: string
  let orgId: string
  let accountId: string

  // Helper to create a user, organization, and account for tests
  async function setupUserOrgAndAccount(initialBalance = 1000) {
    testCounter++
    const uniqueEmail = `transaction-test-${Date.now()}-${testCounter}@example.com`

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: uniqueEmail,
        password: 'Password123',
        name: 'Test User',
      })

    expect(registerResponse.status).toBe(201)
    token = registerResponse.body.data.token

    const orgResponse = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Organization' })

    expect(orgResponse.status).toBe(201)
    orgId = orgResponse.body.data.id

    const accountResponse = await request(app)
      .post(`/api/organizations/${orgId}/accounts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Account',
        accountType: 'CHECKING',
        balance: initialBalance,
      })

    expect(accountResponse.status).toBe(201)
    accountId = accountResponse.body.data.account.id
  }

  beforeEach(async () => {
    await setupUserOrgAndAccount(1000)
  })

  describe('Balance Updates', () => {
    describe('INCOME transactions', () => {
      it('should INCREASE balance when adding an INCOME transaction', async () => {
        // Get initial balance
        const initialAccountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)

        expect(initialAccountResponse.status).toBe(200)
        const initialBalance = parseFloat(initialAccountResponse.body.data.account.balance)
        expect(initialBalance).toBe(1000)

        // Create INCOME transaction
        const transactionResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Salary deposit',
            amount: 500,
            transactionType: 'INCOME',
            splits: [{ amount: 500, categoryName: 'Salary' }],
          })

        expect(transactionResponse.status).toBe(201)
        expect(transactionResponse.body.data.transaction.transactionType).toBe('INCOME')

        // Check that balance INCREASED
        const finalAccountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)

        expect(finalAccountResponse.status).toBe(200)
        const finalBalance = parseFloat(finalAccountResponse.body.data.account.balance)
        expect(finalBalance).toBe(1500) // 1000 + 500 = 1500
      })

      it('should INCREASE balance correctly with fee applied on INCOME', async () => {
        // First create an account with a transaction fee
        const feeAccountResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Fee Account',
            accountType: 'CHECKING',
            balance: 1000,
            transactionFee: 10,
          })

        expect(feeAccountResponse.status).toBe(201)
        const feeAccountId = feeAccountResponse.body.data.account.id

        // Create INCOME transaction with fee
        const transactionResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${feeAccountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Payment received',
            amount: 500,
            transactionType: 'INCOME',
            applyFee: true,
            splits: [{ amount: 500, categoryName: 'Sales' }],
          })

        expect(transactionResponse.status).toBe(201)

        // Check balance: should be 1000 + 500 - 10 = 1490
        const finalAccountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${feeAccountId}`)
          .set('Authorization', `Bearer ${token}`)

        expect(finalAccountResponse.status).toBe(200)
        const finalBalance = parseFloat(finalAccountResponse.body.data.account.balance)
        expect(finalBalance).toBe(1490) // 1000 + (500 - 10 fee) = 1490
      })
    })

    describe('EXPENSE transactions', () => {
      it('should DECREASE balance when adding an EXPENSE transaction', async () => {
        // Create EXPENSE transaction
        const transactionResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Grocery shopping',
            amount: 150,
            transactionType: 'EXPENSE',
            splits: [{ amount: 150, categoryName: 'Groceries' }],
          })

        expect(transactionResponse.status).toBe(201)

        // Check that balance DECREASED
        const finalAccountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)

        expect(finalAccountResponse.status).toBe(200)
        const finalBalance = parseFloat(finalAccountResponse.body.data.account.balance)
        expect(finalBalance).toBe(850) // 1000 - 150 = 850
      })

      it('should DECREASE balance correctly with fee applied on EXPENSE', async () => {
        // First create an account with a transaction fee
        const feeAccountResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Fee Account',
            accountType: 'CHECKING',
            balance: 1000,
            transactionFee: 5,
          })

        expect(feeAccountResponse.status).toBe(201)
        const feeAccountId = feeAccountResponse.body.data.account.id

        // Create EXPENSE transaction with fee
        const transactionResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${feeAccountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Online purchase',
            amount: 100,
            transactionType: 'EXPENSE',
            applyFee: true,
            splits: [{ amount: 100, categoryName: 'Shopping' }],
          })

        expect(transactionResponse.status).toBe(201)

        // Check balance: should be 1000 - 100 - 5 = 895
        const finalAccountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${feeAccountId}`)
          .set('Authorization', `Bearer ${token}`)

        expect(finalAccountResponse.status).toBe(200)
        const finalBalance = parseFloat(finalAccountResponse.body.data.account.balance)
        expect(finalBalance).toBe(895) // 1000 - 100 - 5 = 895
      })
    })

    describe('Default transaction type', () => {
      it('should default to EXPENSE when transactionType is not specified', async () => {
        // Create transaction without specifying type
        const transactionResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Unspecified transaction',
            amount: 100,
            // transactionType not specified - should default to EXPENSE
            splits: [{ amount: 100, categoryName: 'Misc' }],
          })

        expect(transactionResponse.status).toBe(201)
        expect(transactionResponse.body.data.transaction.transactionType).toBe('EXPENSE')

        // Balance should DECREASE (EXPENSE behavior)
        const finalAccountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)

        expect(finalAccountResponse.status).toBe(200)
        const finalBalance = parseFloat(finalAccountResponse.body.data.account.balance)
        expect(finalBalance).toBe(900) // 1000 - 100 = 900
      })
    })

    describe('Transaction deletion', () => {
      it('should reverse INCOME balance impact when deleting an INCOME transaction', async () => {
        // Create INCOME transaction
        const transactionResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Bonus',
            amount: 200,
            transactionType: 'INCOME',
            splits: [{ amount: 200, categoryName: 'Bonus' }],
          })

        expect(transactionResponse.status).toBe(201)
        const transactionId = transactionResponse.body.data.transaction.id

        // Verify balance increased
        let accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(accountResponse.status).toBe(200)
        expect(parseFloat(accountResponse.body.data.account.balance)).toBe(1200)

        // Delete the transaction
        const deleteResponse = await request(app)
          .delete(`/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(deleteResponse.status).toBe(200)

        // Verify balance returned to original
        accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(accountResponse.status).toBe(200)
        expect(parseFloat(accountResponse.body.data.account.balance)).toBe(1000)
      })

      it('should reverse EXPENSE balance impact when deleting an EXPENSE transaction', async () => {
        // Create EXPENSE transaction
        const transactionResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Coffee',
            amount: 50,
            transactionType: 'EXPENSE',
            splits: [{ amount: 50, categoryName: 'Food' }],
          })

        expect(transactionResponse.status).toBe(201)
        const transactionId = transactionResponse.body.data.transaction.id

        // Verify balance decreased
        let accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(accountResponse.status).toBe(200)
        expect(parseFloat(accountResponse.body.data.account.balance)).toBe(950)

        // Delete the transaction
        const deleteResponse = await request(app)
          .delete(`/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(deleteResponse.status).toBe(200)

        // Verify balance returned to original
        accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(accountResponse.status).toBe(200)
        expect(parseFloat(accountResponse.body.data.account.balance)).toBe(1000)
      })
    })

    describe('Multiple transactions', () => {
      it('should correctly handle mixed INCOME and EXPENSE transactions', async () => {
        // Initial balance: 1000

        // Add INCOME: +500 = 1500
        let response = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Paycheck',
            amount: 500,
            transactionType: 'INCOME',
            splits: [{ amount: 500, categoryName: 'Salary' }],
          })
        expect(response.status).toBe(201)

        // Add EXPENSE: -200 = 1300
        response = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Rent',
            amount: 200,
            transactionType: 'EXPENSE',
            splits: [{ amount: 200, categoryName: 'Housing' }],
          })
        expect(response.status).toBe(201)

        // Add INCOME: +100 = 1400
        response = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Side gig',
            amount: 100,
            transactionType: 'INCOME',
            splits: [{ amount: 100, categoryName: 'Freelance' }],
          })
        expect(response.status).toBe(201)

        // Add EXPENSE: -50 = 1350
        response = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Utilities',
            amount: 50,
            transactionType: 'EXPENSE',
            splits: [{ amount: 50, categoryName: 'Utilities' }],
          })
        expect(response.status).toBe(201)

        // Check final balance
        const accountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)

        expect(accountResponse.status).toBe(200)
        const finalBalance = parseFloat(accountResponse.body.data.account.balance)
        // 1000 + 500 - 200 + 100 - 50 = 1350
        expect(finalBalance).toBe(1350)
      })
    })

    describe('TRANSFER transactions', () => {
      it('should move money from source to destination account', async () => {
        // Create a second account as the destination
        const destAccountResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Destination Account',
            accountType: 'SAVINGS',
            balance: 500,
          })

        expect(destAccountResponse.status).toBe(201)
        const destAccountId = destAccountResponse.body.data.account.id

        // Create TRANSFER transaction: move 200 from source to destination
        const transactionResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Transfer to savings',
            amount: 200,
            transactionType: 'TRANSFER',
            destinationAccountId: destAccountId,
            splits: [{ amount: 200, categoryName: 'Transfer' }],
          })

        expect(transactionResponse.status).toBe(201)
        expect(transactionResponse.body.data.transaction.transactionType).toBe('TRANSFER')
        expect(transactionResponse.body.data.transaction.destinationAccountId).toBe(destAccountId)

        // Check source account balance decreased
        const sourceAccountResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)

        expect(sourceAccountResponse.status).toBe(200)
        const sourceBalance = parseFloat(sourceAccountResponse.body.data.account.balance)
        expect(sourceBalance).toBe(800) // 1000 - 200 = 800

        // Check destination account balance increased
        const destAccountCheckResponse = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destAccountId}`)
          .set('Authorization', `Bearer ${token}`)

        expect(destAccountCheckResponse.status).toBe(200)
        const destBalance = parseFloat(destAccountCheckResponse.body.data.account.balance)
        expect(destBalance).toBe(700) // 500 + 200 = 700
      })

      it('should apply fee only to source account on TRANSFER', async () => {
        // Create source account with transaction fee
        const feeSourceResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Fee Source Account',
            accountType: 'CHECKING',
            balance: 1000,
            transactionFee: 10,
          })

        expect(feeSourceResponse.status).toBe(201)
        const feeSourceId = feeSourceResponse.body.data.account.id

        // Create destination account
        const destResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Destination Account',
            accountType: 'SAVINGS',
            balance: 500,
          })

        expect(destResponse.status).toBe(201)
        const destId = destResponse.body.data.account.id

        // Create TRANSFER with fee: move 300, pay 10 fee
        const transactionResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${feeSourceId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Transfer with fee',
            amount: 300,
            transactionType: 'TRANSFER',
            destinationAccountId: destId,
            applyFee: true,
            splits: [{ amount: 300, categoryName: 'Transfer' }],
          })

        expect(transactionResponse.status).toBe(201)
        expect(transactionResponse.body.data.transaction.feeAmount).toBe('10')

        // Check source: should be 1000 - 300 - 10 = 690
        const sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${feeSourceId}`)
          .set('Authorization', `Bearer ${token}`)

        expect(sourceCheck.status).toBe(200)
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(690)

        // Check destination: should be 500 + 300 = 800 (no fee deducted)
        const destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set('Authorization', `Bearer ${token}`)

        expect(destCheck.status).toBe(200)
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(800)
      })

      it('should require destination account for TRANSFER', async () => {
        const transactionResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Transfer without destination',
            amount: 100,
            transactionType: 'TRANSFER',
            splits: [{ amount: 100, categoryName: 'Transfer' }],
          })

        expect(transactionResponse.status).toBe(400)
      })

      it('should not allow source and destination to be the same', async () => {
        const transactionResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Transfer to self',
            amount: 100,
            transactionType: 'TRANSFER',
            destinationAccountId: accountId, // Same as source
            splits: [{ amount: 100, categoryName: 'Transfer' }],
          })

        expect(transactionResponse.status).toBe(400)
      })

      it('should reverse both accounts when deleting a TRANSFER', async () => {
        // Create destination account
        const destResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Destination for Delete Test',
            accountType: 'SAVINGS',
            balance: 500,
          })

        expect(destResponse.status).toBe(201)
        const destId = destResponse.body.data.account.id

        // Create TRANSFER
        const transactionResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Transfer to delete',
            amount: 250,
            transactionType: 'TRANSFER',
            destinationAccountId: destId,
            splits: [{ amount: 250, categoryName: 'Transfer' }],
          })

        expect(transactionResponse.status).toBe(201)
        const transactionId = transactionResponse.body.data.transaction.id

        // Verify balances after transfer
        let sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(750) // 1000 - 250

        let destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(750) // 500 + 250

        // Delete the transfer
        const deleteResponse = await request(app)
          .delete(`/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(deleteResponse.status).toBe(200)

        // Verify balances are restored
        sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(1000) // Back to original

        destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(500) // Back to original
      })

      it('should not allow destinationAccountId for non-TRANSFER transactions', async () => {
        // Create a second account
        const destResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Other Account',
            accountType: 'SAVINGS',
            balance: 500,
          })

        expect(destResponse.status).toBe(201)
        const destId = destResponse.body.data.account.id

        // Try to create EXPENSE with destinationAccountId
        const transactionResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Expense with dest account',
            amount: 100,
            transactionType: 'EXPENSE',
            destinationAccountId: destId, // Should not be allowed
            splits: [{ amount: 100, categoryName: 'Test' }],
          })

        expect(transactionResponse.status).toBe(400)
      })
    })

    describe('TRANSFER update scenarios', () => {
      it('should update TRANSFER amount correctly on both accounts', async () => {
        // Create destination account
        const destResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Destination Account',
            accountType: 'SAVINGS',
            balance: 500,
          })

        expect(destResponse.status).toBe(201)
        const destId = destResponse.body.data.account.id

        // Create TRANSFER: 200 from source to dest
        const createResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Initial transfer',
            amount: 200,
            transactionType: 'TRANSFER',
            destinationAccountId: destId,
            splits: [{ amount: 200, categoryName: 'Transfer' }],
          })

        expect(createResponse.status).toBe(201)
        const transactionId = createResponse.body.data.transaction.id

        // Verify initial balances: source=800, dest=700
        let sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(800)

        let destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(700)

        // Update TRANSFER amount to 300
        const updateResponse = await request(app)
          .patch(`/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            amount: 300,
            splits: [{ amount: 300, categoryName: 'Transfer' }],
          })

        expect(updateResponse.status).toBe(200)

        // Verify updated balances: source=700 (additional 100 deducted), dest=800 (additional 100 added)
        sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(700)

        destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(800)
      })

      it('should update TRANSFER destination correctly', async () => {
        // Create two destination accounts
        const dest1Response = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Destination 1',
            accountType: 'SAVINGS',
            balance: 500,
          })
        expect(dest1Response.status).toBe(201)
        const dest1Id = dest1Response.body.data.account.id

        const dest2Response = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Destination 2',
            accountType: 'SAVINGS',
            balance: 500,
          })
        expect(dest2Response.status).toBe(201)
        const dest2Id = dest2Response.body.data.account.id

        // Create TRANSFER to dest1
        const createResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Transfer to dest1',
            amount: 200,
            transactionType: 'TRANSFER',
            destinationAccountId: dest1Id,
            splits: [{ amount: 200, categoryName: 'Transfer' }],
          })

        expect(createResponse.status).toBe(201)
        const transactionId = createResponse.body.data.transaction.id

        // Verify: source=800, dest1=700, dest2=500
        let dest1Check = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${dest1Id}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(dest1Check.body.data.account.balance)).toBe(700)

        // Update destination to dest2
        const updateResponse = await request(app)
          .patch(`/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            destinationAccountId: dest2Id,
          })

        expect(updateResponse.status).toBe(200)

        // Verify: dest1 back to 500, dest2 now 700
        dest1Check = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${dest1Id}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(dest1Check.body.data.account.balance)).toBe(500)

        const dest2Check = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${dest2Id}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(dest2Check.body.data.account.balance)).toBe(700)
      })

      it('should convert EXPENSE to TRANSFER correctly', async () => {
        // Create destination account
        const destResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Destination Account',
            accountType: 'SAVINGS',
            balance: 500,
          })
        expect(destResponse.status).toBe(201)
        const destId = destResponse.body.data.account.id

        // Create EXPENSE
        const createResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Original expense',
            amount: 200,
            transactionType: 'EXPENSE',
            splits: [{ amount: 200, categoryName: 'Shopping' }],
          })

        expect(createResponse.status).toBe(201)
        const transactionId = createResponse.body.data.transaction.id

        // Verify: source=800 (1000-200), dest=500
        let sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(800)

        // Convert to TRANSFER
        const updateResponse = await request(app)
          .patch(`/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            transactionType: 'TRANSFER',
            destinationAccountId: destId,
          })

        expect(updateResponse.status).toBe(200)

        // EXPENSE reversed (+200), TRANSFER applied (-200 from source, +200 to dest)
        // Net source: 800 + 200 - 200 = 800 (unchanged amount)
        // Dest: 500 + 200 = 700
        sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(800)

        const destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(700)
      })

      it('should convert TRANSFER to EXPENSE correctly', async () => {
        // Create destination account
        const destResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Destination Account',
            accountType: 'SAVINGS',
            balance: 500,
          })
        expect(destResponse.status).toBe(201)
        const destId = destResponse.body.data.account.id

        // Create TRANSFER
        const createResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Original transfer',
            amount: 200,
            transactionType: 'TRANSFER',
            destinationAccountId: destId,
            splits: [{ amount: 200, categoryName: 'Transfer' }],
          })

        expect(createResponse.status).toBe(201)
        const transactionId = createResponse.body.data.transaction.id

        // Verify: source=800, dest=700
        let sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(800)

        let destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(700)

        // Convert to EXPENSE (remove destination)
        const updateResponse = await request(app)
          .patch(`/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            transactionType: 'EXPENSE',
            destinationAccountId: null,
          })

        expect(updateResponse.status).toBe(200)

        // TRANSFER reversed: source +200, dest -200
        // EXPENSE applied: source -200
        // Net source: 800 + 200 - 200 = 800, dest: 700 - 200 = 500
        sourceCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${accountId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(sourceCheck.body.data.account.balance)).toBe(800)

        destCheck = await request(app)
          .get(`/api/organizations/${orgId}/accounts/${destId}`)
          .set('Authorization', `Bearer ${token}`)
        expect(parseFloat(destCheck.body.data.account.balance)).toBe(500)
      })

      it('should reject updating to TRANSFER without destination', async () => {
        // Create EXPENSE
        const createResponse = await request(app)
          .post(`/api/organizations/${orgId}/accounts/${accountId}/transactions`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            description: 'Expense',
            amount: 100,
            transactionType: 'EXPENSE',
            splits: [{ amount: 100, categoryName: 'Test' }],
          })

        expect(createResponse.status).toBe(201)
        const transactionId = createResponse.body.data.transaction.id

        // Try to convert to TRANSFER without destination
        const updateResponse = await request(app)
          .patch(`/api/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            transactionType: 'TRANSFER',
          })

        expect(updateResponse.status).toBe(400)
      })
    })
  })
})
