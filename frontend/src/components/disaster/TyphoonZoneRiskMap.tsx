import { riskToColor } from '@/lib/tiles'
import { cn } from '@/lib/utils'
import {
  TYPHOON_ZONE_LABELS,
  TYPHOON_ZONE_ORDER,
  type TyphoonZoneId,
} from '@/lib/typhoonZones'

interface Props {
  zoneRisks: Record<TyphoonZoneId, number>
  globalMin?: number
  globalMax?: number
  loading?: boolean
  timelineLabel?: string
  emptyHint?: string
  animateBars?: boolean
}

export default function TyphoonZoneRiskMap({
  zoneRisks,
  globalMin = 0,
  globalMax = 1,
  loading,
  timelineLabel,
  emptyHint,
  animateBars,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">구역별 위험도</h3>
        {timelineLabel && (
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
            {timelineLabel}
          </span>
        )}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">시뮬레이션 중…</p>
      ) : emptyHint && Object.values(zoneRisks).every((v) => v === 0) ? (
        <p className="py-8 text-center text-sm text-slate-400">{emptyHint}</p>
      ) : (
        <div className="space-y-2">
          {TYPHOON_ZONE_ORDER.map((id) => {
            const risk = zoneRisks[id]
            const pct = Math.round(risk * 100)
            return (
              <div key={id} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-right text-xs font-medium text-slate-600">
                  {TYPHOON_ZONE_LABELS[id]}
                </span>
                <div className="relative h-10 min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-100">
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 bg-sky-500/20 transition-all',
                      animateBars ? 'duration-700 ease-out' : 'duration-300',
                    )}
                    style={{
                      width: `${Math.max(4, pct)}%`,
                      backgroundColor: riskToColor(risk, globalMin, globalMax),
                    }}
                  />
                  <span className="relative flex h-full items-center justify-end pr-2 text-xs font-semibold tabular-nums text-slate-800">
                    {pct}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-3 text-[10px] leading-snug text-slate-400">
        해안에서 내륙으로 위험을 비교하세요. 녹색·낮을수록 안전, 붉을수록 위험합니다.
      </p>
    </div>
  )
}
