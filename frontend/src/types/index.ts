export interface ApiResponse<T> {
  success: boolean
  data: T
  error: { code: string; message: string } | null
  timestamp: string
}

export type TileType =
  | 'BUILDING'
  | 'ROAD'
  | 'BARE'
  | 'PARK'
  | 'TREE'
  | 'WATER'
  | 'SIDEWALK'
  | 'WETLAND'
  | 'PLAZA'
  | 'SEAWALL'
  | 'DRAIN'
  | 'GREEN_BUFFER'
  | 'SHELTER'
  | 'RETAINING'
  | 'HIGH_GROUND'
  | 'INDUSTRY'

export type DisasterTileType = TileType

export type DisasterMode = 'typhoon' | 'earthquake' | 'tsunami'

export type Grid = TileType[][]

export interface RegionWeather {
  code: string
  name: string
  baseAirTemp: number
  solarLoad: number
  source: 'kma' | 'sample'
}

export interface DesignMetrics {
  gridSize: number
  totalCells: number
  tileCounts: Record<string, number>
  greenRatio: number
  imperviousRatio: number
  waterRatio: number
  baseAirTemp: number
  avgSurfaceTemp: number
  maxSurfaceTemp: number
  minSurfaceTemp: number
  deltaT: number
}

export interface SimulationResult {
  region: RegionWeather
  gridSize: number
  surfaceTemps: number[][]
  metrics: DesignMetrics
}

export interface TimelineFrame {
  hour: number
  label: string
  solarIntensity: number
  airTemp: number
  surfaceTemps: number[][]
  avgSurfaceTemp: number
  maxSurfaceTemp: number
  minSurfaceTemp: number
  deltaT: number
}

export interface SimulationTimeline {
  region: RegionWeather
  gridSize: number
  globalMin: number
  globalMax: number
  source: 'observed' | 'modeled'
  date: string
  frames: TimelineFrame[]
}

export interface CoachResponse {
  score: number
  grade: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  learningPoint: string
  source: 'llm' | 'rule'
}

export interface DesignSummary {
  id: number
  name: string
  regionCode: string
  gridSize: number
  avgSurfaceTemp: number
  deltaT: number
  greenRatio: number
  createdAt: string
}

export interface DesignListItem extends DesignSummary {
  grid: Grid
}

export interface DesignDetail extends DesignSummary {
  grid: Grid
  experienceId?: string
  scenarioId?: string | null
}

export interface ChallengeConfig {
  id: string
  experienceId: string
  title: string
  description: string
  ruleType: string
  threshold: number | null
  ruleParamsJson: string | null
  enabled: boolean
  sortOrder: number
}

export interface ScenarioSummary {
  id: string
  mode: DisasterMode
  title: string
  description: string
  sourceEventId: string | null
  regionCode: string | null
}

export interface DisasterMetrics {
  mode: string
  gridSize: number
  totalCells: number
  tileCounts: Record<string, number>
  affectedRatio: number
  maxRisk: number
  avgRisk: number
  protectedRatio: number
  floodCells?: number | null
  windHighCells?: number | null
  collapseRiskCells?: number | null
  evacWithin3MinRatio?: number | null
  inundatedCells?: number | null
  highGroundCoverage?: number | null
}

export interface DisasterSimulationResult {
  mode: DisasterMode
  region: RegionWeather
  scenario: ScenarioSummary
  gridSize: number
  cellValues: number[][]
  metrics: DisasterMetrics
  globalMin: number
  globalMax: number
}

export interface DisasterTimelineFrame {
  stepIndex: number
  label: string
  progress: number
  cellValues: number[][]
  avgRisk: number
  maxRisk: number
  affectedRatio: number
}

export interface DisasterTimeline {
  mode: DisasterMode
  region: RegionWeather
  scenario: ScenarioSummary
  gridSize: number
  globalMin: number
  globalMax: number
  source: string
  frames: DisasterTimelineFrame[]
}

export interface DisasterSummary {
  id: number
  name: string
  mode: DisasterMode
  regionCode: string
  scenarioId: string
  avgRisk: number
  maxRisk: number
  createdAt: string
}

export type LensKind = 'heat' | 'air' | 'disaster' | 'agriculture'

export interface LensResult {
  kind: LensKind
  label: string
  heatmap: number[][]
  min: number
  max: number
  score: number
  metrics: unknown
}

export interface EvaluateResponse {
  region: RegionWeather
  gridSize: number
  scenarioId: string | null
  lenses: Partial<Record<LensKind, LensResult>>
  axisScores: Partial<Record<LensKind, number>>
  resilienceScore: number
  balancePenalty: number
}

export interface AuthUser {
  userId: number
  loginId: string
  userName: string
  email: string | null
  role: string
  lastLoginAt: string | null
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  userId: number
  userName: string
  role: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
}
