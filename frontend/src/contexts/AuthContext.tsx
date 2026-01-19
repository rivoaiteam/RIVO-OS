import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User, AuthContextType } from '@/types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

const AUTH_KEY = 'rivo-auth'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

interface LoginResponse {
  access_token: string
  user: User
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) {
      try {
        const auth = JSON.parse(stored)
        return auth.user
      } catch {
        return null
      }
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(false)

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
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

      // Store auth data (token + user)
      localStorage.setItem(AUTH_KEY, JSON.stringify(auth))
      setUser(auth.user)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(AUTH_KEY)
  }, [])

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem(AUTH_KEY)
    if (!stored) return

    try {
      const auth = JSON.parse(stored)
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${auth.access_token}` },
      })

      if (response.ok) {
        const userData = await response.json()
        const updatedAuth = { ...auth, user: userData }
        localStorage.setItem(AUTH_KEY, JSON.stringify(updatedAuth))
        setUser(userData)
      }
    } catch {
      // Silently fail - user data will refresh on next login
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
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
