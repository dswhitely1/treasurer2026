import { api } from '../api'
import type { HierarchicalCategory, TransactionCategory } from '@/types'

/**
 * Input type for creating a new category.
 */
export interface CreateCategoryInput {
  name: string
  parentId?: string | null
}

/**
 * Input type for updating an existing category.
 */
export interface UpdateCategoryInput {
  name?: string
  parentId?: string | null
}

/**
 * Query parameters for listing categories.
 */
export interface CategoryQueryParams {
  flat?: boolean
  search?: string
  limit?: number
}

interface CategoryResponse {
  success: boolean
  data: { category: HierarchicalCategory }
  message?: string
}

interface CategoriesListResponse {
  success: boolean
  data: {
    categories: TransactionCategory[]
  }
}

interface HierarchicalCategoriesResponse {
  success: boolean
  data: {
    categories: HierarchicalCategory[]
  }
}

interface MessageResponse {
  success: boolean
  message: string
}

/**
 * API client for hierarchical category operations.
 */
export const hierarchicalCategoryApi = {
  /**
   * Create a new category.
   * @param orgId - Organization ID
   * @param data - Category creation data
   */
  create: (orgId: string, data: CreateCategoryInput) =>
    api.post<CategoryResponse>(`/organizations/${orgId}/categories`, data),

  /**
   * List categories with optional hierarchy.
   * @param orgId - Organization ID
   * @param params - Optional query parameters
   */
  list: (orgId: string, params?: CategoryQueryParams) => {
    const queryParams: Record<string, string> = {}
    if (params) {
      if (params.flat !== undefined) queryParams.flat = String(params.flat)
      if (params.search) queryParams.search = params.search
      if (params.limit !== undefined) queryParams.limit = String(params.limit)
    }
    return api.get<HierarchicalCategoriesResponse>(
      `/organizations/${orgId}/categories`,
      Object.keys(queryParams).length > 0 ? { params: queryParams } : undefined
    )
  },

  /**
   * List flat categories (for backward compatibility).
   * @param orgId - Organization ID
   * @param search - Optional search query
   * @param limit - Optional result limit
   */
  listFlat: (orgId: string, search?: string, limit?: number) => {
    const params: Record<string, string> = { flat: 'true' }
    if (search) params.search = search
    if (limit !== undefined) params.limit = String(limit)
    return api.get<CategoriesListResponse>(`/organizations/${orgId}/categories`, { params })
  },

  /**
   * List categories as a tree structure.
   * @param orgId - Organization ID
   */
  listTree: (orgId: string) =>
    api.get<HierarchicalCategoriesResponse>(`/organizations/${orgId}/categories`, {
      params: { flat: 'false' },
    }),

  /**
   * Get parent categories (top-level categories).
   * @param orgId - Organization ID
   */
  listParents: (orgId: string) =>
    api.get<HierarchicalCategoriesResponse>(`/organizations/${orgId}/categories`, {
      params: { parentOnly: 'true' },
    }),

  /**
   * Get child categories for a parent.
   * @param orgId - Organization ID
   * @param parentId - Parent category ID
   */
  listChildren: (orgId: string, parentId: string) =>
    api.get<HierarchicalCategoriesResponse>(`/organizations/${orgId}/categories`, {
      params: { parentId },
    }),

  /**
   * Get a single category by ID.
   * @param orgId - Organization ID
   * @param categoryId - Category ID
   */
  get: (orgId: string, categoryId: string) =>
    api.get<CategoryResponse>(`/organizations/${orgId}/categories/${categoryId}`),

  /**
   * Update an existing category.
   * @param orgId - Organization ID
   * @param categoryId - Category ID
   * @param data - Update data
   */
  update: (orgId: string, categoryId: string, data: UpdateCategoryInput) =>
    api.patch<CategoryResponse>(
      `/organizations/${orgId}/categories/${categoryId}`,
      data
    ),

  /**
   * Delete a category.
   * @param orgId - Organization ID
   * @param categoryId - Category ID
   */
  delete: (orgId: string, categoryId: string) =>
    api.delete<MessageResponse>(`/organizations/${orgId}/categories/${categoryId}`),
}
