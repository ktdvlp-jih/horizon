import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { evaluate } from '@/api/designApi'
import { fetchScenarios } from '@/api/disasterApi'
import type { DisasterMode, EvaluateResponse, Grid, LensKind } from '@/types'
import type { HeatmapKind } from '@/lib/tiles'
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
}

const LENS_META: Record<LensKind, { label: string; emoji: string; needsScenario?: boolean }> = {
  heat: { label: '열섬', emoji: '🌡️' },
  air: { label: '미세먼지', emoji: '🌫️' },
  disaster: { label: '재난', emoji: '🛡️', needsScenario: true },
  agriculture: { label: '농어업', emoji: '🌾' },
}

const LENS_ORDER: LensKind[] = ['heat', 'air', 'disaster', 'agriculture']
const MODES: DisasterMode[] = ['typhoon', 'earthquake', 'tsunami']

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

export default function ResiliencePanel({ regionCode, grid, onOverlayChange }: Props) {
  const [activeLens, setActiveLens] = useState<LensKind>('heat')
  const [scenarioId, setScenarioId] = useState<string>('')
  const [debouncedGrid, setDebouncedGrid] = useState<Grid>(grid)

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

  const { data: evalResult } = useQuery<EvaluateResponse>({
    queryKey: ['evaluate', regionCode, gridKey, scenarioId],
    queryFn: () => evaluate(regionCode, debouncedGrid, { scenarioId: scenarioId || null }),
    enabled: !!regionCode,
    staleTime: 10_000,
  })

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

  const axisScores = evalResult?.axisScores ?? {}

  return (
    <Card data-tutorial="resilience">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">회복탄력성 평가</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
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

        {evalResult && (
          <div className="space-y-2">
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
          </div>
        )}
        <p className="text-[11px] leading-relaxed text-slate-400">
          하나의 도시 설계를 여러 축으로 동시에 평가합니다. 렌즈를 바꿔 격자 위 위험도를 확인하세요.
        </p>
      </CardContent>
    </Card>
  )
}
