import type { SimulationResult } from '@/types'
import type { AnimatedSnapshot } from '@/hooks/useClimateAnimation'
import { summarizeTileCounts } from '@/lib/tiles'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className="font-semibold text-slate-700">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

interface Props {
  result: SimulationResult | null
  baselineResult?: SimulationResult | null
  frame?: AnimatedSnapshot | null
  onSetBaseline?: () => void
}

export default function MetricsPanel({
  result,
  baselineResult = null,
  frame = null,
  onSetBaseline,
}: Props) {
  if (!result) {
    return (
      <Card data-tutorial="metrics">
        <CardContent className="py-8 text-center text-sm text-slate-400">
          타일을 칠하면 실시간으로 온도가 계산됩니다.
        </CardContent>
      </Card>
    )
  }

  const m = result.metrics
  const avg = frame ? frame.avgSurfaceTemp : m.avgSurfaceTemp
  const maxTemp = frame ? frame.maxSurfaceTemp : m.maxSurfaceTemp
  const minTemp = frame ? frame.minSurfaceTemp : m.minSurfaceTemp
  const deltaT = frame ? frame.deltaT : m.deltaT
  const baseTemp = frame ? frame.airTemp : m.baseAirTemp
  const cooled = deltaT < 0
  const tileBreakdown = summarizeTileCounts(m.tileCounts)
  const totalCells = m.totalCells || 1

  const baseAvg = baselineResult?.metrics.avgSurfaceTemp
  const baseDelta = baselineResult?.metrics.deltaT
  const changeAvg = baseAvg != null && !frame ? avg - baseAvg : null
  const changeDelta = baseDelta != null && !frame ? deltaT - baseDelta : null

  return (
    <Card data-tutorial="metrics">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center justify-between">
          <span>시뫤레이션 결과</span>
          {frame && (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
              {frame.label}
            </span>
          )}
        </CardTitle>
        {onSetBaseline && !frame && (
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={onSetBaseline}>
            현재 상태를 기준으로 잡기
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {baselineResult && !frame && baseAvg != null && baseDelta != null && (
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
            <div className="mb-2 font-semibold text-slate-600">Before / After</div>
            <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 tabular-nums">
              <span />
              <span className="text-slate-400">평균</span>
              <span className="text-slate-400">ΔT</span>
              <span className="font-medium text-slate-500">기준</span>
              <span>{baseAvg.toFixed(1)}°C</span>
              <span className={baseDelta < 0 ? 'text-sky-700' : 'text-rose-700'}>
                {baseDelta > 0 ? '+' : ''}
                {baseDelta.toFixed(1)}°C
              </span>
              <span className="font-medium text-slate-500">현재</span>
              <span>{avg.toFixed(1)}°C</span>
              <span className={cooled ? 'text-sky-700' : 'text-rose-700'}>
                {deltaT > 0 ? '+' : ''}
                {deltaT.toFixed(1)}°C
              </span>
              {changeAvg != null && changeDelta != null && (
                <>
                  <span className="font-medium text-slate-500">변화</span>
                  <span className={changeAvg <= 0 ? 'font-semibold text-sky-700' : 'font-semibold text-rose-700'}>
                    {changeAvg > 0 ? '+' : ''}
                    {changeAvg.toFixed(1)}°C
                  </span>
                  <span className={changeDelta <= 0 ? 'font-semibold text-sky-700' : 'font-semibold text-rose-700'}>
                    {changeDelta > 0 ? '+' : ''}
                    {changeDelta.toFixed(1)}°C
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div>
            <div className="text-xs text-slate-400">평균 표면온도</div>
            <div className="text-3xl font-bold leading-tight text-slate-900 tabular-nums">
              {avg.toFixed(1)}°C
            </div>
          </div>
          <div
            className={`inline-flex w-fit rounded-lg px-3 py-1.5 text-sm font-bold tabular-nums ${
              cooled ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            기준 대비 {deltaT > 0 ? '+' : ''}
            {deltaT.toFixed(1)}°C
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label={frame ? '기온' : '기준 기온'} value={`${baseTemp.toFixed(1)}°`} />
          <Stat label="최고" value={`${maxTemp.toFixed(1)}°`} />
          <Stat label="최저" value={`${minTemp.toFixed(1)}°`} />
        </div>
        <div className="space-y-2">
          <Bar label="녹지율" value={m.greenRatio} color="#22c55e" />
          <Bar label="수면·습지율" value={m.waterRatio} color="#38bdf8" />
          <Bar label="불투수면율" value={m.imperviousRatio} color="#9ca3af" />
        </div>
        {tileBreakdown.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold text-slate-500">타일 구성</div>
            <div className="flex flex-wrap gap-1.5">
              {tileBreakdown.map((item) => (
                <span
                  key={item.meta.type}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-100 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                  title={`${item.meta.label} ${item.count}칸`}
                >
                  <span>{item.meta.emoji}</span>
                  <span className="font-medium">{item.meta.label}</span>
                  <span className="tabular-nums text-slate-400">
                    {((item.count / totalCells) * 100).toFixed(0)}%
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-sm font-bold text-slate-700">{value}</div>
    </div>
  )
}
