import { api } from '../api'
import type { LoginInput, RegisterInput } from '../validations/auth'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: 'USER' | 'ADMIN'
  createdAt?: string
}

export interface AuthResponse {
  success: boolean
  data: {
    user: AuthUser
    token: string
  }
  message: string
}

export interface MeResponse {
  success: boolean
  data: {
    user: AuthUser
  }
}

export interface AuthErrorResponse {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

/**
 * Auth API functions for login, register, and token validation.
 */
export const authApi = {
  login: (data: LoginInput) => api.post<AuthResponse>('/auth/login', data),

  register: (data: RegisterInput) => api.post<AuthResponse>('/auth/register', data),

  getMe: () => api.get<MeResponse>('/auth/me'),
}
