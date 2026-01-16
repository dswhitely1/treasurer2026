export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T | undefined
  message?: string | undefined
  errors?: Record<string, string[]> | undefined
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface JwtPayload {
  userId: string
  email: string
  role: string
}

export type OrganizationRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface OrganizationSummary {
  id: string
  name: string
  role: OrganizationRole
}

export interface OrganizationMemberInfo {
  id: string
  userId: string
  email: string
  name: string | null
  role: OrganizationRole
  joinedAt: string
}
