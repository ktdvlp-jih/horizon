export interface ApiResponse<T> {
  success: boolean
  data: T
  error: { code: string; message: string } | null
  timestamp: string
}

export type TileType = 'BUILDING' | 'ROAD' | 'BARE' | 'PARK' | 'TREE' | 'WATER'

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
