import axios from 'axios'
import { apiClient, unwrap } from './client'
import type { ApiResponse, AuthUser, LoginResponse, TokenResponse } from '@/types'
import { setAuth, updateTokens } from '@/lib/authStorage'

export interface SignupPayload {
  loginId: string
  password: string
  userName: string
  email?: string
}

export interface LoginPayload {
  loginId: string
  password: string
}

function persistLogin(data: LoginResponse) {
  setAuth(data.accessToken, data.refreshToken, {
    userId: data.userId,
    userName: data.userName,
    role: data.role,
  })
}

export async function signup(payload: SignupPayload): Promise<LoginResponse> {
  const res = await apiClient.post<ApiResponse<LoginResponse>>('/auth/signup', payload)
  const data = unwrap(res)
  persistLogin(data)
  return data
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload)
  const data = unwrap(res)
  persistLogin(data)
  return data
}

export async function refreshToken(refreshToken: string): Promise<TokenResponse | null> {
  try {
    const res = await axios.post<ApiResponse<TokenResponse>>(
      apiClient.defaults.baseURL + '/auth/refresh',
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    )
    const body = res.data
    if (!body.success || !body.data) return null
    updateTokens(body.data.accessToken, body.data.refreshToken)
    return body.data
  } catch {
    return null
  }
}

export async function logoutApi(): Promise<void> {
  try {
    await apiClient.post('/auth/logout')
  } catch {
    // ignore — local session will be cleared anyway
  }
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await apiClient.get<ApiResponse<AuthUser>>('/auth/me')
  return unwrap(res)
}
