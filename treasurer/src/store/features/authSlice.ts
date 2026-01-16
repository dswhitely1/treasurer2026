import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import { authApi, type AuthUser } from '@/lib/api/auth'
import { setAuthToken, clearAuthToken, getAuthToken } from '@/lib/api'
import type { LoginInput, RegisterInput } from '@/lib/validations/auth'
import { ApiError } from '@/lib/api'

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  token: getAuthToken(),
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
}

/**
 * Initialize auth state by validating stored token.
 */
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    const token = getAuthToken()
    if (!token) {
      return null
    }

    try {
      const response = await authApi.getMe()
      return { user: response.data.user, token }
    } catch (error) {
      clearAuthToken()
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Session expired')
    }
  }
)

/**
 * Login with email and password.
 */
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginInput, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials)
      setAuthToken(response.data.token)
      return response.data
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Login failed')
    }
  }
)

/**
 * Register a new user.
 */
export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterInput, { rejectWithValue }) => {
    try {
      const response = await authApi.register(data)
      setAuthToken(response.data.token)
      return response.data
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue(error.message)
      }
      return rejectWithValue('Registration failed')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
      clearAuthToken()
    },
    clearError: (state) => {
      state.error = null
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize auth
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false
        state.isInitialized = true
        if (action.payload) {
          state.user = action.payload.user
          state.token = action.payload.token
          state.isAuthenticated = true
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false
        state.isInitialized = true
        state.user = null
        state.token = null
        state.isAuthenticated = false
      })
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { logout, clearError, setError } = authSlice.actions

// Selectors
export const selectCurrentUser = (state: RootState) => state.auth.user
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated
export const selectAuthLoading = (state: RootState) => state.auth.isLoading
export const selectAuthError = (state: RootState) => state.auth.error
export const selectAuthInitialized = (state: RootState) => state.auth.isInitialized

export default authSlice.reducer
