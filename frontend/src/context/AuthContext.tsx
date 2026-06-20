import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchMe, login as loginApi, logoutApi, signup as signupApi } from '@/api/authApi'
import type { LoginPayload, SignupPayload } from '@/api/authApi'
import { clearAuth, getAccessToken, getStoredUser, type StoredUser } from '@/lib/authStorage'

interface AuthContextValue {
  user: StoredUser | null
  isAuthenticated: boolean
  loading: boolean
  login: (payload: LoginPayload) => Promise<void>
  signup: (payload: SignupPayload) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(() => getStoredUser())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      setLoading(false)
      return
    }
    fetchMe()
      .then((me) => {
        setUser({ userId: me.userId, userName: me.userName, role: me.role })
      })
      .catch(() => {
        clearAuth()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await loginApi(payload)
    setUser({ userId: res.userId, userName: res.userName, role: res.role })
  }, [])

  const signup = useCallback(async (payload: SignupPayload) => {
    const res = await signupApi(payload)
    setUser({ userId: res.userId, userName: res.userName, role: res.role })
  }, [])

  const logout = useCallback(async () => {
    await logoutApi()
    clearAuth()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      login,
      signup,
      logout,
    }),
    [user, loading, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
