const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const TOKEN_KEY = 'treasurer_token'

interface RequestConfig extends RequestInit {
  params?: Record<string, string>
}

/**
 * Custom error class for API errors.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Get the stored auth token.
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Set the auth token in storage.
 */
export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

/**
 * Clear the auth token from storage.
 */
export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Makes an HTTP request to the API.
 */
async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { params, ...init } = config
  let url = `${API_BASE_URL}${endpoint}`

  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }

  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...init,
    headers,
  })

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`
    let errors: Record<string, string[]> | undefined

    try {
      const errorData = (await response.json()) as {
        message?: string
        errors?: Record<string, string[]>
      }
      if (errorData.message) {
        errorMessage = errorData.message
      }
      if (errorData.errors) {
        errors = errorData.errors
      }
    } catch {
      // Use default error message if JSON parsing fails
    }

    throw new ApiError(response.status, errorMessage, errors)
  }

  return response.json() as Promise<T>
}

/**
 * API client with typed methods for common HTTP operations.
 */
export const api = {
  get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'GET' })
  },

  post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'DELETE' })
  },
}
