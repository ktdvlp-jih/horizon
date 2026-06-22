import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eraser, Undo2, Redo2 } from 'lucide-react'
import type { DisasterMode, DisasterSimulationResult, Grid, TileType } from '@/types'
import { useRegions } from '@/hooks/useRegions'
import { regionNameByCode } from '@/lib/regions'
import { useGridHistory } from '@/hooks/useGridHistory'
import { useDisasterAnimation } from '@/hooks/useDisasterAnimation'
import { useAuth } from '@/context/AuthContext'
import { fetchDesign } from '@/api/designApi'
import { fetchChallenges } from '@/api/challengeApi'
import {
  coachDisaster,
  fetchScenarios,
  loadCompletedChallengeIds,
  loadDisasterCompletedMetrics,
  saveCompletedChallengeIds,
  saveDisasterCompletedMetrics,
  saveDisasterDesign,
  simulateDisaster,
} from '@/api/disasterApi'
import { createDisasterInitialGrid } from '@/lib/grid'
import { tilesForMode } from '@/lib/disasterTiles'
import {
  commitDisasterChallengeProgress,
  formatDisasterChallengeReveal,
} from '@/lib/disasterChallengeRules'
import type { DisasterMetrics } from '@/types'
import ChallengePanel from '@/components/designer/ChallengePanel'
import CityGrid from '@/components/designer/CityGrid'
import CoachPanel from '@/components/designer/CoachPanel'
import GridViewToggle from '@/components/designer/GridViewToggle'
import DisasterHeaderBar from '@/components/disaster/DisasterHeaderBar'
import DisasterMetricsPanel from '@/components/disaster/DisasterMetricsPanel'
import DisasterAnimationControls from '@/components/disaster/DisasterAnimationControls'
import TyphoonDisasterView, { type TyphoonSaveState } from '@/components/disaster/TyphoonDisasterView'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function parseMode(raw: string | null): DisasterMode {
  if (raw === 'earthquake' || raw === 'tsunami') return raw
  return 'typhoon'
}

export interface TileSaveState {
  save: () => void
  canSave: boolean
  pending: boolean
}

function TileDisasterView({
  mode,
  regionCode,
  scenarioId,
  scenarioDescription,
  designName,
  loadDesignId,
  onDesignIdChange,
  onDesignNameChange,
  onRegionChange,
  onScenarioChange,
  onSaveStateChange,
  onLoadComplete,
}: {
  mode: Exclude<DisasterMode, 'typhoon'>
  regionCode: string
  scenarioId: string
  scenarioDescription?: string
  designName: string
  designId: number | null
  loadDesignId: number | null
  onDesignIdChange: (id: number | null) => void
  onDesignNameChange: (name: string) => void
  onRegionChange: (code: string) => void
  onScenarioChange: (id: string) => void
  onSaveStateChange: (state: TileSaveState) => void
  onLoadComplete: () => void
}) {
  const queryClient = useQueryClient()
  const [brush, setBrush] = useState<TileType>('SHELTER')
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [result, setResult] = useState<DisasterSimulationResult | null>(null)
  const [simLoading, setSimLoading] = useState(false)
  const [completedChallengeIds, setCompletedChallengeIds] = useState<Set<string>>(() =>
    loadCompletedChallengeIds(mode),
  )
  const [completedChallengeMetrics, setCompletedChallengeMetrics] = useState<
    Record<string, DisasterMetrics>
  >(() => loadDisasterCompletedMetrics(mode))

  const palette = useMemo(() => tilesForMode(mode), [mode])

  const {
    grid,
    reset: setGrid,
    undo,
    redo,
    canUndo,
    canRedo,
    beginStroke,
    endStroke,
    paintCell,
    replaceWithHistory,
  } = useGridHistory(createDisasterInitialGrid(mode))

  useEffect(() => {
    setCompletedChallengeIds(loadCompletedChallengeIds(mode))
    setCompletedChallengeMetrics(loadDisasterCompletedMetrics(mode))
    setGrid(createDisasterInitialGrid(mode))
    setResult(null)
    setBrush(palette[0]?.type ?? 'BUILDING')
    onDesignIdChange(null)
    onDesignNameChange('')
  }, [mode, setGrid, palette, onDesignIdChange, onDesignNameChange])

  useEffect(() => {
    if (loadDesignId === null) return
    if (loadDesignId === 0) {
      setGrid(createDisasterInitialGrid(mode))
      onDesignIdChange(null)
      onDesignNameChange('')
      setResult(null)
      onLoadComplete()
      return
    }

    void (async () => {
      try {
        const detail = await fetchDesign(loadDesignId)
        replaceWithHistory(detail.grid as Grid)
        onDesignIdChange(detail.id)
        onDesignNameChange(detail.name)
        onRegionChange(detail.regionCode)
        if (detail.scenarioId) onScenarioChange(detail.scenarioId)
        setResult(null)
      } finally {
        onLoadComplete()
      }
    })()
  }, [
    loadDesignId,
    mode,
    onDesignIdChange,
    onDesignNameChange,
    onLoadComplete,
    onRegionChange,
    onScenarioChange,
    replaceWithHistory,
    setGrid,
  ])

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges', mode],
    queryFn: () => fetchChallenges(mode),
  })

  const runSimulate = useCallback(async () => {
    if (!regionCode || !scenarioId) return
    setSimLoading(true)
    try {
      const res = await simulateDisaster({ mode, regionCode, scenarioId, grid })
      setResult(res)
      if (res.metrics) {
        const { ids, newlyCompleted } = commitDisasterChallengeProgress(
          challenges,
          res.metrics,
          completedChallengeIds,
        )
        if (newlyCompleted.length > 0) {
          setCompletedChallengeIds(ids)
          saveCompletedChallengeIds(mode, ids)
          const metricsMap = { ...completedChallengeMetrics }
          for (const ch of newlyCompleted) {
            metricsMap[ch.id] = res.metrics
          }
          setCompletedChallengeMetrics(metricsMap)
          saveDisasterCompletedMetrics(mode, metricsMap)
        }
      }
    } finally {
      setSimLoading(false)
    }
  }, [mode, regionCode, scenarioId, grid, challenges, completedChallengeIds, completedChallengeMetrics])

  useEffect(() => {
    const t = window.setTimeout(() => void runSimulate(), 450)
    return () => window.clearTimeout(t)
  }, [runSimulate])

  const animation = useDisasterAnimation(mode, regionCode, scenarioId, grid)

  const coachMutation = useMutation({
    mutationFn: () => coachDisaster({ mode, regionCode, scenarioId, grid }),
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      saveDisasterDesign({
        mode,
        name: designName || `${mode} 설계`,
        regionCode,
        scenarioId,
        grid,
      }),
    onSuccess: (saved) => {
      onDesignIdChange(saved.id)
      void queryClient.invalidateQueries({ queryKey: ['my-disaster-designs', mode] })
    },
  })

  useEffect(() => {
    onSaveStateChange({
      save: () => saveMutation.mutate(),
      canSave: !!result && !!regionCode && !!scenarioId,
      pending: saveMutation.isPending,
    })
  }, [
    onSaveStateChange,
    saveMutation.mutate,
    saveMutation.isPending,
    result,
    regionCode,
    scenarioId,
  ])

  return (
    <>
      {scenarioDescription && (
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {scenarioDescription}
        </p>
      )}

      <ChallengePanel
        challenges={challenges}
        completedIds={completedChallengeIds}
        completedMetrics={completedChallengeMetrics as never}
        formatReveal={(ch, m) =>
          formatDisasterChallengeReveal(ch, m as unknown as DisasterMetrics | undefined)
        }
      />

      <div className="grid gap-4 lg:grid-cols-[260px_1fr_280px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">대응 타일</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-1.5">
              {palette.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setBrush(t.type)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-xs ${
                    brush === t.type ? 'border-sky-500 bg-sky-50' : 'border-slate-200'
                  }`}
                >
                  <span>{t.emoji}</span>
                  <span className="font-medium">{t.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" disabled={!canUndo} onClick={undo}>
              <Undo2 className="h-3.5 w-3.5" /> 실행 취소
            </Button>
            <Button size="sm" variant="outline" disabled={!canRedo} onClick={redo}>
              <Redo2 className="h-3.5 w-3.5" /> 다시 실행
            </Button>
          </div>

          <DisasterMetricsPanel mode={mode} metrics={result?.metrics ?? null} loading={simLoading} />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <GridViewToggle
              mode={showHeatmap ? 'heatmap' : 'tile'}
              onChange={(m) => setShowHeatmap(m === 'heatmap')}
            />
            <Button size="sm" variant="ghost" onClick={() => setGrid(createDisasterInitialGrid(mode))}>
              <Eraser className="h-3.5 w-3.5" /> 초기화
            </Button>
          </div>

          <CityGrid
            grid={grid}
            result={null}
            showHeatmap={showHeatmap}
            heatmapKind="risk"
            riskValues={result?.cellValues ?? null}
            animatedRisk={animation.playing ? animation.animatedRisk : null}
            colorMin={animation.playing ? animation.globalMin : result?.globalMin}
            colorMax={animation.playing ? animation.globalMax : result?.globalMax}
            onPaint={(r, c) => paintCell(r, c, brush)}
            onStrokeStart={beginStroke}
            onStrokeEnd={endStroke}
          />

          <DisasterAnimationControls
            playing={animation.playing}
            onToggle={() => animation.setPlaying((p) => !p)}
            onReload={() => void animation.reload()}
            loading={animation.loading}
            hasFrames={animation.hasFrames}
            label={animation.labels[animation.frameIndex]}
            hint="재생으로 시간별 위험 변화를 확인하세요."
          />
        </div>

        <div className="space-y-4">
          <CoachPanel
            onRequest={() => coachMutation.mutate()}
            coach={coachMutation.data ?? null}
            loading={coachMutation.isPending}
            error={coachMutation.error ? '코치 요청 실패' : null}
          />
        </div>
      </div>
    </>
  )
}

export default function DisasterDesignerPage() {
  const { isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = parseMode(searchParams.get('mode'))
  const { data: regionList = [], isLoading: regionsLoading, isError: regionsError } = useRegions()

  const [regionCode, setRegionCode] = useState('')
  const [scenarioId, setScenarioId] = useState('')
  const [designName, setDesignName] = useState('')
  const [designId, setDesignId] = useState<number | null>(null)
  const [loadDesignId, setLoadDesignId] = useState<number | null>(null)
  const saveStateRef = useRef<TyphoonSaveState | TileSaveState>({
    save: () => {},
    canSave: false,
    pending: false,
  })
  const [saveUi, setSaveUi] = useState({ pending: false, canSave: false })

  const { data: scenarios = [], isLoading: scenariosLoading, isError: scenariosError, error: scenariosFetchError, refetch: refetchScenarios } = useQuery({
    queryKey: ['disaster-scenarios', mode],
    queryFn: () => fetchScenarios(mode),
  })

  useEffect(() => {
    if (regionList.length && !regionCode) {
      setRegionCode(regionList[0].code)
    }
  }, [regionList, regionCode])

  const activeScenario = scenarios.find((s) => s.id === scenarioId)

  const effectiveRegionCode = useMemo(() => {
    if (regionCode) return regionCode
    if (activeScenario?.regionCode) return activeScenario.regionCode
    if (regionList.length) return regionList[0].code
    return ''
  }, [regionCode, activeScenario, regionList])

  const effectiveRegionName = useMemo(
    () => regionNameByCode(regionList, effectiveRegionCode),
    [regionList, effectiveRegionCode],
  )

  const handleScenarioChange = useCallback(
    (id: string) => {
      setScenarioId(id)
      const next = scenarios.find((s) => s.id === id)
      if (next?.regionCode) {
        setRegionCode(next.regionCode)
      }
    },
    [scenarios],
  )

  useEffect(() => {
    if (scenarios.length && !scenarioId) {
      const match =
        (effectiveRegionCode
          ? scenarios.find((s) => s.regionCode === effectiveRegionCode)
          : undefined) ?? scenarios[0]
      setScenarioId(match.id)
      if (match.regionCode && !regionCode) {
        setRegionCode(match.regionCode)
      }
    }
  }, [scenarios, scenarioId, effectiveRegionCode, regionCode])

  useEffect(() => {
    setDesignId(null)
    setDesignName('')
    setScenarioId('')
  }, [mode])

  const setMode = (m: DisasterMode) => {
    setSearchParams({ mode: m })
  }

  const handleSaveStateChange = useCallback((state: TyphoonSaveState | TileSaveState) => {
    saveStateRef.current = state
    setSaveUi({ pending: state.pending, canSave: state.canSave })
  }, [])

  const handleSave = () => saveStateRef.current.save()

  return (
    <div className="space-y-4">
      <DisasterHeaderBar
        mode={mode}
        onModeChange={setMode}
        regions={regionList}
        regionCode={effectiveRegionCode}
        regionFallbackName={effectiveRegionName}
        regionsLoading={regionsLoading}
        regionsError={regionsError}
        onRegionChange={setRegionCode}
        scenarios={scenarios}
        scenarioId={scenarioId}
        onScenarioChange={handleScenarioChange}
        isAuthenticated={isAuthenticated}
        designId={designId}
        designName={designName}
        onDesignNameChange={setDesignName}
        onLoadDesign={(id) => setLoadDesignId(id)}
        onNewDesign={() => setLoadDesignId(0)}
        onSave={handleSave}
        savePending={saveUi.pending}
        canSave={saveUi.canSave}
        saveLabel={mode === 'typhoon' ? '저장' : '저장'}
        scenariosLoading={scenariosLoading}
        scenariosError={
          scenariosError
            ? scenariosFetchError instanceof Error
              ? scenariosFetchError.message
              : '시나리오를 불러오지 못했습니다. 백엔드를 재시작하거나 scripts/seed_disaster_scenarios.sql 을 실행해 주세요.'
            : null
        }
        onRetryScenarios={() => void refetchScenarios()}
      />

      {mode === 'typhoon' ? (
        <TyphoonDisasterView
          regionCode={effectiveRegionCode}
          regionName={effectiveRegionName}
          scenarioId={scenarioId}
          scenario={activeScenario}
          designName={designName}
          loadDesignId={loadDesignId}
          onDesignIdChange={setDesignId}
          onDesignNameChange={setDesignName}
          onRegionChange={setRegionCode}
          onScenarioChange={handleScenarioChange}
          onSaveStateChange={handleSaveStateChange}
          onLoadComplete={() => setLoadDesignId(null)}
        />
      ) : (
        <TileDisasterView
          mode={mode}
          regionCode={effectiveRegionCode}
          scenarioId={scenarioId}
          scenarioDescription={activeScenario?.description}
          designName={designName}
          designId={designId}
          loadDesignId={loadDesignId}
          onDesignIdChange={setDesignId}
          onDesignNameChange={setDesignName}
          onRegionChange={setRegionCode}
          onScenarioChange={handleScenarioChange}
          onSaveStateChange={handleSaveStateChange}
          onLoadComplete={() => setLoadDesignId(null)}
        />
      )}
    </div>
  )
}
