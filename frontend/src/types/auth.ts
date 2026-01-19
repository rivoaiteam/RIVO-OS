export type UserRole = 'admin' | 'manager' | 'mortgage_specialist' | 'process_executive'

export interface User {
  id: string
  username: string
  email: string
  name: string
  role: UserRole
  is_active?: boolean
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: User
}
