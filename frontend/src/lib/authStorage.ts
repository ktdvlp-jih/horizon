const ACCESS_KEY = 'horizon_access_token'
const REFRESH_KEY = 'horizon_refresh_token'
const USER_KEY = 'horizon_user'

export interface StoredUser {
  userId: number
  userName: string
  role: string
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredUser
  } catch {
    return null
  }
}

export function setAuth(accessToken: string, refreshToken: string, user: StoredUser) {
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function updateTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}
