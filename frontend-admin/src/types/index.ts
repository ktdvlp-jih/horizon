export interface ApiResponse<T> {
  success: boolean
  data: T
  error: { code: string; message: string } | null
  timestamp: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface AuthUser {
  userId: number
  loginId: string
  userName: string
  email: string | null
  role: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  userId: number
  userName: string
  role: string
}

export interface AdminUserSummary {
  userId: number
  loginId: string
  userName: string
  email: string | null
  role: string
  useYn: string
  loginFailCount: number
  lockedUntil: string | null
  lastLoginAt: string | null
  createdAt: string
}

export interface AdminDesignSummary {
  id: number
  name: string
  regionCode: string
  avgSurfaceTemp: number
  deltaT: number
  greenRatio: number
  ownerId: number | null
  ownerLoginId: string | null
  visibleOnLeaderboard: boolean
  deletedAt: string | null
  createdAt: string
}

export interface RegionConfigDto {
  code: string
  name: string
  kmaStation: string
  sampleTemp: number
  sampleSolar: number
  enabled: boolean
  sortOrder: number
  coastalExposure: number
  seismicZone: number
  elevationProfileJson: string | null
}

export interface DisasterScenarioDto {
  id: string
  mode: string
  title: string
  description: string
  sourceEventId: string | null
  paramsJson: string
  regionCode: string | null
  enabled: boolean
  sortOrder: number
}

export interface ChallengeConfigDto {
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

export const CHALLENGE_RULE_TYPES = [
  'GREEN_RATIO_MIN',
  'DELTA_T_MAX',
  'WATER_RATIO_MIN',
  'IMPERVIOUS_RATIO_MAX',
  'TILE_COUNT_MIN',
  'ALL_OF',
] as const

export interface AiCoachSettingsView {
  systemPrompt: string
  userPromptTemplate: string
  openaiModel: string
  openaiBaseUrl: string
  apiKeyMasked: string | null
  apiKeyConfigured: boolean
  temperature: number
  llmEnabled: boolean
  ruleWeights: Record<string, unknown>
  gradeThresholds: Record<string, unknown>
  learningPointDefault: string
  updatedAt: string
  updatedByLoginId: string | null
}

export interface CoachResponse {
  score: number
  grade: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  learningPoint: string
  source: string
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
