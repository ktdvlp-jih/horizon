import type { ChallengeConfig, DisasterMetrics } from '@/types'
import { DISASTER_TILE_BY_TYPE } from '@/lib/disasterTiles'
import type { DisasterTileType } from '@/types'

export const DISASTER_RULE_LABELS: Record<string, string> = {
  FLOOD_RATIO_MAX: '침수 셀 비율 ≤ threshold',
  WIND_EXPOSURE_MAX: '강풍 노출 ≤ threshold',
  COLLAPSE_RISK_MAX: '붕괴 위험 ≤ threshold',
  EVAC_3MIN_RATIO_MIN: '대피 커버 ≥ threshold',
  INUNDATION_RATIO_MAX: '침수 셀 ≤ threshold',
  HIGH_GROUND_COVERAGE_MIN: '고지·대피 비율 ≥ threshold',
  TILE_COUNT_MIN: '타일 개수 ≥ minCount',
  DISASTER_TILE_SUM_MIN: '복수 타일 합 ≥ minCount',
}

export function evaluateDisasterChallenge(challenge: ChallengeConfig, metrics: DisasterMetrics): boolean {
  return evaluateDisasterRule(challenge.ruleType, challenge.threshold, challenge.ruleParamsJson, metrics)
}

export function commitDisasterChallengeProgress(
  challenges: ChallengeConfig[],
  metrics: DisasterMetrics,
  completedIds: Set<string>,
): { ids: Set<string>; newlyCompleted: ChallengeConfig[] } {
  const ids = new Set(completedIds)
  const newlyCompleted: ChallengeConfig[] = []
  for (const ch of challenges) {
    if (!ids.has(ch.id) && evaluateDisasterChallenge(ch, metrics)) {
      ids.add(ch.id)
      newlyCompleted.push(ch)
    }
  }
  return { ids, newlyCompleted }
}

export function formatDisasterChallengeReveal(challenge: ChallengeConfig, metrics?: DisasterMetrics): string {
  const target = revealFromRule(challenge.ruleType, challenge.threshold, challenge.ruleParamsJson)
  if (!metrics) return target
  const actual = actualFromMetrics(challenge, metrics)
  return actual ? `달성 ${actual} · ${target}` : target
}

function revealFromRule(ruleType: string, threshold: number | null, ruleParamsJson: string | null): string {
  switch (ruleType) {
    case 'FLOOD_RATIO_MAX':
      return `목표: 침수 셀 비율 ${pct(threshold ?? 0)} 이하`
    case 'WIND_EXPOSURE_MAX':
      return `목표: 강풍 노출 ${pct(threshold ?? 0)} 이하`
    case 'COLLAPSE_RISK_MAX':
      return `목표: 붕괴 위험 셀 ${pct(threshold ?? 0)} 이하`
    case 'EVAC_3MIN_RATIO_MIN':
      return `목표: 대피 커버 ${pct(threshold ?? 0)} 이상`
    case 'INUNDATION_RATIO_MAX':
      return `목표: 침수 셀 ${pct(threshold ?? 0)} 이하`
    case 'HIGH_GROUND_COVERAGE_MIN':
      return `목표: 고지·대피 ${pct(threshold ?? 0)} 이상`
    case 'TILE_COUNT_MIN': {
      const p = parseParams(ruleParamsJson)
      const tile = String(p.tileType ?? 'SHELTER') as DisasterTileType
      const min = Number(p.minCount ?? 1)
      return `목표: ${DISASTER_TILE_BY_TYPE[tile]?.label ?? tile} ${min}칸 이상`
    }
    case 'DISASTER_TILE_SUM_MIN': {
      const p = parseParams(ruleParamsJson)
      const min = Number(p.minCount ?? 1)
      return `목표: 대피·고지 타일 합 ${min}칸 이상`
    }
    default:
      return '목표 달성'
  }
}

function actualFromMetrics(challenge: ChallengeConfig, metrics: DisasterMetrics): string | null {
  switch (challenge.ruleType) {
    case 'FLOOD_RATIO_MAX':
      return `침수 ${pct(ratio(metrics.floodCells, metrics.totalCells))}`
    case 'WIND_EXPOSURE_MAX':
      return `강풍 ${pct(ratio(metrics.windHighCells, metrics.totalCells))}`
    case 'COLLAPSE_RISK_MAX':
      return `붕괴위험 ${pct(ratio(metrics.collapseRiskCells, metrics.totalCells))}`
    case 'EVAC_3MIN_RATIO_MIN':
      return `대피 ${pct(metrics.evacWithin3MinRatio ?? 0)}`
    case 'INUNDATION_RATIO_MAX':
      return `침수 ${pct(ratio(metrics.inundatedCells, metrics.totalCells))}`
    case 'HIGH_GROUND_COVERAGE_MIN':
      return `고지 ${pct(metrics.highGroundCoverage ?? 0)}`
    case 'TILE_COUNT_MIN': {
      const p = parseParams(challenge.ruleParamsJson)
      const tile = String(p.tileType ?? 'SHELTER')
      return `${DISASTER_TILE_BY_TYPE[tile as DisasterTileType]?.label ?? tile} ${metrics.tileCounts[tile] ?? 0}칸`
    }
    case 'DISASTER_TILE_SUM_MIN': {
      const p = parseParams(challenge.ruleParamsJson)
      const types = (p.tileTypes as string[]) ?? ['SHELTER', 'HIGH_GROUND']
      const sum = types.reduce((s, t) => s + (metrics.tileCounts[t] ?? 0), 0)
      return `합계 ${sum}칸`
    }
    default:
      return null
  }
}

function evaluateDisasterRule(
  ruleType: string,
  threshold: number | null,
  ruleParamsJson: string | null,
  metrics: DisasterMetrics,
): boolean {
  switch (ruleType) {
    case 'FLOOD_RATIO_MAX':
      return ratio(metrics.floodCells, metrics.totalCells) <= (threshold ?? 1)
    case 'WIND_EXPOSURE_MAX':
      return ratio(metrics.windHighCells, metrics.totalCells) <= (threshold ?? 1)
    case 'COLLAPSE_RISK_MAX':
      return ratio(metrics.collapseRiskCells, metrics.totalCells) <= (threshold ?? 1)
    case 'EVAC_3MIN_RATIO_MIN':
      return (metrics.evacWithin3MinRatio ?? 0) >= (threshold ?? 0)
    case 'INUNDATION_RATIO_MAX':
      return ratio(metrics.inundatedCells, metrics.totalCells) <= (threshold ?? 1)
    case 'HIGH_GROUND_COVERAGE_MIN':
      return (metrics.highGroundCoverage ?? 0) >= (threshold ?? 0)
    case 'TILE_COUNT_MIN': {
      const p = parseParams(ruleParamsJson)
      const tileType = String(p.tileType ?? 'SHELTER')
      return (metrics.tileCounts[tileType] ?? 0) >= Number(p.minCount ?? 1)
    }
    case 'DISASTER_TILE_SUM_MIN': {
      const p = parseParams(ruleParamsJson)
      const types = (p.tileTypes as string[]) ?? ['SHELTER', 'HIGH_GROUND']
      const sum = types.reduce((s, t) => s + (metrics.tileCounts[t] ?? 0), 0)
      return sum >= Number(p.minCount ?? 1)
    }
    default:
      return false
  }
}

function ratio(cells: number | null | undefined, total: number): number {
  if (!cells || total <= 0) return 0
  return cells / total
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

function parseParams(json: string | null): Record<string, unknown> {
  if (!json) return {}
  try {
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return {}
  }
}
