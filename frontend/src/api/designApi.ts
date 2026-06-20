import { apiClient, unwrap } from './client'
import type {
  ApiResponse,
  CoachResponse,
  DesignSummary,
  Grid,
  SimulationResult,
  SimulationTimeline,
} from '@/types'

export async function simulate(regionCode: string, grid: Grid): Promise<SimulationResult> {
  const res = await apiClient.post<ApiResponse<SimulationResult>>('/designs/simulate', {
    regionCode,
    grid,
  })
  return unwrap(res)
}

export async function simulateTimeline(
  regionCode: string,
  grid: Grid,
  date?: string,
): Promise<SimulationTimeline> {
  const res = await apiClient.post<ApiResponse<SimulationTimeline>>('/designs/simulate/timeline', {
    regionCode,
    grid,
    date,
  })
  return unwrap(res)
}

export async function coach(regionCode: string, grid: Grid): Promise<CoachResponse> {
  const res = await apiClient.post<ApiResponse<CoachResponse>>('/designs/coach', {
    regionCode,
    grid,
  })
  return unwrap(res)
}

export async function saveDesign(
  name: string,
  regionCode: string,
  grid: Grid,
): Promise<DesignSummary> {
  const res = await apiClient.post<ApiResponse<DesignSummary>>('/designs', {
    name,
    regionCode,
    grid,
  })
  return unwrap(res)
}

export async function fetchLeaderboard(regionCode?: string): Promise<DesignSummary[]> {
  const res = await apiClient.get<ApiResponse<DesignSummary[]>>('/designs/leaderboard', {
    params: { regionCode, limit: 10 },
  })
  return unwrap(res)
}

export async function fetchMyDesigns(): Promise<DesignSummary[]> {
  const res = await apiClient.get<ApiResponse<DesignSummary[]>>('/designs/mine')
  return unwrap(res)
}
