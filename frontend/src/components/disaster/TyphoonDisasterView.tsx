import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchDesign } from '@/api/designApi'
import { fetchChallenges } from '@/api/challengeApi'
import {
  coachDisaster,
  loadCompletedChallengeIds,
  loadDisasterCompletedMetrics,
  saveCompletedChallengeIds,
  saveDisasterCompletedMetrics,
  saveDisasterDesign,
  simulateDisaster,
} from '@/api/disasterApi'
import { useDisasterAnimation } from '@/hooks/useDisasterAnimation'
import {
  commitDisasterChallengeProgress,
  formatDisasterChallengeReveal,
} from '@/lib/disasterChallengeRules'
import {
  evaluateCouncilVerdict,
  evaluateCouncilVerdictPlanOnly,
  resolveBriefingStep,
  type CouncilRevealPhase,
} from '@/lib/typhoonBriefing'
import {
  createDefaultTyphoonPlan,
  createStarterTyphoonPlan,
  gridToTyphoonPlan,
  typhoonPlanKey,
  typhoonPlanToGrid,
  zoneRisksFromCells,
  type TyphoonPlan,
} from '@/lib/typhoonZones'
import type { DisasterMetrics, DisasterSimulationResult, Grid, ScenarioSummary } from '@/types'
import ChallengePanel from '@/components/designer/ChallengePanel'
import CoachPanel from '@/components/designer/CoachPanel'
import DisasterAnimationControls from '@/components/disaster/DisasterAnimationControls'
import TyphoonBeforeAfterPanel from '@/components/disaster/TyphoonBeforeAfterPanel'
import TyphoonBriefingStepper from '@/components/disaster/TyphoonBriefingStepper'
import TyphoonCouncilReveal from '@/components/disaster/TyphoonCouncilReveal'
import TyphoonCouncilSubmit from '@/components/disaster/TyphoonCouncilSubmit'
import TyphoonCouncilVerdict from '@/components/disaster/TyphoonCouncilVerdict'
import TyphoonSituationBrief from '@/components/disaster/TyphoonSituationBrief'
import TyphoonVideoPromptPanel from '@/components/disaster/TyphoonVideoPromptPanel'
import TyphoonZonePlanner from '@/components/disaster/TyphoonZonePlanner'
import TyphoonZoneRiskMap from '@/components/disaster/TyphoonZoneRiskMap'
import DisasterMetricsPanel from '@/components/disaster/DisasterMetricsPanel'

export interface TyphoonSaveState {
  save: () => void
  canSave: boolean
  pending: boolean
}

interface Props {
  regionCode: string
  regionName: string
  scenarioId: string
  scenario?: ScenarioSummary | null
  designName: string
  loadDesignId: number | null
  onDesignIdChange: (id: number | null) => void
  onDesignNameChange: (name: string) => void
  onRegionChange: (code: string) => void
  onScenarioChange: (id: string) => void
  onSaveStateChange: (state: TyphoonSaveState) => void
  onLoadComplete: () => void
}

function delay(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms))
}

export default function TyphoonDisasterView({
  regionCode,
  regionName,
  scenarioId,
  scenario,
  designName,
  loadDesignId,
  onDesignIdChange,
  onDesignNameChange,
  onRegionChange,
  onScenarioChange,
  onSaveStateChange,
  onLoadComplete,
}: Props) {
  const queryClient = useQueryClient()
  const [situationAcknowledged, setSituationAcknowledged] = useState(false)
  const [plan, setPlan] = useState<TyphoonPlan>(() => createStarterTyphoonPlan())
  const [result, setResult] = useState<DisasterSimulationResult | null>(null)
  const [baselineResult, setBaselineResult] = useState<DisasterSimulationResult | null>(null)
  const [baselineLoading, setBaselineLoading] = useState(false)
  const [baselineError, setBaselineError] = useState<string | null>(null)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState<string | null>(null)
  const [revealPhase, setRevealPhase] = useState<CouncilRevealPhase>('idle')
  const [simulatedPlanKey, setSimulatedPlanKey] = useState<string | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [completedChallengeIds, setCompletedChallengeIds] = useState<Set<string>>(() =>
    loadCompletedChallengeIds('typhoon'),
  )
  const [completedChallengeMetrics, setCompletedChallengeMetrics] = useState<
    Record<string, DisasterMetrics>
  >(() => loadDisasterCompletedMetrics('typhoon'))

  const simulationGrid = useMemo(() => typhoonPlanToGrid(plan), [plan])
  const baselineGrid = useMemo(() => typhoonPlanToGrid(createDefaultTyphoonPlan()), [])
  const planKey = useMemo(() => typhoonPlanKey(plan), [plan])
  const planDirty = simulatedPlanKey !== null && planKey !== simulatedPlanKey

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges', 'typhoon'],
    queryFn: () => fetchChallenges('typhoon'),
  })

  const resetBriefing = useCallback(() => {
    setSituationAcknowledged(false)
    setPlan(createStarterTyphoonPlan())
    setResult(null)
    setSimulatedPlanKey(null)
    setHasSubmitted(false)
    setSimError(null)
    setRevealPhase('idle')
  }, [])

  const loadBaseline = useCallback(async () => {
    if (!regionCode || !scenarioId) return
    setBaselineLoading(true)
    setBaselineError(null)
    try {
      const res = await simulateDisaster({
        mode: 'typhoon',
        regionCode,
        scenarioId,
        grid: baselineGrid,
      })
      setBaselineResult(res)
    } catch (e) {
      setBaselineError(e instanceof Error ? e.message : '기준선 시뮬레이션 실패')
      setBaselineResult(null)
    } finally {
      setBaselineLoading(false)
    }
  }, [regionCode, scenarioId, baselineGrid])

  useEffect(() => {
    void loadBaseline()
  }, [loadBaseline])

  const runSimulate = useCallback(async () => {
    if (!regionCode || !scenarioId) {
      setSimError('상단 헤더에서 지역과 시나리오를 먼저 선택해 주세요.')
      return
    }

    setSimError(null)
    setRevealPhase('submitting')
    setSimLoading(true)

    try {
      await delay(500)
      setRevealPhase('simulating')

      const res = await simulateDisaster({
        mode: 'typhoon',
        regionCode,
        scenarioId,
        grid: simulationGrid,
      })

      setRevealPhase('deliberating')
      await delay(700)

      setResult(res)
      setSimulatedPlanKey(planKey)
      setHasSubmitted(true)
      setRevealPhase('revealed')

      if (res.metrics) {
        const { ids, newlyCompleted } = commitDisasterChallengeProgress(
          challenges,
          res.metrics,
          completedChallengeIds,
        )
        if (newlyCompleted.length > 0) {
          setCompletedChallengeIds(ids)
          saveCompletedChallengeIds('typhoon', ids)
          const metricsMap = { ...completedChallengeMetrics }
          for (const ch of newlyCompleted) {
            metricsMap[ch.id] = res.metrics
          }
          setCompletedChallengeMetrics(metricsMap)
          saveDisasterCompletedMetrics('typhoon', metricsMap)
        }
      }

      await delay(600)
    } catch (e) {
      setSimError(
        e instanceof Error
          ? e.message
          : '시뮬레이션 요청에 실패했습니다. 백엔드 서버가 실행 중인지 확인해 주세요.',
      )
      setRevealPhase('idle')
    } finally {
      setSimLoading(false)
      window.setTimeout(() => setRevealPhase('idle'), 800)
    }
  }, [
    regionCode,
    scenarioId,
    simulationGrid,
    planKey,
    challenges,
    completedChallengeIds,
    completedChallengeMetrics,
  ])

  useEffect(() => {
    if (loadDesignId === null) return
    if (loadDesignId === 0) {
      resetBriefing()
      onDesignIdChange(null)
      onDesignNameChange('')
      onLoadComplete()
      return
    }

    void (async () => {
      try {
        const detail = await fetchDesign(loadDesignId)
        setPlan(gridToTyphoonPlan(detail.grid as Grid))
        onDesignIdChange(detail.id)
        onDesignNameChange(detail.name)
        onRegionChange(detail.regionCode)
        if (detail.scenarioId) onScenarioChange(detail.scenarioId)
        setResult(null)
        setSimulatedPlanKey(null)
        setHasSubmitted(false)
        setSituationAcknowledged(true)
      } finally {
        onLoadComplete()
      }
    })()
  }, [
    loadDesignId,
    onDesignIdChange,
    onDesignNameChange,
    onLoadComplete,
    onRegionChange,
    onScenarioChange,
    resetBriefing,
  ])

  const animation = useDisasterAnimation('typhoon', regionCode, scenarioId, simulationGrid)

  const activeCells = animation.playing ? animation.animatedRisk : result?.cellValues ?? null
  const zoneRisks = useMemo(() => zoneRisksFromCells(activeCells), [activeCells])

  const coachMutation = useMutation({
    mutationFn: () =>
      coachDisaster({ mode: 'typhoon', regionCode, scenarioId, grid: simulationGrid }),
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      saveDisasterDesign({
        mode: 'typhoon',
        name: designName || '태풍 방어 계획',
        regionCode,
        scenarioId,
        grid: simulationGrid,
      }),
    onSuccess: (saved) => {
      onDesignIdChange(saved.id)
      void queryClient.invalidateQueries({ queryKey: ['my-disaster-designs', 'typhoon'] })
    },
  })

  useEffect(() => {
    onSaveStateChange({
      save: () => saveMutation.mutate(),
      canSave: hasSubmitted && !!result && !!regionCode && !!scenarioId,
      pending: saveMutation.isPending,
    })
  }, [
    onSaveStateChange,
    saveMutation.mutate,
    saveMutation.isPending,
    hasSubmitted,
    result,
    regionCode,
    scenarioId,
  ])

  const activeStep = resolveBriefingStep(
    situationAcknowledged,
    hasSubmitted && !!result,
    !!coachMutation.data,
  )

  const verdict = useMemo(() => {
    if (!result?.metrics) return null
    if (baselineResult?.metrics) {
      return evaluateCouncilVerdict(result.metrics, baselineResult.metrics)
    }
    return evaluateCouncilVerdictPlanOnly(result.metrics)
  }, [result, baselineResult])

  const showPlanning = situationAcknowledged
  const showPresentation = hasSubmitted && !!result

  const submitBlockReason =
    !regionCode || !scenarioId
      ? '상단에서 지역과 시나리오를 선택해 주세요.'
      : baselineLoading
        ? '무조치 비교 기준선 로드 중… 곧 제출할 수 있습니다.'
        : baselineError
          ? `기준선 로드 실패(제출은 가능): ${baselineError}`
          : null

  const canSubmit = !!regionCode && !!scenarioId && !simLoading

  return (
    <div className="space-y-4">
      <TyphoonBriefingStepper activeStep={activeStep} />

      {!situationAcknowledged && (
        <TyphoonSituationBrief
          regionName={regionName || '이 지역'}
          scenario={scenario}
          onStartPlanning={() => setSituationAcknowledged(true)}
        />
      )}

      {showPlanning && (
        <>
          <ChallengePanel
            challenges={challenges}
            completedIds={completedChallengeIds}
            completedMetrics={completedChallengeMetrics as never}
            formatReveal={(ch, m) =>
              formatDisasterChallengeReveal(ch, m as unknown as DisasterMetrics | undefined)
            }
          />

          <TyphoonCouncilReveal phase={revealPhase} visible={revealPhase !== 'idle'} />

          {simError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {simError}
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-[300px_1fr_280px]">
            <div className="space-y-4">
              <TyphoonZonePlanner
                plan={plan}
                onChange={setPlan}
                onReset={() => setPlan(createStarterTyphoonPlan())}
                briefingMode
              />
              {showPresentation && result?.metrics && (
                <DisasterMetricsPanel mode="typhoon" metrics={result.metrics} loading={false} />
              )}
            </div>

            <div className="space-y-3">
              <TyphoonCouncilSubmit
                planDirty={planDirty}
                simLoading={simLoading}
                hasResult={hasSubmitted}
                canSubmit={canSubmit}
                blockReason={submitBlockReason}
                onSubmit={() => void runSimulate()}
              />

              {showPresentation && verdict && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-3">
                  <TyphoonCouncilVerdict verdict={verdict} />
                  {baselineResult?.metrics && result?.metrics && (
                    <TyphoonBeforeAfterPanel
                      baseline={baselineResult.metrics}
                      plan={result.metrics}
                    />
                  )}
                  {result?.metrics && (
                    <TyphoonVideoPromptPanel
                      regionName={regionName || '이 지역'}
                      scenario={scenario}
                      planMetrics={result.metrics}
                      baselineMetrics={baselineResult?.metrics}
                      verdict={verdict}
                      zoneRiskPct={zoneRisks}
                      timelineLabels={animation.labels}
                    />
                  )}
                </div>
              )}

              <TyphoonZoneRiskMap
                zoneRisks={zoneRisks}
                globalMin={animation.playing ? animation.globalMin : result?.globalMin}
                globalMax={animation.playing ? animation.globalMax : result?.globalMax}
                loading={simLoading && !result}
                animateBars={showPresentation}
                timelineLabel={animation.labels[animation.frameIndex]}
                emptyHint={
                  !result && !simLoading
                    ? '시의회에 제출하면 구역별 위험도 브리핑 자료가 표시됩니다.'
                    : undefined
                }
              />

              <DisasterAnimationControls
                playing={animation.playing}
                onToggle={() => animation.setPlaying((p) => !p)}
                onReload={() => void animation.reload()}
                loading={animation.loading}
                hasFrames={animation.hasFrames}
                label={animation.labels[animation.frameIndex]}
                hint={
                  showPresentation
                    ? '「재생」으로 시의회에 설명할 태풍 진행 타임라인(T+시간)을 확인하세요.'
                    : '시의회 제출 후 시간별 재생 브리핑을 사용할 수 있습니다.'
                }
              />
            </div>

            <div className="space-y-4">
              <CoachPanel
                title="수석 재난안전관"
                requestLabel={
                  showPresentation ? '사후 브리핑 요청' : '시의회 제출 후 이용 가능'
                }
                scoreLabel="계획 점수"
                onRequest={() => coachMutation.mutate()}
                coach={coachMutation.data ?? null}
                loading={coachMutation.isPending}
                error={
                  coachMutation.error instanceof Error
                    ? coachMutation.error.message
                    : coachMutation.error
                      ? '브리핑 요청 실패'
                      : null
                }
                requestDisabled={!showPresentation}
              />
              {!showPresentation && (
                <p className="text-[11px] leading-snug text-slate-400">
                  시의회 표결 결과를 확인한 뒤, 수석관에게 개선 브리핑을 요청할 수 있습니다.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
