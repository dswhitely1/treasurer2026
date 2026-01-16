import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import type { OrganizationSummary } from '@/types'
import { organizationApi } from '@/lib/api/organizations'
import { ApiError } from '@/lib/api'

interface OrganizationState {
  organizations: OrganizationSummary[]
  currentOrganization: OrganizationSummary | null
  isLoading: boolean
  error: string | null
}

const initialState: OrganizationState = {
  organizations: [],
  currentOrganization: null,
  isLoading: false,
  error: null,
}

/**
 * Switch to a different organization.
 */
export const switchOrganization = createAsyncThunk(
  'organization/switch',
  async (orgId: string, { getState, rejectWithValue }) => {
    try {
      await organizationApi.switch(orgId)
      const state = getState() as RootState
      const org = state.organization.organizations.find((o) => o.id === orgId)
      return org || null
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to switch organization')
    }
  }
)

/**
 * Create a new organization.
 */
export const createOrganization = createAsyncThunk(
  'organization/create',
  async (name: string, { rejectWithValue }) => {
    try {
      const response = await organizationApi.create({ name })
      return response.data
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to create organization')
    }
  }
)

/**
 * Leave an organization.
 */
export const leaveOrganization = createAsyncThunk(
  'organization/leave',
  async (orgId: string, { rejectWithValue }) => {
    try {
      await organizationApi.leave(orgId)
      return orgId
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Failed to leave organization')
    }
  }
)

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    setOrganizations: (
      state,
      action: PayloadAction<{
        organizations: OrganizationSummary[]
        currentOrganization: OrganizationSummary | null
      }>
    ) => {
      state.organizations = action.payload.organizations
      state.currentOrganization = action.payload.currentOrganization
    },
    clearOrganizations: (state) => {
      state.organizations = []
      state.currentOrganization = null
      state.error = null
    },
    clearOrgError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Switch organization
      .addCase(switchOrganization.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(switchOrganization.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentOrganization = action.payload
      })
      .addCase(switchOrganization.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Create organization
      .addCase(createOrganization.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createOrganization.fulfilled, (state, action) => {
        state.isLoading = false
        state.organizations.push(action.payload)
        state.currentOrganization = action.payload
      })
      .addCase(createOrganization.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Leave organization
      .addCase(leaveOrganization.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(leaveOrganization.fulfilled, (state, action) => {
        state.isLoading = false
        state.organizations = state.organizations.filter((o) => o.id !== action.payload)
        if (state.currentOrganization?.id === action.payload) {
          state.currentOrganization = state.organizations[0] || null
        }
      })
      .addCase(leaveOrganization.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { setOrganizations, clearOrganizations, clearOrgError } = organizationSlice.actions

// Selectors
export const selectOrganizations = (state: RootState) => state.organization.organizations
export const selectCurrentOrganization = (state: RootState) => state.organization.currentOrganization
export const selectOrgLoading = (state: RootState) => state.organization.isLoading
export const selectOrgError = (state: RootState) => state.organization.error
export const selectIsOrgOwner = (state: RootState) =>
  state.organization.currentOrganization?.role === 'OWNER'
export const selectIsOrgAdmin = (state: RootState) =>
  state.organization.currentOrganization?.role === 'OWNER' ||
  state.organization.currentOrganization?.role === 'ADMIN'
export const selectHasOrganizations = (state: RootState) =>
  state.organization.organizations.length > 0

export default organizationSlice.reducer
