import type { RegionWeather } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  regions: RegionWeather[]
  value: string
  onChange: (code: string) => void
}

export default function RegionSelector({ regions, value, onChange }: Props) {
  const active = regions.find((r) => r.code === value)
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      <div className="flex items-center gap-2">
        <label className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
          지역
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 min-w-[7rem] rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      {active && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span className="tabular-nums">기준 기온 {active.baseAirTemp.toFixed(1)}°C</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
              active.source === 'kma'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700',
            )}
            title={active.source === 'kma' ? '기상청 실시간 데이터' : '내장 샘플 데이터 (API 키 미설정)'}
          >
            {active.source === 'kma' ? '실시간' : '샘플'}
          </span>
        </div>
      )}
    </div>
  )
}
