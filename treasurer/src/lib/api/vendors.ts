import { api } from '../api'
import type { Vendor } from '@/types'

/**
 * Input type for creating a new vendor.
 */
export interface CreateVendorInput {
  name: string
  description?: string
  defaultCategoryId?: string
}

/**
 * Input type for updating an existing vendor.
 */
export interface UpdateVendorInput {
  name?: string
  description?: string
  defaultCategoryId?: string | null
}

/**
 * Query parameters for searching vendors.
 */
export interface VendorSearchParams {
  search?: string
  limit?: number
  offset?: number
}

interface VendorResponse {
  success: boolean
  data: { vendor: Vendor }
  message?: string
}

interface VendorsListResponse {
  success: boolean
  data: Vendor[]
  pagination: {
    total: number
    limit: number
    page: number
    totalPages: number
  }
}

interface VendorSearchResponse {
  success: boolean
  data: {
    vendors: Vendor[]
  }
}

interface MessageResponse {
  success: boolean
  message: string
}

/**
 * API client for vendor operations.
 */
export const vendorApi = {
  /**
   * Create a new vendor.
   * @param orgId - Organization ID
   * @param data - Vendor creation data
   */
  create: (orgId: string, data: CreateVendorInput) =>
    api.post<VendorResponse>(`/organizations/${orgId}/vendors`, data),

  /**
   * List all vendors for an organization.
   * @param orgId - Organization ID
   * @param params - Optional query parameters
   */
  list: (orgId: string, params?: VendorSearchParams) => {
    const queryParams: Record<string, string> = {}
    if (params) {
      if (params.search) queryParams.search = params.search
      if (params.limit !== undefined) queryParams.limit = String(params.limit)
      if (params.offset !== undefined)
        queryParams.offset = String(params.offset)
    }
    return api.get<VendorsListResponse>(
      `/organizations/${orgId}/vendors`,
      Object.keys(queryParams).length > 0 ? { params: queryParams } : undefined
    )
  },

  /**
   * Search vendors with autocomplete support.
   * @param orgId - Organization ID
   * @param query - Search query
   * @param limit - Maximum number of results
   */
  search: (orgId: string, query: string, limit = 10) =>
    api.get<VendorSearchResponse>(`/organizations/${orgId}/vendors/search`, {
      params: { q: query, limit: String(limit) },
    }),

  /**
   * Get a single vendor by ID.
   * @param orgId - Organization ID
   * @param vendorId - Vendor ID
   */
  get: (orgId: string, vendorId: string) =>
    api.get<VendorResponse>(`/organizations/${orgId}/vendors/${vendorId}`),

  /**
   * Update an existing vendor.
   * @param orgId - Organization ID
   * @param vendorId - Vendor ID
   * @param data - Update data
   */
  update: (orgId: string, vendorId: string, data: UpdateVendorInput) =>
    api.patch<VendorResponse>(
      `/organizations/${orgId}/vendors/${vendorId}`,
      data
    ),

  /**
   * Delete a vendor.
   * @param orgId - Organization ID
   * @param vendorId - Vendor ID
   */
  delete: (orgId: string, vendorId: string) =>
    api.delete<MessageResponse>(`/organizations/${orgId}/vendors/${vendorId}`),
}
