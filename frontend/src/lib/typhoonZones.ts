import type { Grid, TileType } from '@/types'
import { GRID_SIZE } from '@/lib/grid'

export type TyphoonZoneId = 'coastal' | 'lowland' | 'river' | 'urban' | 'inland'

export type DefenseLevel = 0 | 1 | 2 | 3

export interface TyphoonZoneDefense {
  drain: DefenseLevel
  seawall: DefenseLevel
  shelter: DefenseLevel
  greenBuffer: DefenseLevel
}

export interface TyphoonPlan {
  zones: Record<TyphoonZoneId, TyphoonZoneDefense>
}

export const TYPHOON_ZONE_ORDER: TyphoonZoneId[] = [
  'coastal',
  'lowland',
  'river',
  'urban',
  'inland',
]

export const TYPHOON_ZONE_LABELS: Record<TyphoonZoneId, string> = {
  coastal: '해안',
  lowland: '저지대',
  river: '하천변',
  urban: '주거지',
  inland: '내륙',
}

export const TYPHOON_ZONE_HINTS: Record<TyphoonZoneId, string> = {
  coastal: '파랑·강풍 직접 노출 — 방조제·배수가 핵심',
  lowland: '침수 취약 — 배수·녹지 완충',
  river: '하천 범람 — 배수·대피소',
  urban: '밀집 지역 — 대피·녹지',
  inland: '상대적 안전 — 대피 허브',
}

/** Total defense points allowed across all zones (each level 0–3 costs that many pts per category). */
export const TYPHOON_BUDGET_MAX = 72

export const DEFENSE_COST_LABELS = {
  drain: '배수',
  seawall: '방조제',
  shelter: '대피',
  greenBuffer: '녹지',
} as const

export function createDefaultTyphoonPlan(): TyphoonPlan {
  const empty: TyphoonZoneDefense = { drain: 0, seawall: 0, shelter: 0, greenBuffer: 0 }
  return {
    zones: {
      coastal: { ...empty },
      lowland: { ...empty },
      river: { ...empty },
      urban: { ...empty },
      inland: { ...empty },
    },
  }
}

/** 첫 진입용 — 예산이 일부 배분된 상태로 시뮬레이션 체험 가능 */
export function createStarterTyphoonPlan(): TyphoonPlan {
  return {
    zones: {
      coastal: { drain: 2, seawall: 3, shelter: 1, greenBuffer: 0 },
      lowland: { drain: 3, seawall: 0, shelter: 1, greenBuffer: 2 },
      river: { drain: 2, seawall: 0, shelter: 2, greenBuffer: 1 },
      urban: { drain: 1, seawall: 0, shelter: 2, greenBuffer: 1 },
      inland: { drain: 0, seawall: 0, shelter: 2, greenBuffer: 1 },
    },
  }
}

export function typhoonPlanBudgetUsed(plan: TyphoonPlan): number {
  let sum = 0
  for (const id of TYPHOON_ZONE_ORDER) {
    const z = plan.zones[id]
    sum += z.drain + z.seawall + z.shelter + z.greenBuffer
  }
  return sum
}

export function typhoonPlanBudgetRemaining(plan: TyphoonPlan): number {
  return TYPHOON_BUDGET_MAX - typhoonPlanBudgetUsed(plan)
}

const ROWS_PER_ZONE = 2

/** Maps zone defense levels to a simulation grid (backend unchanged). */
export function typhoonPlanToGrid(plan: TyphoonPlan, size = GRID_SIZE): Grid {
  const grid: Grid = []
  for (let r = 0; r < size; r++) {
    grid.push(Array.from({ length: size }, () => 'BUILDING' as TileType))
  }

  for (let zi = 0; zi < TYPHOON_ZONE_ORDER.length; zi++) {
    const zoneId = TYPHOON_ZONE_ORDER[zi]
    const defense = plan.zones[zoneId]
    const startRow = zi * ROWS_PER_ZONE
    const endRow = Math.min(size, startRow + ROWS_PER_ZONE)

    for (let r = startRow; r < endRow; r++) {
      const rowTiles = buildZoneRow(defense, size, zoneId, r - startRow)
      for (let c = 0; c < size; c++) {
        grid[r][c] = rowTiles[c]
      }
    }
  }

  return grid
}

function buildZoneRow(
  defense: TyphoonZoneDefense,
  size: number,
  zoneId: TyphoonZoneId,
  rowInZone: number,
): TileType[] {
  const row: TileType[] = Array.from({ length: size }, () => 'ROAD')

  const counts = {
    DRAIN: levelToCells(defense.drain, size),
    SEAWALL: zoneId === 'coastal' ? levelToCells(defense.seawall, size) : levelToCells(Math.max(0, defense.seawall - 1) as DefenseLevel, size),
    SHELTER: levelToCells(defense.shelter, size),
    GREEN_BUFFER: levelToCells(defense.greenBuffer, size),
  }

  let idx = 0
  const place = (type: TileType, n: number) => {
    for (let i = 0; i < n && idx < size; i++, idx++) {
      row[idx] = type
    }
  }

  if (zoneId === 'coastal' && rowInZone === 0) {
    place('WATER', Math.max(1, Math.floor(size * 0.15)))
  }

  place('SEAWALL', counts.SEAWALL)
  place('DRAIN', counts.DRAIN)
  place('GREEN_BUFFER', counts.GREEN_BUFFER)
  place('SHELTER', counts.SHELTER)

  while (idx < size) {
    row[idx] = idx % 3 === 0 ? 'ROAD' : 'BUILDING'
    idx++
  }

  return row
}

function levelToCells(level: DefenseLevel, size: number): number {
  if (level === 0) return 0
  return Math.max(1, Math.round((level / 3) * size * 0.35))
}

function cellsToLevel(count: number, size: number): DefenseLevel {
  if (count <= 0) return 0
  const at3 = levelToCells(3, size)
  if (count >= at3) return 3
  const at2 = levelToCells(2, size)
  if (count >= at2) return 2
  return 1
}

function countTilesInZone(grid: Grid, zoneIndex: number, type: TileType): number {
  const start = zoneIndex * ROWS_PER_ZONE
  const end = Math.min(grid.length, start + ROWS_PER_ZONE)
  let n = 0
  for (let r = start; r < end; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === type) n++
    }
  }
  return n
}

/** 저장된 grid → 구역 방어 계획 (불러오기용 근사) */
export function gridToTyphoonPlan(grid: Grid): TyphoonPlan {
  const size = grid.length
  const plan = createDefaultTyphoonPlan()
  for (let zi = 0; zi < TYPHOON_ZONE_ORDER.length; zi++) {
    const id = TYPHOON_ZONE_ORDER[zi]
    plan.zones[id] = {
      drain: cellsToLevel(countTilesInZone(grid, zi, 'DRAIN'), size),
      seawall: cellsToLevel(countTilesInZone(grid, zi, 'SEAWALL'), size),
      shelter: cellsToLevel(countTilesInZone(grid, zi, 'SHELTER'), size),
      greenBuffer: cellsToLevel(countTilesInZone(grid, zi, 'GREEN_BUFFER'), size),
    }
  }
  return plan
}

export function typhoonPlanKey(plan: TyphoonPlan): string {
  return JSON.stringify(plan.zones)
}

/** Average risk 0–1 per zone from simulation cell values. */
export function zoneRisksFromCells(
  cellValues: number[][] | null | undefined,
): Record<TyphoonZoneId, number> {
  const out = {} as Record<TyphoonZoneId, number>
  if (!cellValues?.length) {
    for (const id of TYPHOON_ZONE_ORDER) out[id] = 0
    return out
  }
  const size = cellValues.length
  for (let zi = 0; zi < TYPHOON_ZONE_ORDER.length; zi++) {
    const id = TYPHOON_ZONE_ORDER[zi]
    const start = zi * ROWS_PER_ZONE
    const end = Math.min(size, start + ROWS_PER_ZONE)
    let sum = 0
    let n = 0
    for (let r = start; r < end; r++) {
      for (let c = 0; c < cellValues[r].length; c++) {
        sum += cellValues[r][c]
        n++
      }
    }
    out[id] = n === 0 ? 0 : sum / n
  }
  return out
}

export function setZoneDefense(
  plan: TyphoonPlan,
  zoneId: TyphoonZoneId,
  key: keyof TyphoonZoneDefense,
  level: DefenseLevel,
): TyphoonPlan | null {
  const nextLevel = level
  const current = plan.zones[zoneId][key]
  const delta = nextLevel - current
  if (delta > 0 && typhoonPlanBudgetRemaining(plan) < delta) {
    return null
  }
  return {
    zones: {
      ...plan.zones,
      [zoneId]: { ...plan.zones[zoneId], [key]: nextLevel },
    },
  }
}
