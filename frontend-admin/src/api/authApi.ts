import { apiClient, unwrap } from './client'
import type { ApiResponse, AuthUser, LoginResponse } from '@/types'
import { setAuth } from '@/lib/authStorage'

export interface LoginPayload {
  loginId: string
  password: string
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload)
  const data = unwrap(res)
  setAuth(data.accessToken, data.refreshToken, {
    userId: data.userId,
    userName: data.userName,
    role: data.role,
  })
  return data
}

export async function logoutApi(): Promise<void> {
  try {
    await apiClient.post('/auth/logout')
  } catch {
    // ignore
  }
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await apiClient.get<ApiResponse<AuthUser>>('/auth/me')
  return unwrap(res)
}
