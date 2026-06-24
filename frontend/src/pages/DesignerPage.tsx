import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useSearchParams } from 'react-router-dom'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Boxes, Eraser, Redo2, Trees, Undo2 } from 'lucide-react'

import type { CoachResponse, SimulationResult, TileType } from '@/types'

import { useRegions } from '@/hooks/useRegions'

import { useClimateAnimation } from '@/hooks/useClimateAnimation'

import { useGridHistory } from '@/hooks/useGridHistory'

import { useAuth } from '@/context/AuthContext'

import {

  coach as coachApi,

  fetchDesign,

  fetchLeaderboardDesign,

  saveDesign,

  simulate as simulateApi,

  updateDesign,

} from '@/api/designApi'

import { createInitialGrid, fillGrid, GRID_SIZE, normalizeLoadedGrid } from '@/lib/grid'

import { fetchChallenges } from '@/api/challengeApi'
import { commitChallengeProgress, loadCompletedChallengeIds, loadCompletedChallengeMetrics, saveCompletedChallengeIds, saveCompletedChallengeMetrics } from '@/lib/challengeRules'
import { clearGuestDraft, loadGuestDraft, saveGuestDraft } from '@/lib/guestDesign'
import ChallengePanel from '@/components/designer/ChallengePanel'

import { Button } from '@/components/ui/button'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import DesignerHeaderBar from '@/components/designer/DesignerHeaderBar'

import TilePalette from '@/components/designer/TilePalette'

import TileGuideButton from '@/components/designer/TileGuideButton'

import CityGrid from '@/components/designer/CityGrid'

import AnimationControls from '@/components/designer/AnimationControls'

import MetricsPanel from '@/components/designer/MetricsPanel'

import CoachPanel from '@/components/designer/CoachPanel'

import ResiliencePanel, { type LensOverlay } from '@/components/designer/ResiliencePanel'

import GridViewToggle, { gridViewHint } from '@/components/designer/GridViewToggle'

const City3DView = lazy(() => import('@/components/designer/City3DView'))

import HeatmapGuideButton from '@/components/designer/HeatmapGuideButton'

import TutorialOverlay from '@/components/tutorial/TutorialOverlay'

import DesignerMobileTabs, { type DesignerMobileTab } from '@/components/designer/DesignerMobileTabs'



function isoDaysAgo(n: number): string {

  const d = new Date()

  d.setDate(d.getDate() - n)

  const mm = String(d.getMonth() + 1).padStart(2, '0')

  const dd = String(d.getDate()).padStart(2, '0')

  return `${d.getFullYear()}-${mm}-${dd}`

}



export default function DesignerPage() {

  const { isAuthenticated } = useAuth()

  const queryClient = useQueryClient()

  const [searchParams, setSearchParams] = useSearchParams()

  const designIdParam = searchParams.get('designId')

  const refIdParam = searchParams.get('refId')

  const designId =

    designIdParam && !Number.isNaN(Number(designIdParam)) ? Number(designIdParam) : null

  const refId = refIdParam && !Number.isNaN(Number(refIdParam)) ? Number(refIdParam) : null

  const showTutorial = searchParams.get('tutorial') === '1'



  const { data: regions } = useRegions()

  const [regionCode, setRegionCode] = useState<string>('')

  const {

    grid,
    paintCell,
    reset: resetGridHistory,

    replaceWithHistory,

    beginStroke,

    endStroke,

    undo,

    redo,

    canUndo,

    canRedo,

  } = useGridHistory(createInitialGrid())

  const [brush, setBrush] = useState<TileType>('TREE')

  const [showHeatmap, setShowHeatmap] = useState(false)

  const [lensOverlay, setLensOverlay] = useState<LensOverlay | null>(null)

  const [show3D, setShow3D] = useState(false)

  const [result, setResult] = useState<SimulationResult | null>(null)

  const [baselineResult, setBaselineResult] = useState<SimulationResult | null>(null)

  const [coach, setCoach] = useState<CoachResponse | null>(null)

  const [ambient, setAmbient] = useState(true)

  const [particles, setParticles] = useState(true)

  const [timelineDate, setTimelineDate] = useState(() => isoDaysAgo(1))

  const [designName, setDesignName] = useState('')

  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const [loadMessage, setLoadMessage] = useState<string | null>(null)

  const [completedChallengeIds, setCompletedChallengeIds] = useState(() =>
    loadCompletedChallengeIds('urban-climate'),
  )
  const [completedChallengeMetrics, setCompletedChallengeMetrics] = useState(() =>
    loadCompletedChallengeMetrics('urban-climate'),
  )

  const [mobileTab, setMobileTab] = useState<DesignerMobileTab>('grid')

  const simToken = useRef(0)
  const guestRestored = useRef(false)

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges', 'urban-climate'],
    queryFn: () => fetchChallenges('urban-climate'),
    staleTime: 5 * 60_000,
  })

  const {

    data: loadedDesign,

    isError: loadError,

    isLoading: loadLoading,

  } = useQuery({

    queryKey: ['design', designId],

    queryFn: () => fetchDesign(designId!),

    enabled: isAuthenticated && designId != null,

    retry: false,

  })



  const {

    data: refDesign,

    isError: refError,

    isLoading: refLoading,

  } = useQuery({

    queryKey: ['leaderboard-design', refId],

    queryFn: () => fetchLeaderboardDesign(refId!),

    enabled: refId != null && designId == null,

    retry: false,

  })

  const commitChallenges = useCallback(() => {
    if (!result || challenges.length === 0) return
    const { ids, newlyCompleted } = commitChallengeProgress(
      challenges,
      result.metrics,
      completedChallengeIds,
    )
    if (newlyCompleted.length === 0) return

    setCompletedChallengeIds(ids)
    saveCompletedChallengeIds('urban-climate', ids)

    setCompletedChallengeMetrics((prev) => {
      const next = { ...prev }
      for (const ch of newlyCompleted) {
        next[ch.id] = result.metrics
      }
      saveCompletedChallengeMetrics('urban-climate', next)
      return next
    })

    const titles = newlyCompleted.map((c) => c.title).join(', ')
    setLoadMessage(`도전과제 달성: ${titles}`)
  }, [result, challenges, completedChallengeIds])

  const anim = useClimateAnimation(regionCode, grid, timelineDate, commitChallenges)

  const animStop = anim.stop



  useEffect(() => {

    if (regions?.length && !regionCode) {

      setRegionCode(regions[0].code)

    }

  }, [regions, regionCode])



  useEffect(() => {
    if (!loadedDesign) return
    setRegionCode(loadedDesign.regionCode)
    const normalized = normalizeLoadedGrid(loadedDesign.grid)
    resetGridHistory(normalized)
    setDesignName(loadedDesign.name)
    setCoach(null)
    setLoadMessage(`「${loadedDesign.name}」 설계를 불러왔습니다.`)
    simulateApi(loadedDesign.regionCode, normalized)
      .then(setBaselineResult)
      .catch(() => undefined)
  }, [loadedDesign, resetGridHistory])



  useEffect(() => {
    if (!refDesign) return
    const normalized = normalizeLoadedGrid(refDesign.grid)
    resetGridHistory(normalized)
    setRegionCode(refDesign.regionCode)
    setDesignName(`${refDesign.name} (참고)`)
    setCoach(null)
    setLoadMessage(`「${refDesign.name}」 설계를 참고용으로 불러왔습니다. 저장 시 새 설계로 저장됩니다.`)
    simulateApi(refDesign.regionCode, normalized)
      .then(setBaselineResult)
      .catch(() => undefined)
    setSearchParams({}, { replace: true })
  }, [refDesign, resetGridHistory, setSearchParams])



  useEffect(() => {

    if (loadError) setLoadMessage('설계를 불러오지 못했습니다.')

    if (refError) setLoadMessage('공개 설계를 불러오지 못했습니다.')

  }, [loadError, refError])



  useEffect(() => {

    if (!isAuthenticated || guestRestored.current) return

    const draft = loadGuestDraft()

    if (!draft) return

    guestRestored.current = true

    clearGuestDraft()

    if (draft.regionCode) setRegionCode(draft.regionCode)

    resetGridHistory(normalizeLoadedGrid(draft.grid))

    if (draft.designName) setDesignName(draft.designName)

    setLoadMessage('게스트 체험 중이던 설계를 복원했습니다.')

  }, [isAuthenticated, resetGridHistory])



  useEffect(() => {
    if (isAuthenticated) return
    const id = window.setTimeout(() => {
      saveGuestDraft({ regionCode, grid, designName })
    }, 600)
    return () => window.clearTimeout(id)
  }, [isAuthenticated, regionCode, grid, designName])



  const onLoadDesign = useCallback(

    (id: number) => {

      setLoadMessage(null)

      setSearchParams({ designId: String(id) }, { replace: true })

    },

    [setSearchParams],

  )



  const onNewDesign = useCallback(() => {

    setSearchParams({}, { replace: true })

    const initial = createInitialGrid()

    replaceWithHistory(initial)

    setDesignName('')

    setCoach(null)

    setLoadMessage(null)

    if (regions?.length) setRegionCode(regions[0].code)

  }, [regions, replaceWithHistory, setSearchParams])



  useEffect(() => {
    const id = window.setTimeout(() => animStop(), 120)
    return () => window.clearTimeout(id)
  }, [grid, regionCode, timelineDate, animStop])

  useEffect(() => {
    if (!regionCode) return
    const token = ++simToken.current
    const timer = setTimeout(() => {
      simulateApi(regionCode, grid)
        .then((res) => {
          if (token !== simToken.current) return
          setResult(res)
        })
        .catch(() => undefined)
    }, 450)
    return () => clearTimeout(timer)
  }, [regionCode, grid])



  useEffect(() => {

    if (!regionCode) return

    const initial = createInitialGrid()

    simulateApi(regionCode, initial)

      .then(setBaselineResult)

      .catch(() => undefined)

  }, [regionCode])



  useEffect(() => {

    const onKey = (e: KeyboardEvent) => {

      if (!(e.ctrlKey || e.metaKey)) return

      if (e.key === 'z' && !e.shiftKey) {

        e.preventDefault()

        undo()

      }

      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {

        e.preventDefault()

        redo()

      }

    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)

  }, [undo, redo])



  const coachMutation = useMutation({

    mutationFn: () => coachApi(regionCode, grid),

    onSuccess: setCoach,

  })



  const saveMutation = useMutation({

    mutationFn: () => {

      const name = designName.trim() || '내 설계'

      if (designId != null) {

        return updateDesign(designId, name, regionCode, grid)

      }

      return saveDesign(name, regionCode, grid)

    },

    onSuccess: (saved) => {

      setSaveMessage('설계가 저장되었습니다.')

      void queryClient.invalidateQueries({ queryKey: ['my-designs'] })

      setSearchParams({ designId: String(saved.id) }, { replace: true })

      if (!designId) setDesignName('')

    },

    onError: (err: Error) => setSaveMessage(err.message),

  })



  const onSave = useCallback(() => {

    if (!isAuthenticated) return

    setSaveMessage(null)

    saveMutation.mutate()

  }, [isAuthenticated, saveMutation])



  const onPaint = useCallback(
    (r: number, c: number) => {
      paintCell(r, c, brush)
    },
    [brush, paintCell],
  )



  const onPaint3D = useCallback(
    (r: number, c: number) => {
      beginStroke()
      paintCell(r, c, brush)
      endStroke()
    },
    [beginStroke, paintCell, endStroke, brush],
  )

  const onStrokeStart = useCallback(() => {
    beginStroke()
  }, [beginStroke])

  const onStrokeEnd = useCallback(() => {
    endStroke()
  }, [endStroke])



  const onSetBaseline = useCallback(() => {
    if (result) setBaselineResult(result)
  }, [result])



  const onResetGrid = useCallback(() => {
    const initial = createInitialGrid()
    replaceWithHistory(initial)
    if (regionCode) {
      simulateApi(regionCode, initial)
        .then(setBaselineResult)
        .catch(() => undefined)
    }
  }, [replaceWithHistory, regionCode])



  const onFillPark = useCallback(() => {

    replaceWithHistory(fillGrid(GRID_SIZE, 'PARK'))

  }, [replaceWithHistory])



  const regionList = useMemo(() => regions ?? [], [regions])



  const statusBanner = useMemo(() => {

    if ((loadLoading && designId != null) || (refLoading && refId != null)) {

      return { text: '설계를 불러오는 중…', tone: 'muted' as const }

    }

    if (loadMessage && !loadLoading && !refLoading) {

      return {

        text: loadMessage,

        tone: loadMessage.includes('불러') ? ('success' as const) : ('error' as const),

      }

    }

    if (saveMessage) {

      return {

        text: saveMessage,

        tone: saveMessage.includes('저장') ? ('success' as const) : ('error' as const),

      }

    }

    return null

  }, [loadLoading, designId, refLoading, refId, loadMessage, saveMessage])

  const palettePanel = (
    <Card data-tutorial="palette">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">타일 팔레트</CardTitle>
        <TileGuideButton />
      </CardHeader>
      <CardContent className="space-y-3">
        <TilePalette brush={brush} onSelect={setBrush} />
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            size="sm"
            variant="outline"
            type="button"
            disabled={!canUndo}
            title="Ctrl+Z"
            className="touch-manipulation select-none whitespace-nowrap px-2 text-xs"
            onClick={() => undo()}
          >
            <Undo2 className="h-3.5 w-3.5 shrink-0" />
            실행 취소
          </Button>
          <Button
            size="sm"
            variant="outline"
            type="button"
            disabled={!canRedo}
            title="Ctrl+Y"
            className="touch-manipulation select-none whitespace-nowrap px-2 text-xs"
            onClick={() => redo()}
          >
            <Redo2 className="h-3.5 w-3.5 shrink-0" />
            다시 실행
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
          <Button size="sm" variant="outline" className="whitespace-nowrap" onClick={onFillPark}>
            <Trees className="h-4 w-4" /> 전부 공원
          </Button>
          <Button size="sm" variant="outline" className="whitespace-nowrap" onClick={onResetGrid}>
            <Eraser className="h-4 w-4" /> 초기화
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const gridPanel = (
    <Card className="h-fit">
      <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="shrink-0 text-base">도시 격자 ({GRID_SIZE}×{GRID_SIZE})</CardTitle>
        <div
          className="flex w-full shrink-0 items-center gap-1 overflow-x-auto pb-0.5 sm:w-auto"
          data-tutorial="heatmap"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <Button
            size="sm"
            variant="outline"
            type="button"
            className="shrink-0 whitespace-nowrap px-2 text-xs"
            onClick={() => setShow3D(true)}
          >
            <Boxes className="h-4 w-4" /> 3D
          </Button>
          <GridViewToggle
            mode={showHeatmap ? 'heatmap' : 'tile'}
            onChange={(m) => setShowHeatmap(m === 'heatmap')}
          />
          <HeatmapGuideButton />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="hidden rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600 sm:block">
          {gridViewHint(showHeatmap ? 'heatmap' : 'tile', !!anim.snapshot)}
        </p>
        <div className="mx-auto w-full max-w-[min(100%,26rem)]">
          <CityGrid
            grid={grid}
            result={result}
            showHeatmap={lensOverlay ? true : showHeatmap}
            onPaint={onPaint}
            onStrokeStart={onStrokeStart}
            onStrokeEnd={onStrokeEnd}
            animatedTemps={lensOverlay ? null : anim.snapshot?.temps ?? null}
            colorMin={lensOverlay ? lensOverlay.min : anim.timeline?.globalMin}
            colorMax={lensOverlay ? lensOverlay.max : anim.timeline?.globalMax}
            ambient={ambient}
            particles={particles}
            solarIntensity={anim.snapshot?.solarIntensity ?? 1}
            riskValues={lensOverlay?.values ?? null}
            heatmapKind={lensOverlay?.kind ?? 'temp'}
          />
        </div>
        <AnimationControls
          anim={anim}
          ambient={ambient}
          onToggleAmbient={() => setAmbient((v) => !v)}
          particles={particles}
          onToggleParticles={() => setParticles((v) => !v)}
          date={timelineDate}
          maxDate={isoDaysAgo(0)}
          onDateChange={setTimelineDate}
        />
        <p className="text-center text-[10px] text-slate-400 sm:text-[11px]">
          교육용 근사 모델 · 기상청 baseline
        </p>
      </CardContent>
    </Card>
  )

  const metricsPanel = (
    <MetricsPanel
      result={result}
      baselineResult={baselineResult}
      frame={anim.snapshot}
      onSetBaseline={onSetBaseline}
    />
  )

  const resiliencePanel = (
    <ResiliencePanel
      regionCode={regionCode}
      grid={grid}
      onOverlayChange={setLensOverlay}
      onLoadGrid={replaceWithHistory}
    />
  )

  const coachPanel = (
    <CoachPanel
      coach={coach}
      loading={coachMutation.isPending}
      error={coachMutation.isError ? '코치 호출에 실패했습니다. 잠시 후 다시 시도하세요.' : null}
      onRequest={() => coachMutation.mutate()}
      locked={!isAuthenticated}
    />
  )

  /** 시뮬레이션 결과 → AI 코치 순서 (우측 / 코치 탭) */
  const coachStack = (
    <div className="space-y-3">
      {metricsPanel}
      {coachPanel}
    </div>
  )

  return (

    <div className="space-y-4">

      <TutorialOverlay
        force={showTutorial}
        onStepChange={(step) => {
          const tabByStep: Partial<Record<number, DesignerMobileTab>> = {
            1: 'tiles',
            2: 'grid',
            3: 'grid',
            4: 'coach',
            5: 'insight',
            6: 'insight',
          }
          const tab = tabByStep[step]
          if (tab) setMobileTab(tab)
        }}
      />

      <ChallengePanel
        challenges={challenges}
        completedIds={completedChallengeIds}
        completedMetrics={completedChallengeMetrics}
      />

      <DesignerHeaderBar
        description="타일로 도시를 설계한 뒤, 히트맵으로 온도 변화를 확인하세요."
        regions={regionList}
        regionCode={regionCode}
        onRegionChange={setRegionCode}
        isAuthenticated={isAuthenticated}
        designId={designId}
        designName={designName}
        onDesignNameChange={setDesignName}
        onLoadDesign={onLoadDesign}
        onNewDesign={onNewDesign}
        onSave={onSave}
        savePending={saveMutation.isPending}
      />

      <div className="h-5 text-sm leading-5" aria-live="polite">

        <p

          className={

            statusBanner

              ? statusBanner.tone === 'success'

                ? 'truncate text-emerald-600'

                : statusBanner.tone === 'error'

                  ? 'truncate text-rose-600'

                  : 'truncate text-slate-500'

              : 'invisible'

          }

        >

          {statusBanner?.text ?? '\u00A0'}

        </p>

      </div>

      <DesignerMobileTabs active={mobileTab} onChange={setMobileTab} />

      {/* 모바일: 탭별 한 화면씩 — 줄바꿈·빈 공간 최소화 */}
      <div className="space-y-4 lg:hidden">
        {mobileTab === 'grid' && gridPanel}
        {mobileTab === 'tiles' && palettePanel}
        {mobileTab === 'insight' && resiliencePanel}
        {mobileTab === 'coach' && coachStack}
      </div>

      {/* 데스크톱: 격자 중앙(+회복탄력성) · 시뮬+코치 우측 */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(220px,240px)_minmax(0,1fr)_minmax(280px,300px)] lg:items-start">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          {palettePanel}
        </aside>

        <section className="space-y-4">
          {gridPanel}
          {resiliencePanel}
        </section>

        <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          {coachStack}
        </aside>
      </div>

      {show3D && (
        <Suspense fallback={null}>
          <City3DView
            open={show3D}
            onClose={() => setShow3D(false)}
            grid={grid}
            values={
              lensOverlay
                ? lensOverlay.values
                : anim.snapshot?.temps ?? result?.surfaceTemps ?? null
            }
            valueMin={lensOverlay ? lensOverlay.min : anim.timeline?.globalMin ?? result?.metrics.minSurfaceTemp}
            valueMax={lensOverlay ? lensOverlay.max : anim.timeline?.globalMax ?? result?.metrics.maxSurfaceTemp}
            heatmapKind={lensOverlay?.kind ?? 'temp'}
            showHeatmap={lensOverlay ? true : showHeatmap}
            brush={brush}
            onBrushChange={setBrush}
            onPaintCell={onPaint3D}
            playing={anim.isPlaying}
            loading={anim.isLoading}
            onPlay={anim.load}
            onStop={anim.stop}
          />
        </Suspense>
      )}

    </div>

  )

}

