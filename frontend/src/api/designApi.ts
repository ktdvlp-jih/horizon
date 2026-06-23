import { apiClient, unwrap } from './client'
import type {
  ApiResponse,
  CoachResponse,
  DesignDetail,
  DesignListItem,
  DesignSummary,
  EvaluateResponse,
  Grid,
  SimulationResult,
  SimulationTimeline,
} from '@/types'

export interface EvaluateOptions {
  scenarioId?: string | null
  date?: string
  zones?: { farmland: number; fishery: number; forest: number; solar: number }
}

/** Unified multi-lens evaluation over a single shared city grid. */
export async function evaluate(
  regionCode: string,
  grid: Grid,
  options: EvaluateOptions = {},
): Promise<EvaluateResponse> {
  const res = await apiClient.post<ApiResponse<EvaluateResponse>>('/designs/evaluate', {
    regionCode,
    grid,
    scenarioId: options.scenarioId ?? null,
    date: options.date,
    zones: options.zones,
  })
  return unwrap(res)
}

/** Unified multi-axis AI coach over a single shared city grid. */
export async function coachResilience(
  regionCode: string,
  grid: Grid,
  options: EvaluateOptions = {},
): Promise<CoachResponse> {
  const res = await apiClient.post<ApiResponse<CoachResponse>>('/designs/coach/resilience', {
    regionCode,
    grid,
    scenarioId: options.scenarioId ?? null,
    date: options.date,
    zones: options.zones,
  })
  return unwrap(res)
}

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

export async function updateDesign(
  id: number,
  name: string,
  regionCode: string,
  grid: Grid,
): Promise<DesignSummary> {
  const res = await apiClient.put<ApiResponse<DesignSummary>>(`/designs/${id}`, {
    name,
    regionCode,
    grid,
  })
  return unwrap(res)
}

export async function fetchLeaderboard(regionCode?: string, limit = 10): Promise<DesignSummary[]> {
  const res = await apiClient.get<ApiResponse<DesignSummary[]>>('/designs/leaderboard', {
    params: { regionCode, limit },
  })
  return unwrap(res)
}

export async function fetchLeaderboardDesign(id: number): Promise<DesignDetail> {
  const res = await apiClient.get<ApiResponse<DesignDetail>>(`/designs/leaderboard/${id}`)
  return unwrap(res)
}

export async function fetchMyDesigns(): Promise<DesignListItem[]> {
  const res = await apiClient.get<ApiResponse<DesignListItem[]>>('/designs/mine')
  return unwrap(res)
}

export async function fetchDesign(id: number): Promise<DesignDetail> {
  const res = await apiClient.get<ApiResponse<DesignDetail>>(`/designs/${id}`)
  return unwrap(res)
}

export async function deleteDesign(id: number): Promise<void> {
  const res = await apiClient.delete<ApiResponse<null>>(`/designs/${id}`)
  unwrap(res)
}
