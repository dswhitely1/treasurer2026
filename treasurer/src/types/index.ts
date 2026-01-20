/**
 * Common type definitions for the application.
 */

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  amount: number
  description: string
  category: string
  date: string
  type: 'income' | 'expense'
  userId: string
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  color: string
  icon?: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Organization types
export type OrganizationRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface OrganizationSummary {
  id: string
  name: string
  role: OrganizationRole
}

export interface OrganizationMember {
  id: string
  userId: string
  email: string
  name: string | null
  role: OrganizationRole
  joinedAt: string
}

export interface Organization {
  id: string
  name: string
  role: OrganizationRole
  createdAt: string
}

// Account types
export type AccountType =
  | 'CHECKING'
  | 'SAVINGS'
  | 'CREDIT_CARD'
  | 'CASH'
  | 'INVESTMENT'
  | 'OTHER'

export interface Account {
  id: string
  name: string
  description: string | null
  institution: string | null
  accountType: AccountType
  balance: string
  currency: string
  isActive: boolean
  transactionFee: string | null
  organizationId: string
  createdAt: string
  updatedAt: string
}

// Transaction types
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER'

export interface TransactionSplit {
  id: string
  amount: string
  categoryId: string
  categoryName: string
}

export interface AccountTransaction {
  id: string
  description: string | null
  amount: string
  transactionType: TransactionType
  date: string
  feeAmount: string | null
  vendorId: string | null
  vendorName: string | null
  accountId: string
  splits: TransactionSplit[]
  createdAt: string
  updatedAt: string
}

export interface TransactionCategory {
  id: string
  name: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

/**
 * Hierarchical category with parent-child relationships.
 */
export interface HierarchicalCategory {
  id: string
  name: string
  parentId: string | null
  parent?: HierarchicalCategory | null
  children?: HierarchicalCategory[]
  organizationId: string
  createdAt: string
  updatedAt: string
}

/**
 * Vendor for transaction payee/merchant tracking.
 */
export interface Vendor {
  id: string
  name: string
  description: string | null
  defaultCategoryId: string | null
  defaultCategory?: HierarchicalCategory | null
  organizationId: string
  transactionCount?: number
  createdAt: string
  updatedAt: string
}

/**
 * Extended transaction with vendor and memo support.
 */
export interface ExtendedAccountTransaction extends AccountTransaction {
  memo: string | null
  vendorId: string | null
  vendor?: Vendor | null
}

/**
 * Transaction with version for optimistic locking.
 */
export interface VersionedTransaction extends ExtendedAccountTransaction {
  /** Version number for optimistic locking (incremented on each update) */
  version: number
}

/**
 * Conflict state when a 409 Conflict response is received.
 */
/**
 * State representing conflict resolution status.
 * Uses discriminated union to make invalid states unrepresentable.
 */
export type ConflictState =
  | {
      /** No conflict exists */
      hasConflict: false
      serverVersion?: never
      serverData?: never
      clientVersion?: never
    }
  | {
      /** Conflict exists - server data must be present */
      hasConflict: true
      /** Server version number at time of conflict */
      serverVersion: number
      /** Server data at time of conflict (guaranteed non-null when conflict exists) */
      serverData: VersionedTransaction
      /** Client version number when edit was attempted */
      clientVersion: number
    }

/**
 * A single entry in the edit history.
 */
export interface EditHistoryEntry {
  /** Unique ID for this history entry */
  id: string
  /** Transaction ID this entry belongs to */
  transactionId: string
  /** User who made the edit */
  userId: string
  /** User's name or email for display */
  userName: string
  /** Timestamp when the edit was made */
  editedAt: string
  /** Version number after this edit */
  version: number
  /** Description of the changes made */
  changes: EditHistoryChange[]
}

/**
 * A single field change in an edit history entry.
 */
export interface EditHistoryChange {
  /** Field that was changed */
  field: string
  /** Previous value (serialized to string) */
  oldValue: string | null
  /** New value (serialized to string) */
  newValue: string | null
}

/**
 * Form data structure for editing a transaction.
 */
export interface TransactionEditFormData {
  /** Transaction description */
  description: string
  /** Transaction amount (as string for form input) */
  amount: string
  /** Transaction type */
  transactionType: TransactionType
  /** Transaction date (YYYY-MM-DD format) */
  date: string
  /** Whether to apply account transaction fee */
  applyFee: boolean
  /** Category splits */
  splits: TransactionEditSplit[]
  /** Vendor ID */
  vendorId: string | null
  /** Additional memo/notes */
  memo: string
}

/**
 * Split item for edit form.
 */
export interface TransactionEditSplit {
  /** Unique ID for React key */
  id: string
  /** Split amount (as string for form input) */
  amount: string
  /** Category ID */
  categoryId: string | null
  /** Category name for display */
  categoryName: string
  /** Full category path for display */
  categoryPath: string
}

/**
 * Validation errors for transaction edit form.
 */
export interface TransactionEditValidationErrors {
  description?: string
  amount?: string
  date?: string
  splits?: string
  general?: string
}
