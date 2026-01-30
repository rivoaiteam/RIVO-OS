/**
 * API configuration and client for Rivo OS backend.
 */

const API_URLS: Record<string, string> = {
  'app.rivo.ae': 'https://rivo-backend-331738587654.asia-southeast1.run.app/api',
  'test.rivo.ae': 'https://rivo-backend-test-331738587654.asia-southeast1.run.app/api',
}

export const API_BASE_URL = API_URLS[window.location.hostname] || 'http://localhost:8000/api'

const TOKEN_KEY = 'rivo-access-token'
const REFRESH_TOKEN_KEY = 'rivo-refresh-token'

/**
 * Get stored access token.
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Get stored refresh token.
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * Store authentication tokens.
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

/**
 * Clear stored tokens.
 */
export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/**
 * Make an authenticated API request.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * API client with typed methods for all endpoints.
 */
export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Login failed')
      }

      return response.json()
    },

    logout: () => apiRequest('/auth/logout', { method: 'POST' }),

    me: () => apiRequest('/auth/me'),

    changePassword: (currentPassword: string, newPassword: string) =>
      apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      }),
  },

  users: {
    list: () => apiRequest('/users/'),

    get: (id: string) => apiRequest(`/users/${id}/`),

    create: (data: { email: string; name: string; role: string; password: string }) =>
      apiRequest('/users/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: { name?: string; role?: string }) =>
      apiRequest(`/users/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deactivate: (id: string) =>
      apiRequest(`/users/${id}/deactivate/`, { method: 'POST' }),

    reactivate: (id: string) =>
      apiRequest(`/users/${id}/reactivate/`, { method: 'POST' }),
  },
}
