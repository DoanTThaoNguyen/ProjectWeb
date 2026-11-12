import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getToken, setToken, setUnauthorizedHandler } from '../api/client'
import type { AuthResponse, User } from '../api/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (data: { fullName: string; email: string; phone: string; password: string }) => Promise<User>
  logout: () => void
  setUser: (u: User) => void
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(() => !!getToken())

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    if (!getToken()) return
    api<User>('/api/auth/me')
      .then(setUser)
      .catch(() => {
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<AuthResponse>('/api/auth/login', { body: { email, password } })
    setToken(r.token)
    setUser(r.user)
    return r.user
  }, [])

  const register = useCallback(async (data: { fullName: string; email: string; phone: string; password: string }) => {
    const r = await api<AuthResponse>('/api/auth/register', { body: data })
    setToken(r.token)
    setUser(r.user)
    return r.user
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout, setUser }), [user, loading, login, register, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}

/** Trang mac dinh sau dang nhap theo vai tro. */
// eslint-disable-next-line react-refresh/only-export-components
export function homeFor(u: User): string {
  switch (u.role) {
    case 'ADMIN':
    case 'COORDINATOR':
      return '/quan-tri'
    case 'STAFF':
      return '/nhan-vien'
    default:
      return '/don-cua-toi'
  }
}
