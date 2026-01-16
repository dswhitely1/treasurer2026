const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

interface RequestConfig extends RequestInit {
  params?: Record<string, string>
}

/**
 * Custom error class for API errors.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
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

  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  if (!response.ok) {
    throw new ApiError(response.status, `HTTP error! status: ${response.status}`)
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
