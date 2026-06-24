import type { ClimateContext } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  climate?: ClimateContext
  className?: string
}

function Chip({
  label,
  value,
  live,
  title,
}: {
  label: string
  value: string
  live?: boolean
  title?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
        live
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-slate-200 bg-slate-50 text-slate-600',
      )}
      title={title}
    >
      <span className="text-slate-500">{label}</span>
      <span>{value}</span>
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
      className={cn('flex flex-wrap items-center gap-1.5', className)}
      aria-label="기상청 실시간 기후 데이터"
    >
      {climate.pm10 != null && (
        <Chip
          label="PM10"
          value={`${climate.pm10.toFixed(0)}µg/m³`}
          live={pm10Live}
          title={
            pm10Live
              ? '기상청 API허브 황사(PM10) 관측'
              : '교육용 PM baseline (라이브 미연동)'
          }
        />
      )}
      {climate.rainfallMm != null && (
        <Chip
          label="강수"
          value={`${climate.rainfallMm.toFixed(1)}mm`}
          live={climate.rainfallSource === 'kma'}
          title="ASOS 시간강수"
        />
      )}
      {climate.normalTempC != null && (
        <Chip
          label="평년"
          value={`${climate.normalTempC.toFixed(1)}°C`}
          live={climate.normalSource === 'kma'}
          title="sun_sfc_norm 평년 기온"
        />
      )}
      {climate.uvIndex != null && (
        <Chip
          label="자외선"
          value={`${climate.uvIndex}`}
          live={climate.uvSource === 'kma'}
          title="생활기상 자외선지수"
        />
      )}
      {climate.airStagnationIndex != null && (
        <Chip
          label="정체"
          value={`${climate.airStagnationIndex}`}
          live={climate.airStagnationSource === 'kma'}
          title="대기정체지수"
        />
      )}
      {climate.sensibleTempC != null && (
        <Chip
          label="체감"
          value={`${climate.sensibleTempC.toFixed(1)}°C`}
          live={climate.sensibleTempSource === 'kma'}
          title="여름 체감온도 (SenTa, 발표 시에만 표시)"
        />
      )}
      {climate.typhoons.length > 0 && (
        <Chip
          label="태풍"
          value={`${climate.typhoons.length}건`}
          live
          title="기상청 태풍 목록 (typ_lst)"
        />
      )}
      {climate.earthquakeAlerts.length > 0 && (
        <Chip
          label="지진"
          value={`${climate.earthquakeAlerts.length}건`}
          live
          title="지진·지진해일 통보 (eqk_now)"
        />
      )}
      <span
        className="hidden text-[10px] text-slate-400 sm:inline"
        title="data.kma.go.kr / apihub.kma.go.kr"
      >
        KMA
      </span>
    </div>
  )
}
