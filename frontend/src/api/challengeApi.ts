import { apiClient, unwrap } from './client'
import type { ApiResponse, ChallengeConfig } from '@/types'

export async function fetchChallenges(experienceId = 'urban-climate'): Promise<ChallengeConfig[]> {
  const res = await apiClient.get<ApiResponse<ChallengeConfig[]>>('/challenges', {
    params: { experienceId },
  })
  return unwrap(res)
}
