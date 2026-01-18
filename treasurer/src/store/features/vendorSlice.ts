import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit'
import type { RootState } from '../index'
import type { Vendor } from '@/types'
import {
  vendorApi,
  type CreateVendorInput,
  type UpdateVendorInput,
  type VendorSearchParams,
} from '@/lib/api/vendors'
import { ApiError } from '@/lib/api'

/**
 * Cache entry for autocomplete results.
 */
interface AutocompleteCache {
  query: string
  results: Vendor[]
  timestamp: number
}

/**
 * State shape for vendor management.
 */
interface VendorState {
  /** All vendors for the current organization */
  vendors: Vendor[]
  /** Total count of vendors */
  total: number
  /** Currently selected vendor for editing */
  selectedVendor: Vendor | null
  /** Autocomplete search results */
  autocompleteResults: Vendor[]
  /** Cache for autocomplete queries (keyed by query string) */
  autocompleteCache: Record<string, AutocompleteCache>
  /** Loading state for list operations */
  isLoading: boolean
  /** Loading state for autocomplete */
  isSearching: boolean
  /** Error message if any operation failed */
  error: string | null
}

const initialState: VendorState = {
  vendors: [],
  total: 0,
  selectedVendor: null,
  autocompleteResults: [],
  autocompleteCache: {},
  isLoading: false,
  isSearching: false,
  error: null,
}

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL = 5 * 60 * 1000

/**
 * Check if a cache entry is still valid.
 */
function isCacheValid(
  entry: AutocompleteCache | undefined
): entry is AutocompleteCache {
  if (!entry) return false
  return Date.now() - entry.timestamp < CACHE_TTL
}

/**
 * Fetch all vendors for an organization.
 */
export const fetchVendors = createAsyncThunk(
  'vendor/fetchAll',
  async (
    { orgId, params }: { orgId: string; params?: VendorSearchParams },
    { rejectWithValue }
  ) => {
    try {
      const response = await vendorApi.list(orgId, params)
      return response.data
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to fetch vendors')
    }
  }
)

/**
 * Search vendors for autocomplete.
 * Uses cached results if available and still valid.
 */
export const searchVendors = createAsyncThunk(
  'vendor/search',
  async (
    {
      orgId,
      query,
      limit = 10,
    }: { orgId: string; query: string; limit?: number },
    { getState, rejectWithValue }
  ) => {
    try {
      // Check cache first
      const state = getState() as RootState
      const cacheKey = `${orgId}:${query.toLowerCase()}`
      const cached = state.vendor.autocompleteCache[cacheKey]

      if (isCacheValid(cached)) {
        return { vendors: cached.results, query, fromCache: true }
      }

      const response = await vendorApi.search(orgId, query, limit)
      return { vendors: response.data.vendors, query, fromCache: false }
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to search vendors')
    }
  }
)

/**
 * Create a new vendor.
 */
export const createVendor = createAsyncThunk(
  'vendor/create',
  async (
    { orgId, data }: { orgId: string; data: CreateVendorInput },
    { rejectWithValue }
  ) => {
    try {
      const response = await vendorApi.create(orgId, data)
      return response.data.vendor
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to create vendor')
    }
  }
)

/**
 * Update an existing vendor.
 */
export const updateVendor = createAsyncThunk(
  'vendor/update',
  async (
    {
      orgId,
      vendorId,
      data,
    }: { orgId: string; vendorId: string; data: UpdateVendorInput },
    { rejectWithValue }
  ) => {
    try {
      const response = await vendorApi.update(orgId, vendorId, data)
      return response.data.vendor
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to update vendor')
    }
  }
)

/**
 * Delete a vendor.
 */
export const deleteVendor = createAsyncThunk(
  'vendor/delete',
  async (
    { orgId, vendorId }: { orgId: string; vendorId: string },
    { rejectWithValue }
  ) => {
    try {
      await vendorApi.delete(orgId, vendorId)
      return vendorId
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to delete vendor')
    }
  }
)

const vendorSlice = createSlice({
  name: 'vendor',
  initialState,
  reducers: {
    /**
     * Select a vendor for viewing/editing.
     */
    selectVendor: (state, action: PayloadAction<Vendor | null>) => {
      state.selectedVendor = action.payload
    },

    /**
     * Clear the vendor list.
     */
    clearVendors: (state) => {
      state.vendors = []
      state.total = 0
      state.selectedVendor = null
      state.error = null
    },

    /**
     * Clear vendor error.
     */
    clearVendorError: (state) => {
      state.error = null
    },

    /**
     * Clear autocomplete results.
     */
    clearAutocomplete: (state) => {
      state.autocompleteResults = []
    },

    /**
     * Invalidate autocomplete cache for an organization.
     */
    invalidateCache: (state, action: PayloadAction<string>) => {
      const orgId = action.payload
      // Remove all cache entries for this organization
      const newCache: Record<string, AutocompleteCache> = {}
      for (const [key, value] of Object.entries(state.autocompleteCache)) {
        if (!key.startsWith(`${orgId}:`)) {
          newCache[key] = value
        }
      }
      state.autocompleteCache = newCache
    },

    /**
     * Set autocomplete results directly (for initial load on focus).
     */
    setAutocompleteResults: (state, action: PayloadAction<Vendor[]>) => {
      state.autocompleteResults = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch vendors
      .addCase(fetchVendors.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.isLoading = false
        state.vendors = action.payload.vendors || []
        state.total = action.payload.total || 0
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

      // Search vendors
      .addCase(searchVendors.pending, (state) => {
        state.isSearching = true
      })
      .addCase(searchVendors.fulfilled, (state, action) => {
        state.isSearching = false
        state.autocompleteResults = action.payload.vendors || []

        // Update cache if not from cache
        if (!action.payload.fromCache && action.meta.arg.orgId) {
          const cacheKey = `${action.meta.arg.orgId}:${action.payload.query.toLowerCase()}`
          if (!state.autocompleteCache) {
            state.autocompleteCache = {}
          }
          state.autocompleteCache[cacheKey] = {
            query: action.payload.query,
            results: action.payload.vendors || [],
            timestamp: Date.now(),
          }
        }
      })
      .addCase(searchVendors.rejected, (state, action) => {
        state.isSearching = false
        state.error = action.payload as string
      })

      // Create vendor
      .addCase(createVendor.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createVendor.fulfilled, (state, action) => {
        state.isLoading = false
        // Ensure vendors array exists
        if (!state.vendors) {
          state.vendors = []
        }
        state.vendors.unshift(action.payload)
        state.total = (state.total || 0) + 1
        // Invalidate cache as we have a new vendor
        state.autocompleteCache = {}
      })
      .addCase(createVendor.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

      // Update vendor
      .addCase(updateVendor.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateVendor.fulfilled, (state, action) => {
        state.isLoading = false
        // Ensure vendors array exists
        if (!state.vendors) {
          state.vendors = []
        }
        const index = state.vendors.findIndex((v) => v.id === action.payload.id)
        if (index !== -1) {
          state.vendors[index] = action.payload
        }
        if (state.selectedVendor?.id === action.payload.id) {
          state.selectedVendor = action.payload
        }
        // Invalidate cache as vendor name may have changed
        state.autocompleteCache = {}
      })
      .addCase(updateVendor.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

      // Delete vendor
      .addCase(deleteVendor.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteVendor.fulfilled, (state, action) => {
        state.isLoading = false
        // Ensure vendors array exists
        if (!state.vendors) {
          state.vendors = []
        }
        state.vendors = state.vendors.filter((v) => v.id !== action.payload)
        state.total = Math.max(0, (state.total || 0) - 1)
        if (state.selectedVendor?.id === action.payload) {
          state.selectedVendor = null
        }
        // Invalidate cache
        state.autocompleteCache = {}
      })
      .addCase(deleteVendor.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const {
  selectVendor,
  clearVendors,
  clearVendorError,
  clearAutocomplete,
  invalidateCache,
  setAutocompleteResults,
} = vendorSlice.actions

// Selectors
export const selectAllVendors = (state: RootState) =>
  state.vendor?.vendors || []
export const selectVendorTotal = (state: RootState) => state.vendor?.total || 0
export const selectSelectedVendor = (state: RootState) =>
  state.vendor?.selectedVendor || null
export const selectAutocompleteResults = (state: RootState) =>
  state.vendor?.autocompleteResults || []
export const selectVendorLoading = (state: RootState) =>
  state.vendor?.isLoading || false
export const selectVendorSearching = (state: RootState) =>
  state.vendor?.isSearching || false
export const selectVendorError = (state: RootState) =>
  state.vendor?.error || null

/**
 * Select a vendor by ID from the list.
 */
export const selectVendorById = (state: RootState, vendorId: string) =>
  state.vendor.vendors.find((v) => v.id === vendorId)

export default vendorSlice.reducer
