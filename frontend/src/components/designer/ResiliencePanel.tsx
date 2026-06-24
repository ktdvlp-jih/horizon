import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { coachResilience, evaluate } from '@/api/designApi'
import { fetchScenarios } from '@/api/disasterApi'
import type { CoachResponse, DisasterMode, EvaluateResponse, Grid, LensKind } from '@/types'
import type { HeatmapKind } from '@/lib/tiles'
import {
  TRACKS,
  TRACK_BY_ID,
  LEVEL_BY_ID,
  loadProgress,
  isLevelUnlocked,
  carryOverGrid,
  completeLevel,
} from '@/lib/levels'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface LensOverlay {
  kind: HeatmapKind
  values: number[][]
  min: number
  max: number
}

interface Props {
  regionCode: string
  grid: Grid
  onOverlayChange: (overlay: LensOverlay | null) => void
  onLoadGrid?: (grid: Grid) => void
}

const LENS_META: Record<LensKind, { label: string; emoji: string; needsScenario?: boolean }> = {
  heat: { label: '열섬', emoji: '🌡️' },
  air: { label: '미세먼지', emoji: '🌫️' },
  disaster: { label: '재난', emoji: '🛡️', needsScenario: true },
  agriculture: { label: '농어업', emoji: '🌾' },
}

const LENS_ORDER: LensKind[] = ['heat', 'air', 'disaster', 'agriculture']
const MODES: DisasterMode[] = ['typhoon', 'earthquake', 'tsunami']

interface AgricultureZonesState {
  farmland: number
  fishery: number
  forest: number
  solar: number
}

const DEFAULT_ZONES: AgricultureZonesState = { farmland: 0.4, fishery: 0.2, forest: 0.25, solar: 0.15 }

const ZONE_META: { key: keyof AgricultureZonesState; label: string; emoji: string }[] = [
  { key: 'farmland', label: '농지', emoji: '🌾' },
  { key: 'fishery', label: '어장', emoji: '🐟' },
  { key: 'forest', label: '보존림', emoji: '🌲' },
  { key: 'solar', label: '영농형 태양광', emoji: '🔆' },
]

interface AgricultureMetricsShape {
  cropYieldIndex: number
  fisheryIndex: number
  waterSecurityIndex: number
  carbonBalanceIndex: number
  warmingDeltaC: number
}

interface StressPhase {
  label: string
  emoji: string
  lens: LensKind
  scenarioId?: string
}

/** Sequenced climate stress timeline: heatwave → typhoon → fine dust → harvest. */
const STRESS_PHASES: StressPhase[] = [
  { label: '폭염', emoji: '🔥', lens: 'heat' },
  { label: '태풍', emoji: '🌀', lens: 'disaster', scenarioId: 'typhoon-maemi-2003' },
  { label: '미세먼지', emoji: '🌫️', lens: 'air' },
  { label: '수확기', emoji: '🌾', lens: 'agriculture' },
]

function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-rose-600'
}

function barColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-rose-500'
}

export default function ResiliencePanel({ regionCode, grid, onOverlayChange, onLoadGrid }: Props) {
  const [activeLens, setActiveLens] = useState<LensKind>('heat')
  const [scenarioId, setScenarioId] = useState<string>('')
  const [zones, setZones] = useState<AgricultureZonesState>(DEFAULT_ZONES)
  const [debouncedGrid, setDebouncedGrid] = useState<Grid>(grid)
  const [activeTrackId, setActiveTrackId] = useState<string>(TRACKS[0].id)
  const [activeLevelId, setActiveLevelId] = useState<string | null>(null)
  const [completed, setCompleted] = useState<string[]>(() => loadProgress().completed)
  const [levelMessage, setLevelMessage] = useState<string | null>(null)
  const [stressPhase, setStressPhase] = useState<number | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedGrid(grid), 500)
    return () => window.clearTimeout(id)
  }, [grid])

  const { data: scenarios = [] } = useQuery({
    queryKey: ['disaster-scenarios', 'all'],
    queryFn: async () => {
      const lists = await Promise.all(MODES.map((m) => fetchScenarios(m).catch(() => [])))
      return lists.flat()
    },
    staleTime: 5 * 60_000,
  })

  const gridKey = useMemo(() => JSON.stringify(debouncedGrid), [debouncedGrid])

  const zonesKey = `${zones.farmland}-${zones.fishery}-${zones.forest}-${zones.solar}`

  const { data: evalResult } = useQuery<EvaluateResponse>({
    queryKey: ['evaluate', regionCode, gridKey, scenarioId, zonesKey],
    queryFn: () => evaluate(regionCode, debouncedGrid, { scenarioId: scenarioId || null, zones }),
    enabled: !!regionCode,
    staleTime: 10_000,
  })

  const agriMetrics = evalResult?.lenses.agriculture?.metrics as AgricultureMetricsShape | undefined

  const [coach, setCoach] = useState<CoachResponse | null>(null)
  const coachMutation = useMutation({
    mutationFn: () => coachResilience(regionCode, debouncedGrid, { scenarioId: scenarioId || null, zones }),
    onSuccess: setCoach,
  })

  const activeLevel = activeLevelId ? LEVEL_BY_ID[activeLevelId] : null

  const startLevel = (levelId: string) => {
    const level = LEVEL_BY_ID[levelId]
    if (!level) return
    const track = TRACKS.find((t) => t.levels.some((l) => l.id === levelId))
    if (!track || !isLevelUnlocked(track, level, completed)) return
    setActiveLevelId(levelId)
    setActiveLens(level.lens)
    setScenarioId(level.scenarioId ?? '')
    setLevelMessage(null)
    const carry = carryOverGrid(track, level)
    if (carry && onLoadGrid) onLoadGrid(carry)
  }

  const levelMetricValue = (metric: 'resilience' | LensKind): number | null => {
    if (!evalResult) return null
    if (metric === 'resilience') return evalResult.resilienceScore
    return evalResult.axisScores[metric] ?? null
  }

  useEffect(() => {
    if (!activeLevel || !evalResult) return
    if (completed.includes(activeLevel.id)) return
    const value = levelMetricValue(activeLevel.goal.metric)
    if (value != null && value >= activeLevel.goal.min) {
      const next = completeLevel(activeLevel.id, grid)
      setCompleted((prev) => (prev.includes(activeLevel.id) ? prev : [...prev, activeLevel.id]))
      setLevelMessage(
        next
          ? `🎉 「${activeLevel.title}」 클리어! 다음 레벨이 해금되었습니다.`
          : `🎉 「${activeLevel.title}」 클리어!`,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evalResult, activeLevel, completed, grid])

  useEffect(() => {
    if (!evalResult) {
      onOverlayChange(null)
      return
    }
    const lens = evalResult.lenses[activeLens]
    if (activeLens === 'heat' || !lens || !lens.heatmap?.length) {
      onOverlayChange(null)
      return
    }
    const kind: HeatmapKind = activeLens === 'air' ? 'air' : 'risk'
    onOverlayChange({ kind, values: lens.heatmap, min: lens.min, max: lens.max })
  }, [evalResult, activeLens, onOverlayChange])

  useEffect(() => () => onOverlayChange(null), [onOverlayChange])

  // Stress timeline: advance phases, switching the active lens for each stage.
  useEffect(() => {
    if (stressPhase == null) return
    const phase = STRESS_PHASES[stressPhase]
    setActiveLens(phase.lens)
    setScenarioId(phase.scenarioId ?? '')
    const id = window.setTimeout(() => {
      setStressPhase((prev) => {
        if (prev == null) return null
        return prev + 1 < STRESS_PHASES.length ? prev + 1 : null
      })
    }, 2600)
    return () => window.clearTimeout(id)
  }, [stressPhase])

  const toggleStress = () => {
    setStressPhase((prev) => (prev == null ? 0 : null))
  }

  const axisScores = evalResult?.axisScores ?? {}

  return (
    <Card className="h-fit" data-tutorial="resilience">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">회복탄력성 평가</CardTitle>
        <p className="text-[11px] leading-relaxed text-slate-500">
          타일을 칠하면 자동으로 4축(열섬·미세먼지·재난·농어업)을 함께 평가합니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <details className="rounded-lg border border-sky-100 bg-sky-50/40 px-3 py-2 text-[11px] text-slate-600">
          <summary className="cursor-pointer font-semibold text-sky-800">사용 순서</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>격자에 타일을 배치합니다 (0.5초 후 점수가 갱신됩니다).</li>
            <li>
              <strong>렌즈 탭</strong>(🌡️열섬·🌫️미세먼지 등)을 눌러 격자 위 위험도 색을 바꿔 봅니다.
            </li>
            <li>
              (선택) <strong>재난 시나리오</strong>를 고르면 🛡️재난 렌즈가 켜집니다.
            </li>
            <li>
              <strong>종합 회복탄력성</strong>·축별 막대를 보고, 🤖 통합 AI 코치로 개선 힌트를 받습니다.
            </li>
            <li>
              <strong>▶ 스트레스 테스트</strong>로 폭염→태풍→미세먼지→수확기를 순서대로 점검합니다.
            </li>
          </ol>
        </details>
        <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3" data-tutorial="resilience-levels">
          <div className="flex flex-wrap gap-1">
            {TRACKS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTrackId(t.id)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                  activeTrackId === t.id
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t.emoji} {t.title}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">{TRACK_BY_ID[activeTrackId].intro}</p>
          <div className="space-y-1">
            {TRACK_BY_ID[activeTrackId].levels.map((level) => {
              const track = TRACK_BY_ID[activeTrackId]
              const unlocked = isLevelUnlocked(track, level, completed)
              const done = completed.includes(level.id)
              const active = activeLevelId === level.id
              const value = active ? levelMetricValue(level.goal.metric) : null
              return (
                <button
                  key={level.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => startLevel(level.id)}
                  className={`w-full rounded-md border px-2.5 py-1.5 text-left transition ${
                    active
                      ? 'border-sky-400 bg-sky-50'
                      : unlocked
                        ? 'border-slate-200 bg-white hover:border-slate-300'
                        : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      {done ? '✅ ' : unlocked ? '' : '🔒 '}
                      Lv.{level.order} {level.title}
                    </span>
                    {active && value != null && (
                      <span
                        className={value >= level.goal.min ? 'text-[11px] text-emerald-600' : 'text-[11px] text-slate-400'}
                      >
                        {value.toFixed(0)} / {level.goal.min}
                      </span>
                    )}
                  </div>
                  {active && <p className="mt-0.5 text-[11px] text-slate-500">{level.brief}</p>}
                </button>
              )
            })}
          </div>
          {levelMessage && <p className="text-[11px] font-medium text-emerald-600">{levelMessage}</p>}
        </div>

        <div className="flex flex-wrap gap-1.5" data-tutorial="resilience-lens">
          {LENS_ORDER.map((kind) => {
            const meta = LENS_META[kind]
            const available = kind === 'heat' || !meta.needsScenario || !!scenarioId
            const active = activeLens === kind
            return (
              <button
                key={kind}
                type="button"
                disabled={!available}
                onClick={() => setActiveLens(kind)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : available
                      ? 'border-slate-200 text-slate-600 hover:border-slate-300'
                      : 'cursor-not-allowed border-slate-100 text-slate-300'
                }`}
                title={!available ? '재난 시나리오를 선택하면 활성화됩니다.' : undefined}
              >
                {meta.emoji} {meta.label}
              </button>
            )
          })}
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-500">재난 시나리오 (선택)</label>
          <select
            value={scenarioId}
            onChange={(e) => {
              setScenarioId(e.target.value)
              if (!e.target.value && activeLens === 'disaster') setActiveLens('heat')
            }}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">없음 (열섬·미세먼지만)</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {LENS_META.disaster.emoji} {s.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 rounded-lg border border-orange-100 bg-orange-50/50 p-2.5" data-tutorial="resilience-stress">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-orange-700">스트레스 테스트</span>
            <button
              type="button"
              onClick={toggleStress}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                stressPhase != null
                  ? 'bg-rose-500 text-white'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              {stressPhase != null ? '■ 중지' : '▶ 시작'}
            </button>
          </div>
          <div className="flex gap-1">
            {STRESS_PHASES.map((p, i) => (
              <div
                key={p.label}
                className={`flex-1 rounded px-1 py-0.5 text-center text-[10px] transition ${
                  stressPhase === i
                    ? 'bg-rose-500 text-white'
                    : 'bg-white text-slate-500'
                }`}
              >
                {p.emoji} {p.label}
              </div>
            ))}
          </div>
          {stressPhase != null && (
            <p className="text-[11px] text-rose-600">
              {STRESS_PHASES[stressPhase].emoji} {STRESS_PHASES[stressPhase].label} 충격 중 — 이 설계의 대응을 확인하세요.
            </p>
          )}
        </div>

        {activeLens === 'agriculture' && (
          <div className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
            <p className="text-xs font-medium text-emerald-700">외곽 광역 구역 배분</p>
            {ZONE_META.map(({ key, label, emoji }) => (
              <div key={key} className="space-y-0.5">
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>
                    {emoji} {label}
                  </span>
                  <span>{Math.round(zones[key] * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={zones[key]}
                  onChange={(e) =>
                    setZones((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                  }
                  className="w-full accent-emerald-500"
                />
              </div>
            ))}
            {agriMetrics && (
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                <div className="rounded bg-white px-2 py-1">🌾 작황 {agriMetrics.cropYieldIndex.toFixed(0)}</div>
                <div className="rounded bg-white px-2 py-1">🐟 어획 {agriMetrics.fisheryIndex.toFixed(0)}</div>
                <div className="rounded bg-white px-2 py-1">💧 수자원 {agriMetrics.waterSecurityIndex.toFixed(0)}</div>
                <div className="rounded bg-white px-2 py-1">🌳 탄소 {agriMetrics.carbonBalanceIndex.toFixed(0)}</div>
                <div className="col-span-2 text-center text-[10px] text-slate-400">
                  장기 기후 가정 +{agriMetrics.warmingDeltaC.toFixed(1)}°C
                </div>
              </div>
            )}
          </div>
        )}

        {evalResult && (
          <div className="space-y-2" data-tutorial="resilience-scores">
            <div className="flex items-baseline justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-sm text-slate-600">종합 회복탄력성</span>
              <span className={`text-2xl font-bold ${scoreColor(evalResult.resilienceScore)}`}>
                {evalResult.resilienceScore.toFixed(0)}
              </span>
            </div>
            {evalResult.balancePenalty > 0 && (
              <p className="text-[11px] text-amber-600">
                ⚖️ 균형 패널티 −{evalResult.balancePenalty.toFixed(1)} (축 간 격차가 큽니다)
              </p>
            )}
            <div className="space-y-1.5">
              {LENS_ORDER.filter((k) => axisScores[k] != null).map((k) => {
                const score = axisScores[k] as number
                return (
                  <div key={k} className="space-y-0.5">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>
                        {LENS_META[k].emoji} {LENS_META[k].label}
                      </span>
                      <span className={scoreColor(score)}>{score.toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full ${barColor(score)}`}
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => coachMutation.mutate()}
              disabled={coachMutation.isPending}
              className="w-full rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
            >
              {coachMutation.isPending ? '코치 분석 중…' : '🤖 통합 AI 코치 받기'}
            </button>

            {coach && (
              <div className="space-y-1.5 rounded-lg border border-violet-100 bg-violet-50/50 p-3 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-violet-700">{coach.grade}</span>
                  <span className="text-slate-400">{coach.source === 'llm' ? 'AI' : '규칙'}</span>
                </div>
                {coach.strengths.length > 0 && (
                  <p className="text-emerald-700">👍 {coach.strengths[0]}</p>
                )}
                {coach.weaknesses.length > 0 && (
                  <p className="text-rose-700">⚠️ {coach.weaknesses[0]}</p>
                )}
                {coach.suggestions.length > 0 && (
                  <p className="text-slate-600">💡 {coach.suggestions[0]}</p>
                )}
                <p className="text-slate-400">{coach.learningPoint}</p>
              </div>
            )}
          </div>
        )}
        <p className="text-[11px] leading-relaxed text-slate-400">
          하나의 도시 설계를 여러 축으로 동시에 평가합니다. 렌즈를 바꿔 격자 위 위험도를 확인하세요.
        </p>
      </CardContent>
    </Card>
  )
}
