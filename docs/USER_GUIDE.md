# Treasurer User Guide

**Version:** 0.1.0
**Last Updated:** 2026-01-17

## Table of Contents

1. [Getting Started](#getting-started)
2. [Account Management](#account-management)
3. [Transaction Management](#transaction-management)
4. [Transaction Status](#transaction-status)
5. [Account Reconciliation](#account-reconciliation)
6. [Categories and Budgeting](#categories-and-budgeting)
7. [Organizations and Teams](#organizations-and-teams)
8. [Common Questions](#common-questions)
9. [Troubleshooting](#troubleshooting)
10. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Getting Started

### Creating Your Account

1. Navigate to the Treasurer application
2. Click "Register" or "Sign Up"
3. Enter your email address and create a password (minimum 8 characters)
4. Optionally add your name
5. Click "Create Account"

**Note:** Your password is securely hashed and never stored in plain text.

### First Login

1. Enter your email and password
2. Click "Log In"
3. You'll be taken to your dashboard

### Creating Your First Organization

Organizations in Treasurer allow you to manage finances for different entities (personal, family, business, etc.).

1. Click "Create Organization" from the dashboard
2. Enter organization name (e.g., "My Personal Finances")
3. Click "Create"

You'll automatically become the **Owner** of this organization.

### Creating Your First Account

Financial accounts represent your bank accounts, credit cards, cash, etc.

1. Navigate to "Accounts" in the sidebar
2. Click "Add Account"
3. Fill in account details:
   - **Name**: Descriptive name (e.g., "Chase Checking")
   - **Type**: Select account type (Checking, Savings, Credit Card, etc.)
   - **Institution**: Bank name (optional)
   - **Starting Balance**: Current balance
   - **Currency**: USD (default)
4. Click "Create Account"

---

## Account Management

### Account Types

**Checking**: Standard checking accounts
**Savings**: Savings accounts or money market accounts
**Credit Card**: Credit card accounts (balances are typically negative)
**Cash**: Physical cash
**Investment**: Investment accounts
**Other**: Any other account type

### Viewing Account Details

1. Navigate to "Accounts"
2. Click on an account to view:
   - Current balance
   - Recent transactions
   - Transaction summary by status

### Editing an Account

1. Navigate to account details
2. Click "Edit Account"
3. Modify fields as needed
4. Click "Save Changes"

**Note:** Only Owners and Admins can edit accounts.

### Deactivating an Account

Instead of deleting accounts, you can mark them as inactive:

1. Navigate to account details
2. Click "Edit Account"
3. Uncheck "Active"
4. Click "Save"

Inactive accounts won't show in default views but preserve all transaction history.

---

## Transaction Management

### Creating a Transaction

#### Standard Transaction (Income or Expense)

1. Navigate to an account
2. Click "Add Transaction"
3. Fill in details:
   - **Description**: What the transaction is for
   - **Amount**: Transaction amount (positive number)
   - **Type**: Income or Expense
   - **Date**: When transaction occurred
   - **Category**: Optional categorization
4. Click "Create Transaction"

#### Transfer Between Accounts

1. Navigate to the source account
2. Click "Add Transaction"
3. Select "Transfer" as type
4. Enter amount
5. Select destination account
6. Click "Create Transfer"

**Note:** Transfers create linked transactions in both accounts.

### Editing a Transaction

1. Navigate to the transaction
2. Click "Edit"
3. Modify details
4. Click "Save Changes"

**Important:** You cannot edit transactions that are **RECONCILED**.

### Deleting a Transaction

1. Navigate to the transaction
2. Click "Delete"
3. Confirm deletion

**Important:** You cannot delete transactions that are **RECONCILED**.

### Filtering Transactions

Use filters to find specific transactions:

- **By Status**: UNCLEARED, CLEARED, RECONCILED
- **By Type**: Income, Expense, Transfer
- **By Date Range**: Custom date range
- **By Category**: Specific category

---

## Transaction Status

Understanding transaction status is key to maintaining accurate financial records.

### Status Types

**🟡 UNCLEARED**
- Transaction has been entered but not yet appeared on bank statement
- Fully editable and deletable
- Default status for new transactions

**🔵 CLEARED**
- Transaction has appeared on your bank statement
- Amounts have been verified
- Still editable if you find errors
- Ready for reconciliation

**🟢 RECONCILED**
- Transaction has been verified and locked
- Part of a completed reconciliation
- Cannot be edited or deleted
- Ensures historical accuracy

### Changing Transaction Status

#### Mark Single Transaction as Cleared

1. Find the transaction in your list
2. Click the status badge (shows current status)
3. Select "Mark as Cleared"
4. Optionally add a note
5. Click "Confirm"

Transaction will move from UNCLEARED to CLEARED status.

#### Revert Cleared Transaction to Uncleared

If you find an error in a CLEARED transaction:

1. Click the transaction's status badge
2. Select "Revert to Uncleared"
3. Click "Confirm"

You can now edit or delete the transaction.

### Status Transition Rules

✅ **Allowed Transitions:**
- UNCLEARED → CLEARED
- CLEARED → UNCLEARED
- CLEARED → RECONCILED

❌ **Not Allowed:**
- UNCLEARED → RECONCILED (must go through CLEARED first)
- RECONCILED → anything (terminal state)

---

## Account Reconciliation

Reconciliation is the process of matching your Treasurer records with your bank statement.

### When to Reconcile

Reconcile your accounts:
- **Monthly**: When you receive your bank statement
- **Weekly**: For high-activity accounts
- **Before financial reports**: To ensure accuracy

### Reconciliation Workflow

#### Step 1: Prepare

1. Gather your bank statement
2. Note the **statement ending balance**
3. Note the **statement ending date**

#### Step 2: Navigate to Reconciliation

1. Go to "Reconciliation" in the sidebar
2. Select the account to reconcile

#### Step 3: Enter Statement Details

1. Enter **Statement Balance**: The ending balance from your statement
2. Enter **Statement Date**: The date of the statement
3. Click "Continue"

#### Step 4: Review Summary

The system displays:
- **Uncleared Transactions**: Count and total
- **Cleared Transactions**: Count and total
- **Reconciled Transactions**: Count and total (from previous reconciliations)

#### Step 5: Mark Transactions as Cleared

1. The system filters to show CLEARED transactions
2. Go through your bank statement line by line
3. For each transaction on your statement:
   - Find matching transaction in Treasurer
   - Click checkbox to select it
   - Verify amount matches

**Tip:** You can also mark transactions as CLEARED before starting reconciliation.

#### Step 6: Select Transactions to Reconcile

Once you've verified all CLEARED transactions:

1. Use checkboxes to select transactions that appear on your statement
2. Or click "Select All" to select all visible CLEARED transactions
3. Review your selection count

#### Step 7: Verify Balance

Before finalizing:
1. Check that selected transaction total matches your calculations
2. Verify that the difference between statement balance and cleared balance is zero

#### Step 8: Complete Reconciliation

1. Click "Reconcile Selected Transactions"
2. Review the confirmation
3. Click "Confirm Reconciliation"

The selected transactions will move to RECONCILED status and become locked.

#### Step 9: Handle Discrepancies

If totals don't match:

**Common causes:**
- Missing transactions in Treasurer
- Transactions not yet appeared on statement
- Data entry errors
- Bank fees or interest not recorded

**Resolution:**
1. Add any missing transactions
2. Verify transaction amounts
3. Check for bank fees or interest
4. Re-run reconciliation

### Bulk Operations

#### Select Multiple Transactions

**Individual Selection:**
- Click checkbox next to each transaction

**Select All:**
- Click "Select All" checkbox at top of list
- Selects all visible transactions

**Select All Except:**
- Click "Select All"
- Uncheck specific transactions to exclude

#### Bulk Mark as Cleared

1. Filter to show UNCLEARED transactions
2. Select transactions that appear on statement
3. Click "Mark as Cleared" button
4. All selected transactions move to CLEARED status

#### Bulk Reconcile

1. Filter to show CLEARED transactions
2. Select transactions to reconcile
3. Click "Reconcile Selected"
4. Enter optional note (e.g., "January 2026 statement")
5. Click "Confirm"

---

## Categories and Budgeting

### Creating Categories

Categories help you track spending by type.

1. Navigate to "Categories"
2. Click "Add Category"
3. Enter category name (e.g., "Groceries", "Utilities")
4. Click "Create"

### Assigning Categories to Transactions

**During Transaction Creation:**
1. When creating a transaction
2. Select category from dropdown
3. Save transaction

**Editing Existing Transaction:**
1. Open transaction
2. Click "Edit"
3. Select category
4. Save changes

### Splitting Transactions

Split single transactions across multiple categories:

1. Create or edit transaction
2. Click "Add Split"
3. Enter amount and category for each split
4. Ensure split totals equal transaction amount
5. Save transaction

**Example:** $100 grocery trip
- $60 → Food
- $30 → Household Items
- $10 → Personal Care

---

## Organizations and Teams

### Organization Roles

**Owner:**
- Full control of organization
- Can delete organization
- Can manage all members
- Can perform all financial operations

**Admin:**
- Manage financial data
- Add/remove members (except owners)
- Cannot delete organization

**Member:**
- View financial data
- Cannot modify data
- Read-only access

### Inviting Team Members

1. Navigate to organization settings
2. Click "Members"
3. Click "Invite Member"
4. Enter email address
5. Select role (Admin or Member)
6. Click "Send Invitation"

### Switching Organizations

If you belong to multiple organizations:

1. Click organization name in top navigation
2. Select organization from dropdown
3. Dashboard updates to show selected organization

---

## Common Questions

### Can I recover deleted transactions?

No. Deleted transactions are permanently removed. However, RECONCILED transactions cannot be deleted, providing protection for finalized data.

### Why can't I edit a reconciled transaction?

Reconciled transactions are locked to preserve the integrity of your financial records. This ensures your reconciliation history remains accurate for auditing and reporting.

### How do I handle bank fees?

1. Create a new EXPENSE transaction
2. Enter bank fee amount
3. Mark as CLEARED (if already on statement)
4. Categorize as "Bank Fees"

### What if I make a mistake after reconciling?

If you discover an error in a RECONCILED transaction:

1. Create an offsetting transaction to correct the amount
2. Add a note explaining the correction
3. Include both transactions in your next reconciliation

### Can I import transactions from my bank?

Bank import feature is planned for a future release. Currently, you must enter transactions manually.

### How do I export my data?

Data export feature is planned. Currently, you can view and screenshot data as needed.

---

## Troubleshooting

### "Cannot modify reconciled transactions"

**Solution:** Reconciled transactions are locked. Create an offsetting transaction to make corrections.

### Balance doesn't match bank statement

**Possible causes:**
1. Missing transactions
2. Incorrect transaction amounts
3. Bank fees not recorded
4. Outstanding transactions not yet on statement

**Solution:**
1. Compare Treasurer list with bank statement line-by-line
2. Add any missing transactions
3. Verify all amounts
4. Check for bank fees or interest

### Can't find a transaction

**Solution:**
1. Check status filters (ensure all statuses are visible)
2. Expand date range filter
3. Search by description
4. Check if in different account (for transfers)

### Slow performance

**Solution:**
1. Refresh the page
2. Clear browser cache
3. Try a different browser
4. Contact support if issue persists

---

## Keyboard Shortcuts

### Global

- `Ctrl/Cmd + K`: Quick search
- `Ctrl/Cmd + /`: Show keyboard shortcuts
- `Esc`: Close modal or dialog

### Transaction List

- `↑/↓`: Navigate transactions
- `Space`: Select/deselect transaction
- `Ctrl/Cmd + A`: Select all
- `Ctrl/Cmd + D`: Deselect all
- `Enter`: Open selected transaction

### During Reconciliation

- `Space`: Toggle transaction selection
- `Ctrl/Cmd + Shift + C`: Mark selected as cleared
- `Ctrl/Cmd + Shift + R`: Reconcile selected
- `Esc`: Cancel reconciliation

---

## Getting Help

For additional support:

1. **Documentation**: Review this guide and technical documentation
2. **Contact Support**: Email support@treasurer.app (if applicable)
3. **Community Forum**: Join discussions with other users (if applicable)
4. **Report Issues**: Submit bug reports via GitHub (if applicable)

---

**Document Metadata:**
- **Version:** 0.1.0
- **Last Updated:** 2026-01-17
- **Audience:** End Users
