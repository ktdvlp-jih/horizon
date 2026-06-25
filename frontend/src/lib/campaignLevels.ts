import type { Grid, LensKind } from '@/types'
import { createDisasterInitialGrid, createGreenCityGrid, createInitialGrid, GRID_SIZE } from '@/lib/grid'

export interface AgricultureZonesState {
  farmland: number
  fishery: number
  forest: number
  solar: number
}

export interface CampaignLevelDef {
  id: string
  order: number
  title: string
  brief: string
  /** Which KMA APIs this level teaches (shown in UI). */
  apis: string[]
  lens: LensKind
  scenarioId?: string
  goal: { metric: 'resilience' | LensKind; min: number }
  /** Starting grid when level begins (null = keep current). */
  initialGrid?: () => Grid
  /** Max tile group ratio — must NOT exceed to clear. */
  maxTileRatio?: Record<string, number>
  /** Min tile group ratio — must meet to clear. */
  minTileRatio?: Record<string, number>
  /** Agriculture zone slider limits (0..1). */
  zoneLimits?: { maxFarmland?: number; minForest?: number; maxSolar?: number }
  defaultZones?: AgricultureZonesState
  /** All four axis scores must meet this (education campaign late levels). */
  minAllAxis?: number
  carryOver: boolean
}

function coastalCity(): Grid {
  return createDisasterInitialGrid('typhoon')
}

function industryRow(): Grid {
  const g = createInitialGrid()
  for (let c = 0; c < GRID_SIZE; c++) g[2][c] = 'INDUSTRY'
  return g
}

/** 10-level education campaign — tile % caps + scores + zones get stricter each level. */
export const CAMPAIGN_LEVELS: CampaignLevelDef[] = [
  {
    id: 'lv-1',
    order: 1,
    title: 'Lv.1 첫 그늘 — 열섬 입문',
    brief: '가로수·공원으로 불투수 75% 이하, 열섬 55점. (기온·일사·체감온도·자외선 → 열섬)',
    apis: ['ASOS 기온·일사', '체감온도', '자외선'],
    lens: 'heat',
    initialGrid: () => createInitialGrid(),
    maxTileRatio: { impervious: 0.75 },
    minTileRatio: { green: 0.08 },
    goal: { metric: 'heat', min: 55 },
    carryOver: false,
  },
  {
    id: 'lv-2',
    order: 2,
    title: 'Lv.2 시원한 강 — 수변 설계',
    brief: '수변 8% 이상, 불투수 70% 이하, 열섬 62점. (강수 → 냉각·농어업)',
    apis: ['ASOS 강수', '평년값'],
    lens: 'heat',
    maxTileRatio: { impervious: 0.7 },
    minTileRatio: { water: 0.08, green: 0.12 },
    goal: { metric: 'heat', min: 62 },
    carryOver: true,
  },
  {
    id: 'lv-3',
    order: 3,
    title: 'Lv.3 맑은 하늘 — 미세먼지',
    brief: '공장 12% 이하, 녹지완충 10% 이상, 미세먼지 58점. (PM10·대기정체 → 미세먼지)',
    apis: ['황사 PM10', '대기정체지수'],
    lens: 'air',
    initialGrid: industryRow,
    maxTileRatio: { industry: 0.12, impervious: 0.68 },
    minTileRatio: { green: 0.14 },
    goal: { metric: 'air', min: 58 },
    carryOver: false,
  },
  {
    id: 'lv-4',
    order: 4,
    title: 'Lv.4 바람길 — 정체 완화',
    brief: '도로 35% 이하, 미세먼지 65점. 대기정체지수가 높으면 PM이 더 오래 머뭅니다.',
    apis: ['대기정체지수', 'PM10'],
    lens: 'air',
    maxTileRatio: { ROAD: 0.35, industry: 0.1 },
    minTileRatio: { TREE: 0.15 },
    goal: { metric: 'air', min: 65 },
    carryOver: true,
  },
  {
    id: 'lv-5',
    order: 5,
    title: 'Lv.5 태풍 방어선',
    brief: '방재시설 8%+, 불투수 65% 이하, 재난 58점. (태풍·강수 라이브 → 시나리오 강도)',
    apis: ['태풍 목록', 'ASOS 강수'],
    lens: 'disaster',
    scenarioId: 'typhoon-maemi-2003',
    initialGrid: coastalCity,
    maxTileRatio: { impervious: 0.65 },
    minTileRatio: { disasterDefense: 0.08 },
    goal: { metric: 'disaster', min: 58 },
    carryOver: false,
  },
  {
    id: 'lv-6',
    order: 6,
    title: 'Lv.6 지진 대피로',
    brief: '대피소 5%+, 재난 62점. (지진 통보 → 규모·대피)',
    apis: ['지진·지진해일 통보'],
    lens: 'disaster',
    scenarioId: 'eq-pohang-2017',
    maxTileRatio: { BUILDING: 0.55 },
    minTileRatio: { SHELTER: 0.05, PARK: 0.1 },
    goal: { metric: 'disaster', min: 62 },
    carryOver: true,
  },
  {
    id: 'lv-7',
    order: 7,
    title: 'Lv.7 먹거리 안보 — 농어업',
    brief: '농지 45% 이하, 보존림 20%+, 농어업 58점. (평년·강수 → 작황·수자원)',
    apis: ['평년값', 'ASOS 강수'],
    lens: 'agriculture',
    maxTileRatio: { impervious: 0.6 },
    minTileRatio: { green: 0.18, water: 0.06 },
    zoneLimits: { maxFarmland: 0.45, minForest: 0.2 },
    defaultZones: { farmland: 0.35, fishery: 0.2, forest: 0.3, solar: 0.15 },
    goal: { metric: 'agriculture', min: 58 },
    carryOver: false,
  },
  {
    id: 'lv-8',
    order: 8,
    title: 'Lv.8 균형 도시',
    brief: '4축 모두 55+ , 종합 60+, 불투수 58% 이하.',
    apis: ['전체 10종 KMA'],
    lens: 'heat',
    maxTileRatio: { impervious: 0.58, industry: 0.08 },
    minTileRatio: { green: 0.2, water: 0.08 },
    goal: { metric: 'resilience', min: 60 },
    minAllAxis: 55,
    carryOver: true,
  },
  {
    id: 'lv-9',
    order: 9,
    title: 'Lv.9 기후 스트레스',
    brief: '방재 12%+, 태풍 시나리오 재난 68+, 종합 65+.',
    apis: ['태풍', '지진', '강수', 'PM10'],
    lens: 'disaster',
    scenarioId: 'typhoon-maemi-2003',
    maxTileRatio: { impervious: 0.55, industry: 0.06 },
    minTileRatio: { disasterDefense: 0.12, green: 0.22 },
    zoneLimits: { maxFarmland: 0.4, minForest: 0.22 },
    goal: { metric: 'resilience', min: 65 },
    minAllAxis: 55,
    carryOver: true,
  },
  {
    id: 'lv-10',
    order: 10,
    title: 'Lv.10 회복도시 마스터',
    brief: '모든 제약 통과 + 종합 72+. 3D 재난 시뮬레이션으로 최종 검증!',
    apis: ['전체 KMA API허브 10종'],
    lens: 'heat',
    initialGrid: () => createGreenCityGrid(),
    maxTileRatio: { impervious: 0.52, industry: 0.05, ROAD: 0.28 },
    minTileRatio: { green: 0.25, water: 0.1, disasterDefense: 0.1 },
    zoneLimits: { maxFarmland: 0.38, minForest: 0.25, maxSolar: 0.2 },
    defaultZones: { farmland: 0.3, fishery: 0.22, forest: 0.28, solar: 0.2 },
    goal: { metric: 'resilience', min: 72 },
    minAllAxis: 58,
    carryOver: false,
  },
]

export const CAMPAIGN_BY_ID: Record<string, CampaignLevelDef> = Object.fromEntries(
  CAMPAIGN_LEVELS.map((l) => [l.id, l]),
)

const PROGRESS_KEY = 'horizon.campaign.progress.v2'

interface CampaignProgress {
  completed: string[]
  gridByLevel: Record<string, Grid>
}

export function loadCampaignProgress(): CampaignProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return { completed: [], gridByLevel: {} }
    const p = JSON.parse(raw) as Partial<CampaignProgress>
    return { completed: p.completed ?? [], gridByLevel: p.gridByLevel ?? {} }
  } catch {
    return { completed: [], gridByLevel: {} }
  }
}

function saveCampaignProgress(p: CampaignProgress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}

export function isCampaignLevelUnlocked(level: CampaignLevelDef, completed: string[]): boolean {
  if (level.order <= 1) return true
  const prev = CAMPAIGN_LEVELS.find((l) => l.order === level.order - 1)
  return prev ? completed.includes(prev.id) : true
}

export function carryOverCampaignGrid(level: CampaignLevelDef): Grid | null {
  if (!level.carryOver) return null
  const prev = CAMPAIGN_LEVELS.find((l) => l.order === level.order - 1)
  if (!prev) return null
  return loadCampaignProgress().gridByLevel[prev.id] ?? null
}

export function completeCampaignLevel(levelId: string, grid: Grid): string | null {
  const progress = loadCampaignProgress()
  if (!progress.completed.includes(levelId)) {
    progress.completed = [...progress.completed, levelId]
  }
  progress.gridByLevel = { ...progress.gridByLevel, [levelId]: grid }
  saveCampaignProgress(progress)
  const level = CAMPAIGN_BY_ID[levelId]
  const next = CAMPAIGN_LEVELS.find((l) => l.order === (level?.order ?? 0) + 1)
  return next?.id ?? null
}

/** Human-readable map of how each KMA API affects simulation (education). */
export const KMA_API_USAGE = [
  { api: 'ASOS 기온·일사', endpoint: 'kma_sfctm2 / sun_sfc_sts_pkg', drives: '열섬 점수·3D 열기둥·일사 애니메이션' },
  { api: 'ASOS 강수', endpoint: 'kma_sfctm2 (RN)', drives: '열섬 냉각·태풍 강도·농어업 수자원·3D 비粒子' },
  { api: '평년값', endpoint: 'sun_sfc_norm', drives: '열섬 ΔT 기준·농어업 warming·Lv.7 제약' },
  { api: '황사 PM10', endpoint: 'dst_pm10_hr', drives: '미세먼지 baseline·점수·3D 공기 기둥' },
  { api: '자외선지수', endpoint: 'getUVIdxV3', drives: '열섬 일사 부스트·3D UV 글로우' },
  { api: '대기정체지수', endpoint: 'getAirDiffusionIdxV3', drives: 'PM 확산↓·baseline↑·미세먼지 점수' },
  { api: '체감온도', endpoint: 'getSenTaIdxV3', drives: '열섬 기준온도·3D 열 shimmer' },
  { api: '태풍 목록', endpoint: 'typ_lst', drives: '재난 시나리오 풍속·3D 건물 비산' },
  { api: '지진·해일 통보', endpoint: 'eqk_now', drives: '지진 규모·해일 파고·3D 붕괴·침수' },
] as const
