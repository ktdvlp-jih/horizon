import { apiClient, unwrap } from '@/api/client'
import type {
  ApiResponse,
  CoachResponse,
  DisasterMode,
  DisasterMetrics,
  DisasterSimulationResult,
  DisasterSummary,
  DisasterTimeline,
  Grid,
  ScenarioSummary,
} from '@/types'

export async function fetchScenarios(mode: DisasterMode): Promise<ScenarioSummary[]> {
  const res = await apiClient.get<ApiResponse<ScenarioSummary[]>>('/disaster/scenarios', {
    params: { mode },
  })
  return unwrap(res)
}

export async function simulateDisaster(body: {
  mode: DisasterMode
  regionCode: string
  scenarioId: string
  grid: Grid
}): Promise<DisasterSimulationResult> {
  const res = await apiClient.post<ApiResponse<DisasterSimulationResult>>('/disaster/simulate', {
    mode: body.mode,
    regionCode: body.regionCode,
    scenarioId: body.scenarioId,
    grid: body.grid,
  })
  return unwrap(res)
}

export async function simulateDisasterTimeline(body: {
  mode: DisasterMode
  regionCode: string
  scenarioId: string
  grid: Grid
}): Promise<DisasterTimeline> {
  const res = await apiClient.post<ApiResponse<DisasterTimeline>>('/disaster/simulate/timeline', {
    mode: body.mode,
    regionCode: body.regionCode,
    scenarioId: body.scenarioId,
    grid: body.grid,
  })
  return unwrap(res)
}

export async function coachDisaster(body: {
  mode: DisasterMode
  regionCode: string
  scenarioId: string
  grid: Grid
}): Promise<CoachResponse> {
  const res = await apiClient.post<ApiResponse<CoachResponse>>('/disaster/coach', {
    mode: body.mode,
    regionCode: body.regionCode,
    scenarioId: body.scenarioId,
    grid: body.grid,
  })
  return unwrap(res)
}

export async function fetchMyDisasterDesigns(mode: DisasterMode): Promise<DisasterSummary[]> {
  const res = await apiClient.get<ApiResponse<DisasterSummary[]>>('/disaster/designs/mine', {
    params: { mode },
  })
  return unwrap(res)
}

export async function saveDisasterDesign(body: {
  mode: DisasterMode
  name: string
  regionCode: string
  scenarioId: string
  grid: Grid
}): Promise<DisasterSummary> {
  const res = await apiClient.post<ApiResponse<DisasterSummary>>('/disaster/designs', {
    mode: body.mode,
    name: body.name,
    regionCode: body.regionCode,
    scenarioId: body.scenarioId,
    grid: body.grid,
  })
  return unwrap(res)
}

const METRICS_PREFIX = 'horizon.challenges.metrics.'

export function loadDisasterCompletedMetrics(experienceId: string): Record<string, DisasterMetrics> {
  try {
    const raw = localStorage.getItem(METRICS_PREFIX + experienceId)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, DisasterMetrics>
  } catch {
    return {}
  }
}

export function saveDisasterCompletedMetrics(
  experienceId: string,
  metricsById: Record<string, DisasterMetrics>,
) {
  try {
    localStorage.setItem(METRICS_PREFIX + experienceId, JSON.stringify(metricsById))
  } catch {
    /* ignore */
  }
}

export { loadCompletedChallengeIds, saveCompletedChallengeIds } from '@/lib/challengeRules'
