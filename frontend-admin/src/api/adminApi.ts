import { apiClient, unwrap } from './client'
import type {
  AdminDesignSummary,
  AdminUserSummary,
  AiCoachSettingsView,
  ApiResponse,
  CoachResponse,
  DesignSummary,
  PageResponse,
  RegionConfigDto,
  ChallengeConfigDto,
} from '@/types'

export async function fetchUsers(params: Record<string, string | number | undefined>) {
  const res = await apiClient.get<ApiResponse<PageResponse<AdminUserSummary>>>('/admin/users', { params })
  return unwrap(res)
}

export async function patchUser(userId: number, body: Record<string, unknown>) {
  const res = await apiClient.patch<ApiResponse<AdminUserSummary>>(`/admin/users/${userId}`, body)
  return unwrap(res)
}

export async function resetUserPassword(userId: number, newPassword: string) {
  await apiClient.post(`/admin/users/${userId}/reset-password`, { newPassword })
}

export async function fetchAiCoach() {
  const res = await apiClient.get<ApiResponse<AiCoachSettingsView>>('/admin/ai-coach')
  return unwrap(res)
}

export async function updateAiCoach(body: Partial<AiCoachSettingsView> & { apiKey?: string }) {
  const res = await apiClient.put<ApiResponse<AiCoachSettingsView>>('/admin/ai-coach', body)
  return unwrap(res)
}

export async function testAiCoach(useSavedSettings = true) {
  const res = await apiClient.post<
    ApiResponse<{ latencyMs: number; source: string; coachResponse: CoachResponse }>
  >('/admin/ai-coach/test', { useSavedSettings })
  return unwrap(res)
}

export async function fetchDesigns(params: Record<string, string | number | boolean | undefined>) {
  const res = await apiClient.get<ApiResponse<PageResponse<AdminDesignSummary>>>('/admin/designs', { params })
  return unwrap(res)
}

export async function patchDesign(id: number, visibleOnLeaderboard: boolean) {
  const res = await apiClient.patch<ApiResponse<AdminDesignSummary>>(`/admin/designs/${id}`, {
    visibleOnLeaderboard,
  })
  return unwrap(res)
}

export async function deleteDesign(id: number) {
  await apiClient.delete(`/admin/designs/${id}`)
}

export async function fetchRegions() {
  const res = await apiClient.get<ApiResponse<RegionConfigDto[]>>('/admin/regions')
  return unwrap(res)
}

export async function createRegion(body: RegionConfigDto) {
  const res = await apiClient.post<ApiResponse<RegionConfigDto>>('/admin/regions', body)
  return unwrap(res)
}

export async function updateRegion(code: string, body: RegionConfigDto) {
  const res = await apiClient.put<ApiResponse<RegionConfigDto>>(`/admin/regions/${code}`, body)
  return unwrap(res)
}

export async function deleteRegion(code: string) {
  await apiClient.delete(`/admin/regions/${code}`)
}

export async function refreshRegionCache() {
  await apiClient.post('/admin/regions/refresh-cache')
}

export async function fetchChallenges() {
  const res = await apiClient.get<ApiResponse<ChallengeConfigDto[]>>('/admin/challenges')
  return unwrap(res)
}

export async function createChallenge(body: ChallengeConfigDto) {
  const res = await apiClient.post<ApiResponse<ChallengeConfigDto>>('/admin/challenges', body)
  return unwrap(res)
}

export async function updateChallenge(id: string, body: ChallengeConfigDto) {
  const res = await apiClient.put<ApiResponse<ChallengeConfigDto>>(`/admin/challenges/${id}`, body)
  return unwrap(res)
}

export async function deleteChallenge(id: string) {
  await apiClient.delete(`/admin/challenges/${id}`)
}

export async function fetchDisasterScenarios() {
  const res = await apiClient.get<ApiResponse<import('@/types').DisasterScenarioDto[]>>(
    '/admin/disaster-scenarios',
  )
  return unwrap(res)
}

export async function updateDisasterScenario(id: string, body: import('@/types').DisasterScenarioDto) {
  const res = await apiClient.put<ApiResponse<import('@/types').DisasterScenarioDto>>(
    `/admin/disaster-scenarios/${id}`,
    body,
  )
  return unwrap(res)
}

export async function fetchSystemHealth() {
  const res = await apiClient.get<ApiResponse<Record<string, unknown>>>('/admin/system/health')
  return unwrap(res)
}

export async function fetchSystemStats() {
  const res = await apiClient.get<
    ApiResponse<{ userCount: number; designCount: number; leaderboardTop5: DesignSummary[] }>
  >('/admin/system/stats')
  return unwrap(res)
}

export async function fetchConfigSummary() {
  const res = await apiClient.get<ApiResponse<Record<string, unknown>>>('/admin/system/config-summary')
  return unwrap(res)
}
