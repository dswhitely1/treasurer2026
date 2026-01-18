# Treasurer Application Testing Guide

## 🎉 New Features Implemented

Your Treasurer application now includes:

1. **Vendor Management** - Track vendors/payees with autocomplete
2. **Hierarchical Categories** - Organize categories with parent-child relationships (up to 3 levels)
3. **Enhanced Transactions** - Link transactions to vendors with memo field support

---

## 🚀 Quick Start

### Services Are Running:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api-docs
- **Database**: PostgreSQL on localhost:5432

All services are running via Docker Compose.

---

## 📋 Testing Checklist

### 1. Test Vendor Management

#### Navigate to Vendors Page
1. Log in to your application
2. Click **"Vendors"** in the main navigation
3. You should see the Vendors page at `/organizations/{orgId}/vendors`

#### Create a Vendor
1. Click **"Add Vendor"** button
2. Fill in vendor details:
   - **Name**: "Amazon Web Services" (required)
   - **Description**: "Cloud infrastructure provider" (optional)
3. Click **"Create"**
4. Verify the vendor appears in the list

#### Test Autocomplete Search
1. Create a few more vendors:
   - "Microsoft Azure"
   - "Google Cloud Platform"
   - "Amazon Prime"
2. Use the search box to filter vendors
3. Type "amazon" - should show both Amazon vendors
4. Type "cloud" - should show AWS and GCP

#### Edit a Vendor
1. Click the edit icon on a vendor card
2. Update the name or description
3. Save changes
4. Verify updates appear in the list

#### Try to Delete a Vendor
1. Click the delete icon on a vendor
2. Confirm deletion
3. If the vendor has transactions, you'll get an error (working as designed!)
4. If no transactions, the vendor will be deleted

---

### 2. Test Hierarchical Categories

#### Navigate to Categories Page
1. Click **"Categories"** in the main navigation
2. You should see the Categories page at `/organizations/{orgId}/categories`

#### Create Root Categories
1. Click **"Add Category"** button
2. Create a root category (no parent):
   - **Name**: "Fundraiser"
   - **Parent**: (leave empty)
3. Create more root categories:
   - "Operating Expenses"
   - "Programs"

#### Create Child Categories
1. Click **"Add Category"** again
2. Create a child category:
   - **Name**: "Spring Gala"
   - **Parent**: Select "Fundraiser"
3. Create more children under Fundraiser:
   - "Fall Festival"
   - "Annual Auction"

#### Create Grandchild Categories (3 levels deep)
1. Create a grandchild:
   - **Name**: "Spring Gala Tickets"
   - **Parent**: Select "Spring Gala"
2. Try to create a 4th level - should be prevented (max depth = 3)

#### Test Category Tree Visualization
1. Expand/collapse category nodes
2. Verify the indentation shows hierarchy levels
3. Check that breadcrumbs display: "Fundraiser > Spring Gala > Tickets"

#### Edit a Category
1. Click the edit icon on a category
2. Change the parent to move it in the hierarchy
3. Save and verify the tree updates

#### Test Circular Reference Prevention
1. Try to set a category as its own parent - should fail
2. Try to set a parent as a child of its own child - should fail

---

### 3. Test Enhanced Transaction Form

#### Navigate to an Account
1. Go to **Accounts**
2. Click on an account to view transactions
3. Click **"Add Transaction"**

#### Create Transaction with Vendor
1. Fill in transaction details:
   - **Amount**: 150.00
   - **Type**: EXPENSE
   - **Memo**: "Monthly cloud infrastructure"
   - **Date**: (today)

2. **Select a Vendor**:
   - Click the vendor dropdown
   - Start typing "amazon"
   - Select "Amazon Web Services" from autocomplete
   - Notice: vendor field supports type-ahead search

3. **Select Hierarchical Category**:
   - **Parent Category**: Select "Operating Expenses"
   - **Sub-Category**: Select one of its children
   - See breadcrumb: "Operating Expenses > Cloud Services"

4. Click **"Add Transaction"**

#### Verify Transaction Display
1. The new transaction should appear in the list
2. Transaction card should show:
   - Memo field
   - Vendor name
   - Category with full path
   - Amount and date

#### Test Vendor Autocomplete in Transaction Form
1. Add another transaction
2. In the vendor field, type just "mic"
3. Should show "Microsoft Azure"
4. Can also create a new vendor inline if needed

#### Test Category Selection
1. Create a transaction
2. Select a root category (e.g., "Fundraiser")
3. Then select a sub-category (e.g., "Spring Gala")
4. Verify the full path is shown

---

## 🔍 Advanced Testing

### Test Vendor Delete Protection
1. Create a vendor (e.g., "Test Vendor")
2. Create a transaction linked to that vendor
3. Try to delete the vendor
4. **Expected**: Error message saying vendor has transactions
5. **This prevents orphaned transaction data!**

### Test Category Depth Limit
1. Create a root category: "Level 1"
2. Create a child: "Level 2" (parent = Level 1)
3. Create a grandchild: "Level 3" (parent = Level 2)
4. Try to create a great-grandchild: "Level 4" (parent = Level 3)
5. **Expected**: Error - maximum depth of 3 exceeded

### Test Category with Transactions
1. Create transactions using a specific category
2. Try to delete that category
3. **Expected**: Error - category is in use by transactions

### Test Multi-Tenant Isolation
1. Create vendors and categories in Organization A
2. Switch to Organization B
3. **Expected**: Organization B should NOT see Organization A's vendors/categories
4. Each organization has isolated data

---

## 🎨 UI/UX Features to Test

### Vendor Autocomplete
- **Debouncing**: Type quickly - search waits 300ms after you stop typing
- **Empty State**: Clear search shows all vendors
- **Loading State**: Shows spinner while searching
- **No Results**: Shows helpful message if no vendors match

### Category Tree
- **Expand/Collapse**: Click arrows to expand/collapse nodes
- **Visual Hierarchy**: Indentation shows parent-child relationships
- **Breadcrumbs**: Full path shown when selecting categories
- **Action Buttons**: Edit/Delete icons appear on hover

### Transaction Form
- **Vendor Pre-fill**: If vendor has a default category, it's pre-selected
- **Validation**: All fields validated before submission
- **Error Handling**: Clear error messages for invalid data
- **Loading States**: Form disabled while submitting

---

## 📊 API Testing (Optional)

### Using API Documentation
1. Open http://localhost:3001/api-docs
2. Expand **Vendors** section
3. Try out endpoints:
   - `GET /api/organizations/{orgId}/vendors`
   - `POST /api/organizations/{orgId}/vendors`
   - `GET /api/organizations/{orgId}/vendors/search?q=amazon`

### Test API Directly with curl

**Create a Vendor:**
```bash
curl -X POST http://localhost:3001/api/organizations/{orgId}/vendors \
  -H "Authorization: Bearer {your-jwt-token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Vendor", "description": "Test vendor"}'
```

**Search Vendors (Autocomplete):**
```bash
curl http://localhost:3001/api/organizations/{orgId}/vendors/search?q=amazon \
  -H "Authorization: Bearer {your-jwt-token}"
```

**Get Category Tree:**
```bash
curl http://localhost:3001/api/organizations/{orgId}/categories?flat=false \
  -H "Authorization: Bearer {your-jwt-token}"
```

---

## ✅ Expected Behavior Summary

| Feature | Expected Behavior |
|---------|-------------------|
| **Vendor Creation** | Unique name per organization, case-insensitive |
| **Vendor Autocomplete** | Fuzzy search, shows top 10 results, 300ms debounce |
| **Vendor Deletion** | Blocked if vendor has transactions |
| **Category Hierarchy** | Max 3 levels deep, visual tree structure |
| **Circular References** | Prevented - can't set category as its own ancestor |
| **Category Deletion** | Blocked if category has transactions or children |
| **Transaction Vendor** | Optional, autocomplete search, inline creation |
| **Transaction Memo** | Optional descriptive field (renamed from description) |
| **Transaction Category** | Two-step selection: parent then child |
| **Organization Isolation** | Vendors and categories are org-scoped |

---

## 🐛 Known Limitations

1. **Max Category Depth**: Limited to 3 levels (root → parent → child)
2. **Category Names**: Must be unique across entire organization (not just within parent)
3. **Vendor Names**: Must be unique per organization
4. **Delete Protection**: Cannot delete vendors/categories with existing transactions
5. **Rate Limiting**: Search endpoints limited to 60 req/min (vendors) and 30 req/min (category tree)

---

## 🔧 Troubleshooting

### Issue: Vendors not appearing in autocomplete
- **Check**: Make sure vendor is active (not soft-deleted)
- **Try**: Refresh the page to clear cache
- **Verify**: Vendor belongs to current organization

### Issue: Cannot create category
- **Check**: Category name must be unique in organization
- **Check**: Parent category exists and is valid
- **Check**: Not exceeding max depth of 3 levels

### Issue: Cannot delete vendor/category
- **Check**: Vendor/category might have associated transactions
- **Solution**: Remove transactions first, or use soft-delete (mark inactive)

### Issue: Transaction form not showing vendor
- **Check**: Make sure you're on an account's transaction page
- **Check**: Organization has vendors created
- **Try**: Refresh the page

---

## 📈 Performance Testing

### Vendor Autocomplete Performance
- **Expected**: <200ms response time for autocomplete
- **Test**: Create 100+ vendors, search should still be fast
- **Caching**: Results cached for 5 minutes on client

### Category Tree Performance
- **Expected**: <5ms to render tree of 100 categories
- **Test**: Create deep hierarchy, expand/collapse should be instant
- **Caching**: Server-side cache for 5 minutes, refreshed on updates

### Transaction Creation
- **Expected**: <500ms to create transaction with vendor and category
- **Test**: Create multiple transactions, should remain responsive

---

## ✨ Next Steps

After testing, you can:

1. **Customize Vendor Fields**: Add more vendor metadata (phone, email, address)
2. **Category Icons**: Add icons to categories for visual distinction
3. **Vendor Defaults**: Set default category per vendor for quicker transaction entry
4. **Bulk Operations**: Import vendors/categories from CSV
5. **Reports**: Generate reports by vendor or hierarchical category
6. **Budget Tracking**: Set budgets per category with variance reporting

---

## 📞 Support

If you encounter any issues:

1. Check browser console for errors (F12 → Console)
2. Check Docker logs: `docker compose logs api` or `docker compose logs client`
3. Verify database migrations ran: `cd treasurer-api && npx prisma migrate status`
4. Report issues at: https://github.com/anthropics/claude-code/issues

---

## 🎯 Success Criteria

Your implementation is successful if you can:

- ✅ Create vendors and use autocomplete to find them
- ✅ Build a 3-level category hierarchy
- ✅ Create transactions with vendor and hierarchical category selections
- ✅ Edit vendors and categories
- ✅ See delete protection working for items with transactions
- ✅ Navigate between Vendors and Categories pages
- ✅ Experience fast autocomplete (<200ms)
- ✅ See proper organization isolation (multi-tenant)

---

**Congratulations!** You've successfully integrated vendor management and hierarchical categories into your Treasurer application! 🎉
