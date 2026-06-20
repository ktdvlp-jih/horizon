import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Eraser, Map, Save, Trees } from 'lucide-react'
import type { CoachResponse, Grid, SimulationResult, TileType } from '@/types'
import { useRegions } from '@/hooks/useRegions'
import { useClimateAnimation } from '@/hooks/useClimateAnimation'
import { coach as coachApi, saveDesign, simulate as simulateApi } from '@/api/designApi'
import { createInitialGrid, fillGrid, GRID_SIZE, setCell } from '@/lib/grid'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import RegionSelector from '@/components/designer/RegionSelector'
import TilePalette from '@/components/designer/TilePalette'
import CityGrid from '@/components/designer/CityGrid'
import AnimationControls from '@/components/designer/AnimationControls'
import MetricsPanel from '@/components/designer/MetricsPanel'
import CoachPanel from '@/components/designer/CoachPanel'
import HeatmapGuideButton from '@/components/designer/HeatmapGuideButton'

/** Local-time ISO date (yyyy-MM-dd) n days ago. */
function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export default function DesignerPage() {
  const { data: regions } = useRegions()
  const [regionCode, setRegionCode] = useState<string>('')
  const [grid, setGrid] = useState<Grid>(() => createInitialGrid())
  const [brush, setBrush] = useState<TileType>('TREE')
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [coach, setCoach] = useState<CoachResponse | null>(null)
  const [ambient, setAmbient] = useState(true)
  const [particles, setParticles] = useState(true)
  const [timelineDate, setTimelineDate] = useState(() => isoDaysAgo(1))
  const [designName, setDesignName] = useState('')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const simToken = useRef(0)

  const anim = useClimateAnimation(regionCode, grid, timelineDate)
  const animStop = anim.stop

  useEffect(() => {
    if (regions?.length && !regionCode) {
      setRegionCode(regions[0].code)
    }
  }, [regions, regionCode])

  // Editing the grid, switching region, or changing the date invalidates the
  // cached timeline and returns to the live static heatmap.
  useEffect(() => {
    animStop()
  }, [grid, regionCode, timelineDate, animStop])

  // Debounced live simulation: every paint re-computes the heatmap.
  useEffect(() => {
    if (!regionCode) return
    const token = ++simToken.current
    const timer = setTimeout(() => {
      simulateApi(regionCode, grid)
        .then((res) => {
          if (token === simToken.current) setResult(res)
        })
        .catch(() => undefined)
    }, 220)
    return () => clearTimeout(timer)
  }, [regionCode, grid])

  const coachMutation = useMutation({
    mutationFn: () => coachApi(regionCode, grid),
    onSuccess: setCoach,
  })

  const saveMutation = useMutation({
    mutationFn: () => saveDesign(designName.trim() || '내 설계', regionCode, grid),
    onSuccess: () => {
      setSaveMessage('설계가 저장되었습니다.')
      setDesignName('')
    },
    onError: (err: Error) => setSaveMessage(err.message),
  })

  const onSave = useCallback(() => {
    setSaveMessage(null)
    saveMutation.mutate()
  }, [saveMutation])

  const onPaint = useCallback(
    (r: number, c: number) => {
      setGrid((g) => (g[r][c] === brush ? g : setCell(g, r, c, brush)))
    },
    [brush],
  )

  const regionList = useMemo(() => regions ?? [], [regions])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">도시 기후 설계자</h1>
          <p className="text-sm text-slate-500">
            타일을 칠해 도시를 설계하면 열섬 히트맵이 실시간으로 바뀝니다.
          </p>
        </div>
        {regionList.length > 0 && (
          <RegionSelector regions={regionList} value={regionCode} onChange={setRegionCode} />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            placeholder="설계 이름 (선택)"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-sky-500 focus:ring-2"
          />
          <Button size="sm" variant="outline" onClick={onSave} disabled={saveMutation.isPending || !regionCode}>
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? '저장 중…' : '설계 저장'}
          </Button>
        </div>
      </div>
      {saveMessage && (
        <p className={`text-sm ${saveMessage.includes('저장되었') ? 'text-emerald-600' : 'text-rose-600'}`}>
          {saveMessage}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>타일 팔레트</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TilePalette brush={brush} onSelect={setBrush} />
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setGrid(fillGrid(GRID_SIZE, 'PARK'))}>
                  <Trees className="h-4 w-4" /> 전부 공원
                </Button>
                <Button size="sm" variant="outline" onClick={() => setGrid(createInitialGrid())}>
                  <Eraser className="h-4 w-4" /> 초기화
                </Button>
              </div>
            </CardContent>
          </Card>
          <MetricsPanel result={result} frame={anim.snapshot} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>도시 격자 ({GRID_SIZE}×{GRID_SIZE})</CardTitle>
            <div className="flex items-center gap-1">
              <HeatmapGuideButton />
              <Button size="sm" variant="ghost" onClick={() => setShowHeatmap((v) => !v)}>
                <Map className="h-4 w-4" />
                {showHeatmap ? '타일 보기' : '히트맵 보기'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CityGrid
              grid={grid}
              result={result}
              showHeatmap={showHeatmap}
              onPaint={onPaint}
              animatedTemps={anim.snapshot?.temps ?? null}
              colorMin={anim.timeline?.globalMin}
              colorMax={anim.timeline?.globalMax}
              ambient={ambient}
              particles={particles}
              solarIntensity={anim.snapshot?.solarIntensity ?? 1}
            />
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
            <p className="text-center text-[11px] text-slate-400">
              교육용 근사 모델 · 실제 기상 데이터 기반 baseline
            </p>
          </CardContent>
        </Card>

        <CoachPanel
          coach={coach}
          loading={coachMutation.isPending}
          error={coachMutation.isError ? '코치 호출에 실패했습니다. 잠시 후 다시 시도하세요.' : null}
          onRequest={() => coachMutation.mutate()}
        />
      </div>
    </div>
  )
}
