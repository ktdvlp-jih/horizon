import { ArrowRight } from 'lucide-react'
import { formatMetricPct } from '@/lib/typhoonBriefing'
import type { DisasterMetrics } from '@/types'

interface Props {
  baseline: DisasterMetrics
  plan: DisasterMetrics
}

function MetricCompare({
  label,
  before,
  after,
  lowerIsBetter = true,
}: {
  label: string
  before: number
  after: number
  lowerIsBetter?: boolean
}) {
  const delta = after - before
  const improved = lowerIsBetter ? delta < -0.005 : delta > 0.005
  const worsened = lowerIsBetter ? delta > 0.005 : delta < -0.005

  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-sm">
        <span className="font-medium tabular-nums text-slate-400">{formatMetricPct(before)}</span>
        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-bold tabular-nums text-slate-800">{formatMetricPct(after)}</span>
        {improved && (
          <span className="text-[10px] font-semibold text-emerald-600">
            ({lowerIsBetter ? '' : '+'}{formatMetricPct(Math.abs(delta))} 개선)
          </span>
        )}
        {worsened && (
          <span className="text-[10px] font-semibold text-rose-600">
            ({formatMetricPct(Math.abs(delta))} 악화)
          </span>
        )}
      </div>
    </div>
  )
}

export default function TyphoonBeforeAfterPanel({ baseline, plan }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800">브리핑 자료 — Before / After</h3>
        <p className="text-[11px] text-slate-500">
          왼쪽은 <strong>무조치(예산 0)</strong>, 오른쪽은 <strong>시장안</strong> 시뮬레이션 결과입니다.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <MetricCompare label="위험 지역 비율" before={baseline.affectedRatio} after={plan.affectedRatio} />
        <MetricCompare
          label="보호·대피 커버"
          before={baseline.protectedRatio}
          after={plan.protectedRatio}
          lowerIsBetter={false}
        />
        <MetricCompare label="평균 위험" before={baseline.avgRisk} after={plan.avgRisk} />
        <MetricCompare label="최대 위험" before={baseline.maxRisk} after={plan.maxRisk} />
      </div>
    </div>
  )
}
