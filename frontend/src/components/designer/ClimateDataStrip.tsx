import type { ClimateContext } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  climate?: ClimateContext
  className?: string
}

function StatusDot({ live }: { live?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'h-1.5 w-1.5 shrink-0 rounded-full',
        live ? 'bg-emerald-500' : 'border border-slate-300 bg-transparent',
      )}
    />
  )
}

function Chip({
  label,
  value,
  live,
  title,
  axis,
}: {
  label: string
  value: string
  live?: boolean
  title?: string
  /** Resilience axis this feed actually drives (shown as a muted suffix). */
  axis?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium tabular-nums whitespace-nowrap',
        live
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-slate-200 bg-slate-50 text-slate-600',
      )}
      title={`${title ?? ''}${title ? ' · ' : ''}${live ? '실시간(기상청 API허브)' : '근사 baseline (라이브 미연동)'}`}
    >
      <StatusDot live={live} />
      <span className="text-slate-500">{label}</span>
      <span>{value}</span>
      {axis && <span className="text-emerald-600/70">→{axis}</span>}
    </span>
  )
}

function Legend() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] text-slate-400">
      <span className="font-semibold text-slate-500">기상청</span>
      <span className="inline-flex items-center gap-0.5">
        <StatusDot live /> 실시간
      </span>
      <span className="inline-flex items-center gap-0.5">
        <StatusDot /> 근사
      </span>
    </span>
  )
}

export default function ClimateDataStrip({ climate, className }: Props) {
  if (!climate) return null

  const pm10Live = climate.pm10Source === 'kma' && climate.pm10 != null
  const hasAny =
    climate.pm10 != null ||
    climate.rainfallMm != null ||
    climate.normalTempC != null ||
    climate.uvIndex != null ||
    climate.airStagnationIndex != null ||
    climate.sensibleTempC != null ||
    climate.typhoons.length > 0 ||
    climate.earthquakeAlerts.length > 0

  if (!hasAny) return null

  return (
    <div
      className={cn('flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5', className)}
      aria-label="기상청 실시간 기후 데이터"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <Legend />
      {climate.pm10 != null && (
        <Chip
          label="PM10"
          value={`${climate.pm10.toFixed(0)}µg/m³`}
          live={pm10Live}
          axis="미세먼지"
          title="기상청 API허브 황사(PM10) 관측"
        />
      )}
      {climate.rainfallMm != null && (
        <Chip
          label="강수"
          value={`${climate.rainfallMm.toFixed(1)}mm`}
          live={climate.rainfallSource === 'kma'}
          axis="농어업"
          title="ASOS 시간강수"
        />
      )}
      {climate.normalTempC != null && (
        <Chip
          label="평년"
          value={`${climate.normalTempC.toFixed(1)}°C`}
          live={climate.normalSource === 'kma'}
          axis="농어업"
          title="sun_sfc_norm 평년 기온"
        />
      )}
      {climate.uvIndex != null && (
        <Chip
          label="자외선"
          value={`${climate.uvIndex}`}
          live={climate.uvSource === 'kma'}
          axis="열섬"
          title="생활기상 자외선지수"
        />
      )}
      {climate.airStagnationIndex != null && (
        <Chip
          label="정체"
          value={`${climate.airStagnationIndex}`}
          live={climate.airStagnationSource === 'kma'}
          axis="미세먼지"
          title="대기정체지수"
        />
      )}
      {climate.sensibleTempC != null && (
        <Chip
          label="체감"
          value={`${climate.sensibleTempC.toFixed(1)}°C`}
          live={climate.sensibleTempSource === 'kma'}
          axis="열섬"
          title="여름 체감온도 (SenTa, 발표 시에만 표시)"
        />
      )}
      {climate.typhoons.length > 0 && (
        <Chip
          label="태풍"
          value={`${climate.typhoons.length}건`}
          live
          axis="재난"
          title="기상청 태풍 목록 (typ_lst)"
        />
      )}
      {climate.earthquakeAlerts.length > 0 && (
        <Chip
          label="지진"
          value={`${climate.earthquakeAlerts.length}건`}
          live
          axis="재난"
          title="지진·지진해일 통보 (eqk_now)"
        />
      )}
    </div>
  )
}
