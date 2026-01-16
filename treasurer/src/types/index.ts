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
export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'INVESTMENT' | 'OTHER'

export interface Account {
  id: string
  name: string
  description: string | null
  institution: string | null
  accountType: AccountType
  balance: string
  currency: string
  isActive: boolean
  organizationId: string
  createdAt: string
  updatedAt: string
}
