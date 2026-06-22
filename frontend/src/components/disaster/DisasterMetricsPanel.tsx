import type { DisasterMetrics, DisasterMode } from '@/types'
import { DISASTER_MODE_LABELS } from '@/lib/disasterTiles'

interface Props {
  mode: DisasterMode
  metrics: DisasterMetrics | null
  loading?: boolean
}

export default function DisasterMetricsPanel({ mode, metrics, loading }: Props) {
  if (loading || !metrics) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-400">
        시뮬레이션 중…
      </div>
    )
  }

  const pct = (v: number) => `${Math.round(v * 100)}%`
  const cells = (n?: number | null) => (n != null ? `${Math.round(n)}칸` : '—')

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">
        {DISASTER_MODE_LABELS[mode]} 위험 지표
      </h3>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <Metric label="위험 영역" value={pct(metrics.affectedRatio)} />
        <Metric label="평균 위험" value={pct(metrics.avgRisk)} />
        <Metric label="최대 위험" value={pct(metrics.maxRisk)} />
        <Metric label="보호·대피" value={pct(metrics.protectedRatio)} />
        {mode === 'typhoon' && (
          <>
            <Metric label="침수 셀" value={cells(metrics.floodCells)} />
            <Metric label="강풍 셀" value={cells(metrics.windHighCells)} />
          </>
        )}
        {mode === 'earthquake' && (
          <>
            <Metric label="붕괴 위험" value={cells(metrics.collapseRiskCells)} />
            <Metric label="대피 커버" value={pct(metrics.evacWithin3MinRatio ?? 0)} />
          </>
        )}
        {mode === 'tsunami' && (
          <>
            <Metric label="침수 셀" value={cells(metrics.inundatedCells)} />
            <Metric label="고지·대피" value={pct(metrics.highGroundCoverage ?? 0)} />
          </>
        )}
      </dl>
      <p className="text-[10px] leading-snug text-slate-400">
        교육용 근사 모델입니다. 실제 재난 예측·피해 산정이 아닙니다.
      </p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold tabular-nums text-slate-800">{value}</dd>
    </div>
  )
}
