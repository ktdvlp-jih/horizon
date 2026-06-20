import axios from 'axios'
import { apiUrl } from '@/lib/apiBase'
import { clearAuth, getAccessToken, getRefreshToken, updateTokens } from '@/lib/authStorage'
import type { ApiResponse } from '@/types'

export const apiClient = axios.create({
  baseURL: apiUrl('/api'),
  headers: { 'Content-Type': 'application/json' },
})

const apiKey = import.meta.env.VITE_API_KEY
if (apiKey) {
  apiClient.interceptors.request.use((config) => {
    config.headers['X-API-Key'] = apiKey
    return config
  })
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function doRefresh(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) {
    clearAuth()
    return null
  }
  try {
    const res = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      apiUrl('/api/auth/refresh'),
      { refreshToken: refresh },
      { headers: { 'Content-Type': 'application/json' } },
    )
    const body = res.data
    if (body.success && body.data) {
      updateTokens(body.data.accessToken, body.data.refreshToken)
      return body.data.accessToken
    }
  } catch {
    clearAuth()
  }
  return null
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined
    if (error.response?.status === 401 && original && !original._retry) {
      const url = original.url ?? ''
      if (url.includes('/auth/login') || url.includes('/auth/signup') || url.includes('/auth/refresh')) {
        return Promise.reject(error)
      }
      original._retry = true
      if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => {
          refreshPromise = null
        })
      }
      const newToken = await refreshPromise
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return apiClient(original)
      }
    }
    return Promise.reject(error)
  },
)

/** Unwraps the common ApiResponse<T> envelope, throwing on failure. */
export function unwrap<T>(response: { data: ApiResponse<T> }): T {
  const body = response.data
  if (!body.success || body.error) {
    throw new Error(body.error?.message ?? '요청에 실패했습니다.')
  }
  return body.data
}
