import type { ChallengeConfig, DesignMetrics } from '@/types'
import { TILE_BY_TYPE } from '@/lib/tiles'
import type { TileType } from '@/types'

export const CHALLENGE_RULE_LABELS: Record<string, string> = {
  GREEN_RATIO_MIN: '녹지율 ≥ (threshold)',
  DELTA_T_MAX: 'ΔT ≤ (threshold)',
  WATER_RATIO_MIN: '수면·습지율 ≥ (threshold)',
  IMPERVIOUS_RATIO_MAX: '불투수면율 ≤ (threshold)',
  TILE_COUNT_MIN: '타일 개수 ≥ (JSON: tileType, minCount)',
  ALL_OF: '복합 조건 (JSON 배열)',
}

interface SubRule {
  ruleType: string
  threshold?: number
  tileType?: string
  minCount?: number
}

export function evaluateChallenge(challenge: ChallengeConfig, metrics: DesignMetrics): boolean {
  return evaluateRule(challenge.ruleType, challenge.threshold, challenge.ruleParamsJson, metrics)
}

/** 「기준 잡기」 시점에만 호출 — 조건을 만족한 새 과제를 반환 */
export function commitChallengeProgress(
  challenges: ChallengeConfig[],
  metrics: DesignMetrics,
  completedIds: Set<string>,
): { ids: Set<string>; newlyCompleted: ChallengeConfig[] } {
  const ids = new Set(completedIds)
  const newlyCompleted: ChallengeConfig[] = []
  for (const ch of challenges) {
    if (!ids.has(ch.id) && evaluateChallenge(ch, metrics)) {
      ids.add(ch.id)
      newlyCompleted.push(ch)
    }
  }
  return { ids, newlyCompleted }
}

/** 달성 후에만 보여 줄 목표(정답) 설명 — 규칙에서 자동 생성 */
export function formatChallengeReveal(challenge: ChallengeConfig, metrics?: DesignMetrics): string {
  const target = revealFromRule(challenge.ruleType, challenge.threshold, challenge.ruleParamsJson)
  if (!metrics) return target
  const actual = actualFromMetrics(challenge, metrics)
  return actual ? `달성 ${actual} · ${target}` : target
}

function revealFromRule(
  ruleType: string,
  threshold: number | null,
  ruleParamsJson: string | null,
): string {
  switch (ruleType) {
    case 'GREEN_RATIO_MIN':
      return `목표: 녹지율 ${pct(threshold ?? 0)} 이상`
    case 'DELTA_T_MAX':
      return threshold === 0
        ? '목표: 기준 기온보다 평균 표면온도가 낮아짐'
        : `목표: 기준 대비 ${formatDelta(threshold ?? 0)} 이하`
    case 'WATER_RATIO_MIN':
      return `목표: 수면·습지 ${pct(threshold ?? 0)} 이상`
    case 'IMPERVIOUS_RATIO_MAX':
      return `목표: 도로·건물 등 불투수면 ${pct(threshold ?? 1)} 이하`
    case 'TILE_COUNT_MIN': {
      const params = parseParams(ruleParamsJson)
      const tile = String(params.tileType ?? 'TREE') as TileType
      const min = Number(params.minCount ?? 1)
      const label = TILE_BY_TYPE[tile]?.label ?? tile
      return `목표: ${label} 타일 ${min}칸 이상`
    }
    case 'ALL_OF': {
      const parts = parseSubRules(ruleParamsJson).map((r) =>
        revealFromRule(r.ruleType, r.threshold ?? null, tileParamsJson(r)),
      )
      return parts.length > 0 ? `목표: ${parts.join(' + ')}` : '목표: 복합 조건'
    }
    default:
      return '목표 달성'
  }
}

function actualFromMetrics(challenge: ChallengeConfig, metrics: DesignMetrics): string | null {
  switch (challenge.ruleType) {
    case 'GREEN_RATIO_MIN':
      return `녹지율 ${pct(metrics.greenRatio)}`
    case 'DELTA_T_MAX':
      return `기준 대비 ${formatDelta(metrics.deltaT)}`
    case 'WATER_RATIO_MIN':
      return `수면·습지 ${pct(metrics.waterRatio)}`
    case 'IMPERVIOUS_RATIO_MAX':
      return `불투수면 ${pct(metrics.imperviousRatio)}`
    case 'TILE_COUNT_MIN': {
      const params = parseParams(challenge.ruleParamsJson)
      const tile = String(params.tileType ?? 'TREE')
      const count = metrics.tileCounts[tile] ?? 0
      const label = TILE_BY_TYPE[tile as TileType]?.label ?? tile
      return `${label} ${count}칸`
    }
    case 'ALL_OF':
      return `녹지 ${pct(metrics.greenRatio)}, 기준 대비 ${formatDelta(metrics.deltaT)}`
    default:
      return null
  }
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

function formatDelta(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}°C`
}

function evaluateRule(
  ruleType: string,
  threshold: number | null,
  ruleParamsJson: string | null,
  metrics: DesignMetrics,
): boolean {
  switch (ruleType) {
    case 'GREEN_RATIO_MIN':
      return metrics.greenRatio >= (threshold ?? 0)
    case 'DELTA_T_MAX':
      return metrics.deltaT <= (threshold ?? 0)
    case 'WATER_RATIO_MIN':
      return metrics.waterRatio >= (threshold ?? 0)
    case 'IMPERVIOUS_RATIO_MAX':
      return metrics.imperviousRatio <= (threshold ?? 1)
    case 'TILE_COUNT_MIN': {
      const params = parseParams(ruleParamsJson)
      const tileType = String(params.tileType ?? 'TREE')
      const minCount = Number(params.minCount ?? 1)
      return (metrics.tileCounts[tileType] ?? 0) >= minCount
    }
    case 'ALL_OF': {
      const rules = parseSubRules(ruleParamsJson)
      return rules.every((r) =>
        evaluateRule(r.ruleType, r.threshold ?? null, tileParamsJson(r), metrics),
      )
    }
    default:
      return false
  }
}

function tileParamsJson(rule: SubRule): string | null {
  if (rule.ruleType !== 'TILE_COUNT_MIN') return null
  return JSON.stringify({ tileType: rule.tileType, minCount: rule.minCount })
}

function parseParams(json: string | null): Record<string, unknown> {
  if (!json) return {}
  try {
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return {}
  }
}

function parseSubRules(json: string | null): SubRule[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? (parsed as SubRule[]) : []
  } catch {
    return []
  }
}

const STORAGE_PREFIX = 'horizon.challenges.completed.'
const METRICS_PREFIX = 'horizon.challenges.metrics.'

export function loadCompletedChallengeIds(experienceId: string): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + experienceId)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function loadCompletedChallengeMetrics(
  experienceId: string,
): Record<string, DesignMetrics> {
  try {
    const raw = localStorage.getItem(METRICS_PREFIX + experienceId)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, DesignMetrics>
  } catch {
    return {}
  }
}

export function saveCompletedChallengeIds(experienceId: string, ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_PREFIX + experienceId, JSON.stringify([...ids]))
  } catch {
    /* ignore */
  }
}

export function saveCompletedChallengeMetrics(
  experienceId: string,
  metricsById: Record<string, DesignMetrics>,
) {
  try {
    localStorage.setItem(METRICS_PREFIX + experienceId, JSON.stringify(metricsById))
  } catch {
    /* ignore */
  }
}
