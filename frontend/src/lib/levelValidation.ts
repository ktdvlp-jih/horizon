import type { Grid, LensKind, TileType } from '@/types'
import { GRID_SIZE } from '@/lib/grid'
import type { AgricultureZonesState, CampaignLevelDef } from '@/lib/campaignLevels'

const IMPERVIOUS: TileType[] = ['BUILDING', 'ROAD', 'INDUSTRY', 'PLAZA', 'SIDEWALK', 'BARE']
const GREEN: TileType[] = ['TREE', 'PARK', 'GREEN_BUFFER', 'WETLAND']
const DISASTER_DEFENSE: TileType[] = ['SEAWALL', 'DRAIN', 'SHELTER', 'HIGH_GROUND', 'RETAINING', 'GREEN_BUFFER']

export function tileRatio(grid: Grid, tiles: TileType[]): number {
  const set = new Set(tiles)
  let n = 0
  const total = grid.length * (grid[0]?.length ?? 0)
  if (total === 0) return 0
  for (const row of grid) {
    for (const t of row) {
      if (set.has(t)) n++
    }
  }
  return n / total
}

export function tileCount(grid: Grid, tile: TileType): number {
  let n = 0
  for (const row of grid) {
    for (const t of row) {
      if (t === tile) n++
    }
  }
  return n
}

export interface LevelValidationResult {
  ok: boolean
  violations: string[]
}

export function validateCampaignLevel(
  level: CampaignLevelDef,
  grid: Grid,
  zones: AgricultureZonesState,
  axisScores: Partial<Record<LensKind | 'resilience', number>>,
): LevelValidationResult {
  const violations: string[] = []

  if (level.maxTileRatio) {
    for (const [key, max] of Object.entries(level.maxTileRatio)) {
      const ratio = resolveTileGroupRatio(grid, key)
      if (ratio > max + 0.001) {
        violations.push(`${tileGroupLabel(key)} ${(ratio * 100).toFixed(0)}% — 최대 ${(max * 100).toFixed(0)}% 초과`)
      }
    }
  }

  if (level.minTileRatio) {
    for (const [key, min] of Object.entries(level.minTileRatio)) {
      const ratio = resolveTileGroupRatio(grid, key)
      if (ratio + 0.001 < min) {
        violations.push(`${tileGroupLabel(key)} ${(ratio * 100).toFixed(0)}% — 최소 ${(min * 100).toFixed(0)}% 미달`)
      }
    }
  }

  if (level.zoneLimits) {
    const { farmland, fishery, forest, solar } = zones
    const total = farmland + fishery + forest + solar
    if (total > 0) {
      if (level.zoneLimits.maxFarmland != null && farmland / total > level.zoneLimits.maxFarmland + 0.001) {
        violations.push(`농지 배분 ${Math.round((farmland / total) * 100)}% — 최대 ${Math.round(level.zoneLimits.maxFarmland * 100)}%`)
      }
      if (level.zoneLimits.minForest != null && forest / total + 0.001 < level.zoneLimits.minForest) {
        violations.push(`보존림 ${Math.round((forest / total) * 100)}% — 최소 ${Math.round(level.zoneLimits.minForest * 100)}%`)
      }
    }
  }

  const score = axisScores[level.goal.metric]
  if (score == null || score < level.goal.min) {
    violations.push(`${metricLabel(level.goal.metric)} ${score?.toFixed(0) ?? '—'}점 — 목표 ${level.goal.min}점`)
  }

  if (level.minAllAxis != null) {
    const axes: LensKind[] = ['heat', 'air', 'disaster', 'agriculture']
    for (const ax of axes) {
      const v = axisScores[ax]
      if (v == null || v < level.minAllAxis) {
        violations.push(`${metricLabel(ax)} ${v?.toFixed(0) ?? '—'}점 — 4축 최소 ${level.minAllAxis}점`)
      }
    }
  }

  return { ok: violations.length === 0, violations }
}

function resolveTileGroupRatio(grid: Grid, key: string): number {
  switch (key) {
    case 'impervious':
      return tileRatio(grid, IMPERVIOUS)
    case 'green':
      return tileRatio(grid, GREEN)
    case 'water':
      return tileRatio(grid, ['WATER', 'WETLAND'])
    case 'disasterDefense':
      return tileRatio(grid, DISASTER_DEFENSE)
    case 'industry':
      return tileRatio(grid, ['INDUSTRY'])
    default:
      return tileRatio(grid, [key as TileType])
  }
}

function tileGroupLabel(key: string): string {
  const labels: Record<string, string> = {
    impervious: '불투수(건물·도로)',
    green: '녹지',
    water: '수변',
    disasterDefense: '방재 시설',
    industry: '공장',
    TREE: '가로수',
    PARK: '공원',
    DRAIN: '배수로',
    SEAWALL: '방조제',
    SHELTER: '대피소',
    BUILDING: '건물',
    ROAD: '도로',
  }
  return labels[key] ?? key
}

function metricLabel(m: LensKind | 'resilience'): string {
  const map: Record<string, string> = {
    heat: '열섬',
    air: '미세먼지',
    disaster: '재난',
    agriculture: '농어업',
    resilience: '종합 회복탄력성',
  }
  return map[m] ?? m
}

export function normalizeCampaignGrid(raw: Grid): Grid {
  const grid: Grid = []
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: TileType[] = []
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push(raw[r]?.[c] ?? 'BUILDING')
    }
    grid.push(row)
  }
  return grid
}
