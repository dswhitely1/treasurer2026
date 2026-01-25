/**
 * API Helper for E2E Tests
 *
 * Provides functions to create test data via API calls.
 * This allows E2E tests to be self-contained without requiring database seeds.
 */

const API_URL = process.env.VITE_API_URL || 'http://localhost:3001/api'

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string>
}

interface User {
  id: string
  email: string
  name: string
}

interface AuthResponse {
  user: User
  token: string
}

interface Organization {
  id: string
  name: string
}

interface Account {
  id: string
  name: string
  type: string
  balance: string
  currency: string
}

interface Category {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
}

interface Transaction {
  id: string
  description: string
  amount: string
  date: string
  transactionType: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  status: 'UNCLEARED' | 'CLEARED' | 'RECONCILED'
  version: number
  splits: TransactionSplit[]
}

interface TransactionSplit {
  id: string
  categoryId: string
  categoryName: string
  amount: string
  memo?: string
}

/**
 * Test data context created during setup.
 */
export interface TestDataContext {
  user: User
  token: string
  organization: Organization
  account: Account
  categories: Category[]
  transactions: Transaction[]
}

/**
 * Generate a unique email for test isolation.
 */
function generateTestEmail(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `e2e-test-${timestamp}-${random}@treasurer.test`
}

/**
 * Make an authenticated API request.
 */
async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: string
    body?: unknown
    token?: string
  } = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, token } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = (await response.json()) as ApiResponse<T>

  if (!response.ok) {
    throw new Error(
      `API Error ${response.status}: ${data.message ?? JSON.stringify(data)}`
    )
  }

  return data
}

/**
 * Register a new test user.
 */
export async function registerUser(userData?: {
  email?: string
  password?: string
  name?: string
}): Promise<AuthResponse> {
  const email = userData?.email || generateTestEmail()
  const password = userData?.password || 'TestPassword123!'
  const name = userData?.name || 'E2E Test User'

  const response = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: { email, password, name },
  })

  if (!response.data) {
    throw new Error('Registration failed: no data returned')
  }

  return response.data
}

/**
 * Login an existing user.
 */
export async function loginUser(credentials: {
  email: string
  password: string
}): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
  })

  if (!response.data) {
    throw new Error('Login failed: no data returned')
  }

  return response.data
}

/**
 * Create a new organization.
 */
export async function createOrganization(
  token: string,
  orgData?: { name?: string }
): Promise<Organization> {
  const name = orgData?.name || `E2E Test Org ${Date.now()}`

  const response = await apiRequest<Organization>('/organizations', {
    method: 'POST',
    body: { name },
    token,
  })

  if (!response.data) {
    throw new Error('Organization creation failed: no data returned')
  }

  return response.data
}

/**
 * Create a new account in an organization.
 */
export async function createAccount(
  token: string,
  orgId: string,
  accountData?: {
    name?: string
    type?: string
    initialBalance?: string
    currency?: string
  }
): Promise<Account> {
  const data = {
    name: accountData?.name || 'E2E Test Account',
    type: accountData?.type || 'CHECKING',
    initialBalance: accountData?.initialBalance || '10000.00',
    currency: accountData?.currency || 'USD',
  }

  const response = await apiRequest<Account>(
    `/organizations/${orgId}/accounts`,
    {
      method: 'POST',
      body: data,
      token,
    }
  )

  if (!response.data) {
    throw new Error('Account creation failed: no data returned')
  }

  return response.data
}

/**
 * Create a new category in an organization.
 */
export async function createCategory(
  token: string,
  orgId: string,
  categoryData: { name: string; type: 'INCOME' | 'EXPENSE' }
): Promise<Category> {
  const response = await apiRequest<Category>(
    `/organizations/${orgId}/categories`,
    {
      method: 'POST',
      body: categoryData,
      token,
    }
  )

  if (!response.data) {
    throw new Error('Category creation failed: no data returned')
  }

  return response.data
}

/**
 * Create a new transaction in an account.
 */
export async function createTransaction(
  token: string,
  orgId: string,
  accountId: string,
  transactionData: {
    description: string
    amount: number
    date: string
    transactionType: 'INCOME' | 'EXPENSE' | 'TRANSFER'
    splits: Array<{ amount: number; categoryName: string; memo?: string }>
  }
): Promise<Transaction> {
  const response = await apiRequest<Transaction>(
    `/organizations/${orgId}/accounts/${accountId}/transactions`,
    {
      method: 'POST',
      body: transactionData,
      token,
    }
  )

  if (!response.data) {
    throw new Error('Transaction creation failed: no data returned')
  }

  return response.data
}

/**
 * Update transaction status.
 */
export async function updateTransactionStatus(
  token: string,
  orgId: string,
  accountId: string,
  transactionId: string,
  status: 'UNCLEARED' | 'CLEARED' | 'RECONCILED',
  version: number
): Promise<Transaction> {
  const response = await apiRequest<Transaction>(
    `/organizations/${orgId}/accounts/${accountId}/transactions/${transactionId}/status`,
    {
      method: 'PATCH',
      body: { status, version },
      token,
    }
  )

  if (!response.data) {
    throw new Error('Status update failed: no data returned')
  }

  return response.data
}

/**
 * Set up complete test data context for E2E tests.
 * Creates user, organization, account, categories, and sample transactions.
 */
export async function setupTestData(): Promise<TestDataContext> {
  // Register a new user
  const auth = await registerUser()
  const { user, token } = auth

  // Create organization
  const organization = await createOrganization(token)

  // Create account
  const account = await createAccount(token, organization.id)

  // Create categories
  const categories: Category[] = []
  const categoryDefinitions = [
    { name: 'Groceries', type: 'EXPENSE' as const },
    { name: 'Salary', type: 'INCOME' as const },
    { name: 'Dining Out', type: 'EXPENSE' as const },
    { name: 'Entertainment', type: 'EXPENSE' as const },
    { name: 'Utilities', type: 'EXPENSE' as const },
  ]

  for (const catDef of categoryDefinitions) {
    const category = await createCategory(token, organization.id, catDef)
    categories.push(category)
  }

  // Create sample transactions
  const transactions: Transaction[] = []

  // Transaction 1: Grocery shopping (UNCLEARED)
  const txn1 = await createTransaction(token, organization.id, account.id, {
    description: 'Grocery shopping',
    amount: 125.5,
    date: '2026-01-15T00:00:00.000Z',
    transactionType: 'EXPENSE',
    splits: [{ amount: 125.5, categoryName: 'Groceries' }],
  })
  transactions.push(txn1)

  // Transaction 2: Monthly salary (CLEARED)
  const txn2 = await createTransaction(token, organization.id, account.id, {
    description: 'Monthly salary',
    amount: 5000.0,
    date: '2026-01-01T00:00:00.000Z',
    transactionType: 'INCOME',
    splits: [{ amount: 5000.0, categoryName: 'Salary' }],
  })
  // Update to CLEARED
  const txn2Updated = await updateTransactionStatus(
    token,
    organization.id,
    account.id,
    txn2.id,
    'CLEARED',
    txn2.version
  )
  transactions[1] = txn2Updated

  // Transaction 3: Split expense (UNCLEARED)
  const txn3 = await createTransaction(token, organization.id, account.id, {
    description: 'Split expense - Restaurant and Entertainment',
    amount: 200.0,
    date: '2026-01-10T00:00:00.000Z',
    transactionType: 'EXPENSE',
    splits: [
      { amount: 120.0, categoryName: 'Dining Out' },
      { amount: 80.0, categoryName: 'Entertainment' },
    ],
  })
  transactions.push(txn3)

  // Transaction 4: Reconciled (for testing edit restrictions)
  const txn4 = await createTransaction(token, organization.id, account.id, {
    description: 'Reconciled transaction - should not be editable',
    amount: 50.0,
    date: '2026-01-05T00:00:00.000Z',
    transactionType: 'EXPENSE',
    splits: [{ amount: 50.0, categoryName: 'Utilities' }],
  })
  // Update to CLEARED then RECONCILED
  const txn4Cleared = await updateTransactionStatus(
    token,
    organization.id,
    account.id,
    txn4.id,
    'CLEARED',
    txn4.version
  )
  const txn4Reconciled = await updateTransactionStatus(
    token,
    organization.id,
    account.id,
    txn4.id,
    'RECONCILED',
    txn4Cleared.version
  )
  transactions[3] = txn4Reconciled

  return {
    user,
    token,
    organization,
    account,
    categories,
    transactions,
  }
}
