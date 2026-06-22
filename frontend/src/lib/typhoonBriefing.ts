import type { DisasterMetrics, ScenarioSummary } from '@/types'
import type { TyphoonZoneId } from '@/lib/typhoonZones'
import { TYPHOON_ZONE_LABELS } from '@/lib/typhoonZones'

export type BriefingStepId = 'situation' | 'planning' | 'presentation' | 'debrief'

export interface BriefingStep {
  id: BriefingStepId
  label: string
  subtitle: string
}

export const BRIEFING_STEPS: BriefingStep[] = [
  { id: 'situation', label: '상황 브리핑', subtitle: 'D-1 긴급 보고' },
  { id: 'planning', label: '예산 배분', subtitle: '방어 계획 수립' },
  { id: 'presentation', label: '시의회', subtitle: '제출·시뮬레이션' },
  { id: 'debrief', label: '사후 브리핑', subtitle: '평가·개선' },
]

export const COUNCIL_QUESTIONS: Record<TyphoonZoneId, string> = {
  coastal: '해안구 의원: "방조제 예산은 어디까지 쓸 건가?"',
  lowland: '저지대 대표: "침수 전에 배수·녹지부터 확보해 달라."',
  river: '하천변 주민: "범람 시 대피 경로는 준비됐나?"',
  urban: '주거지 의원: "밀집 지역 대피소가 부족하지 않나?"',
  inland: '내륙구 의원: "대피민을 받을 허브 역할을 할 수 있나?"',
}

export type CouncilOutcome = 'approved' | 'conditional' | 'rejected'

export type CouncilRevealPhase = 'idle' | 'submitting' | 'simulating' | 'deliberating' | 'revealed'

export interface CouncilVerdict {
  outcome: CouncilOutcome
  headline: string
  summary: string
  concerns: string[]
  praise: string[]
}

export function resolveBriefingStep(
  situationAcknowledged: boolean,
  hasSubmittedResult: boolean,
  hasCoach: boolean,
): BriefingStepId {
  if (!situationAcknowledged) return 'situation'
  if (!hasSubmittedResult) return 'planning'
  if (!hasCoach) return 'presentation'
  return 'debrief'
}

export function buildSituationBriefing(
  regionName: string,
  scenario?: ScenarioSummary | null,
): { title: string; bullets: string[]; urgency: string } {
  const scenarioTitle = scenario?.title ?? '강한 태풍'
  return {
    title: `${regionName} — 태풍 대비 긴급 시의회 (D-1)`,
    urgency: '상황 단계: 주의 → 경계 (접근 중)',
    bullets: [
      `예상 시나리오: ${scenarioTitle}`,
      scenario?.description ?? '강풍·폭우·해일성 파고가 연쇄적으로 예상됩니다.',
      '한정된 긴급 방어 예산(72pt) 안에서 구역별 우선순위를 정해야 합니다.',
      '모든 구역을 동시에 지킬 수는 없습니다 — 시장으로서 선택과 설명이 필요합니다.',
    ],
  }
}

/** 무조치 baseline 없을 때 단독 평가 */
export function evaluateCouncilVerdictPlanOnly(plan: DisasterMetrics): CouncilVerdict {
  if (plan.affectedRatio <= 0.35 && plan.protectedRatio >= 0.45) {
    return {
      outcome: 'approved',
      headline: '시의회 — 방어 계획 승인',
      summary: '제출하신 방어 계획은 위험·대피 지표가 시의회 기준을 충족합니다.',
      praise: ['위험 지역과 대피 커버 균형이 양호합니다.'],
      concerns: [],
    }
  }
  if (plan.affectedRatio <= 0.5 || plan.protectedRatio >= 0.35) {
    return {
      outcome: 'conditional',
      headline: '시의회 — 조건부 승인',
      summary: '방향은 타당하나 일부 구역 보완이 필요합니다.',
      praise: ['일부 지표에서 개선이 확인되었습니다.'],
      concerns: ['취약 구역 추가 투자가 필요해 보입니다.'],
    }
  }
  return {
    outcome: 'rejected',
    headline: '시의회 — 계획 보류',
    summary: '현재안으로는 시민 피해가 과도할 것으로 예상됩니다.',
    praise: [],
    concerns: ['위험 지역 비율이 높고 대피 커버가 부족합니다.'],
  }
}

export function evaluateCouncilVerdict(
  plan: DisasterMetrics,
  baseline: DisasterMetrics,
): CouncilVerdict {
  const affectedDrop = baseline.affectedRatio - plan.affectedRatio
  const protectedGain = plan.protectedRatio - baseline.protectedRatio
  const avgDrop = baseline.avgRisk - plan.avgRisk

  const praise: string[] = []
  const concerns: string[] = []

  if (affectedDrop >= 0.12) praise.push(`위험 지역 비율을 ${pct(affectedDrop)} 줄였습니다.`)
  if (protectedGain >= 0.1) praise.push(`보호·대피 커버가 ${pct(protectedGain)} 늘었습니다.`)
  if (plan.avgRisk <= 0.35) praise.push('평균 위험도가 허용 범위 안에 있습니다.')

  if (plan.affectedRatio > 0.5) concerns.push('위험 지역이 여전히 과반에 가깝습니다.')
  if (plan.protectedRatio < 0.35) concerns.push('대피·보호 시설 커버가 시의회 기준에 미달합니다.')
  if (affectedDrop < 0.05) concerns.push('무조치 대비 개선 폭이 거의 없습니다.')
  if ((plan.floodCells ?? 0) > 15) concerns.push('침수 셀이 많아 하천·저지대 배수 투자가 부족해 보입니다.')
  if ((plan.windHighCells ?? 0) > 12) concerns.push('강풍 취약 구역(해안) 방어가 약합니다.')

  const score =
    (affectedDrop >= 0.15 ? 2 : affectedDrop >= 0.08 ? 1 : 0) +
    (protectedGain >= 0.12 ? 2 : protectedGain >= 0.06 ? 1 : 0) +
    (plan.affectedRatio <= 0.35 ? 2 : plan.affectedRatio <= 0.45 ? 1 : 0) +
    (avgDrop >= 0.08 ? 1 : 0)

  if (score >= 5) {
    return {
      outcome: 'approved',
      headline: '시의회 — 방어 계획 승인',
      summary:
        '제출하신 방어 계획은 예산 대비 효과가 충분합니다. 즉시 배치·대피 준비를 지시합니다.',
      praise: praise.length ? praise : ['전 구역 균형 배분이 시의회 설득에 도움이 되었습니다.'],
      concerns: concerns.slice(0, 2),
    }
  }

  if (score >= 3) {
    return {
      outcome: 'conditional',
      headline: '시의회 — 조건부 승인',
      summary:
        '방향은 타당하나 취약 구역 보완이 필요합니다. 보완안을 반영한 뒤 12시간 내 재보고하세요.',
      praise: praise.length ? praise : ['일부 구역에서 눈에 띄는 개선이 있었습니다.'],
      concerns: concerns.length ? concerns : ['우선순위 근거를 발표 자료에 더 명확히 적어 주세요.'],
    }
  }

  return {
    outcome: 'rejected',
    headline: '시의회 — 계획 보류',
    summary:
      '현재안으로는 시민 피해가 과도할 것으로 예상됩니다. 예산 재배분 후 다시 제출해 주세요.',
    praise: praise.slice(0, 1),
    concerns: concerns.length
      ? concerns
      : ['무조치 대비 체감 개선이 부족합니다.', '취약 구역 방어가 분산되었습니다.'],
  }
}

export interface VideoPromptInput {
  regionName: string
  scenario?: ScenarioSummary | null
  planMetrics: DisasterMetrics
  baselineMetrics?: DisasterMetrics | null
  verdict: CouncilVerdict
  zoneRiskPct: Record<TyphoonZoneId, number>
  timelineLabels?: string[]
}

export function buildTyphoonVideoPrompt(input: VideoPromptInput): string {
  const scenarioTitle = input.scenario?.title ?? '강한 태풍'
  const scenarioDesc = input.scenario?.description ?? '강풍과 폭우가 동시에 예상됩니다.'
  const zoneLines = (Object.entries(input.zoneRiskPct) as [TyphoonZoneId, number][])
    .map(([id, risk]) => `- ${TYPHOON_ZONE_LABELS[id]}: 위험 ${Math.round(risk * 100)}%`)
    .join('\n')

  const beforeAfter = input.baselineMetrics
    ? `무조치 시 위험 지역 ${formatMetricPct(input.baselineMetrics.affectedRatio)} → 시장안 ${formatMetricPct(input.planMetrics.affectedRatio)}`
    : `시장안 위험 지역 ${formatMetricPct(input.planMetrics.affectedRatio)}`

  const timeline =
    input.timelineLabels?.length ?
      `시간 흐름: ${input.timelineLabels.join(' → ')}`
    : '시간 흐름: T+0 접근 → T+6h 강풍 → T+12h 폭우 → T+18h 침수'

  return [
    '【AI 영상 생성용 프롬프트 — 태풍 D-1 시의회 브리핑】',
    '',
    'Style: cinematic documentary, Korean city disaster briefing, dramatic but educational, aerial + ground shots, realistic weather VFX, no gore, 16:9',
    'Duration: 30–45 seconds, 4 scenes',
    '',
    `Scene 1 (5s): Emergency city hall at night. Sign "${input.regionName} 태풍 대비 긴급 시의회 D-1". Mayor at podium, city council members, weather map showing ${scenarioTitle}.`,
    '',
    `Scene 2 (10s): ${scenarioDesc} Split screen — left: unprotected coastal/lowland flooding and strong wind; right: seawalls, drainage, evacuation shelters being deployed per district plan.`,
    '',
    `Scene 3 (10s): Simulation results on large screen. ${beforeAfter}. District risk bars:\n${zoneLines}. ${timeline}.`,
    '',
    `Scene 4 (10s): City council vote result — "${input.verdict.headline}". ${input.verdict.summary} Cut to citizens evacuating to shelters as rain intensifies, then calmer inland hub.`,
    '',
    'Camera: slow push-in on mayor, wide aerial of city coastline, macro rain on windows, timelapse clouds.',
    'Lighting: amber emergency lights, blue storm sky, screen glow on faces.',
    'Audio mood: tense orchestral, rain/wind ambience (no dialogue required).',
    '',
    'Negative prompt: cartoon, text overlay clutter, unrealistic destruction, blood, news ticker spam',
  ].join('\n')
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%p`
}

export function formatMetricPct(v: number): string {
  return `${Math.round(v * 100)}%`
}

export const COUNCIL_REVEAL_MESSAGES: Record<CouncilRevealPhase, string> = {
  idle: '',
  submitting: '방어 계획서를 시의회 사무국에 제출하는 중…',
  simulating: '태풍 접근 시나리오를 시뮬레이션하는 중…',
  deliberating: '시의회 의원들이 결과를 검토·표결하는 중…',
  revealed: '표결 결과가 공개되었습니다.',
}
