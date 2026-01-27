import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { User, AuthContextType, Permissions, Resource, LoginResponse } from '@/types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

const AUTH_KEY = 'rivo-auth'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

interface StoredAuth {
  access_token: string
  user: User
  permissions: Permissions
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()

  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) {
      try {
        const auth: StoredAuth = JSON.parse(stored)
        return auth.user
      } catch {
        return null
      }
    }
    return null
  })

  const [permissions, setPermissions] = useState<Permissions | null>(() => {
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) {
      try {
        const auth: StoredAuth = JSON.parse(stored)
        return auth.permissions
      } catch {
        return null
      }
    }
    return null
  })

  const [isLoading, setIsLoading] = useState(false)

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
    // Clear any cached data from previous user session
    queryClient.clear()
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Invalid username or password')
      }

      const auth: LoginResponse = await response.json()

      // Store auth data (token + user + permissions)
      const storedAuth: StoredAuth = {
        access_token: auth.access_token,
        user: auth.user,
        permissions: auth.permissions,
      }
      localStorage.setItem(AUTH_KEY, JSON.stringify(storedAuth))
      setUser(auth.user)
      setPermissions(auth.permissions)
    } finally {
      setIsLoading(false)
    }
  }, [queryClient])

  const logout = useCallback(() => {
    setUser(null)
    setPermissions(null)
    localStorage.removeItem(AUTH_KEY)
    // Clear all cached data to prevent stale data from previous user
    queryClient.clear()
  }, [queryClient])

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem(AUTH_KEY)
    if (!stored) return

    try {
      const auth: StoredAuth = JSON.parse(stored)
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${auth.access_token}` },
      })

      if (response.ok) {
        const userData = await response.json()
        const updatedAuth: StoredAuth = {
          ...auth,
          user: userData,
          permissions: userData.permissions,
        }
        localStorage.setItem(AUTH_KEY, JSON.stringify(updatedAuth))
        setUser(userData)
        setPermissions(userData.permissions)
      }
    } catch {
      // Silently fail - user data will refresh on next login
    }
  }, [])

  const can = useCallback((action: 'view' | 'create' | 'update' | 'delete', resource: Resource): boolean => {
    if (!permissions) return false
    const resourcePerms = permissions[resource]
    if (!resourcePerms) return false
    return resourcePerms[action] ?? false
  }, [permissions])

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
