import type { SimulationResult } from '@/types'
import type { AnimatedSnapshot } from '@/hooks/useClimateAnimation'
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
  frame?: AnimatedSnapshot | null
}

export default function MetricsPanel({ result, frame = null }: Props) {
  if (!result) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-400">
          타일을 칠하면 실시간으로 온도가 계산됩니다.
        </CardContent>
      </Card>
    )
  }

  const m = result.metrics
  // During playback the frame overrides the live numbers so they animate too.
  const avg = frame ? frame.avgSurfaceTemp : m.avgSurfaceTemp
  const maxTemp = frame ? frame.maxSurfaceTemp : m.maxSurfaceTemp
  const minTemp = frame ? frame.minSurfaceTemp : m.minSurfaceTemp
  const deltaT = frame ? frame.deltaT : m.deltaT
  const baseTemp = frame ? frame.airTemp : m.baseAirTemp
  const cooled = deltaT < 0
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>시뮬레이션 결과</span>
          {frame && (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
              {frame.label}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-slate-400">평균 표면온도</div>
            <div className="text-3xl font-bold text-slate-900 tabular-nums">{avg.toFixed(1)}°C</div>
          </div>
          <div
            className={`rounded-lg px-3 py-1.5 text-sm font-bold tabular-nums ${
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
          <Bar label="수면율" value={m.waterRatio} color="#38bdf8" />
          <Bar label="불투수면율" value={m.imperviousRatio} color="#9ca3af" />
        </div>
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
