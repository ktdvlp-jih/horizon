import { Link } from 'react-router-dom'
import { LogIn, MapPin, Save, Thermometer } from 'lucide-react'
import type { RegionWeather } from '@/types'
import ClimateDataStrip from '@/components/designer/ClimateDataStrip'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import LoadDesignButton from '@/components/designer/LoadDesignButton'

interface Props {
  description?: string
  regions: RegionWeather[]
  regionCode: string
  onRegionChange: (code: string) => void
  isAuthenticated: boolean
  designId?: number | null
  designName: string
  onDesignNameChange: (name: string) => void
  onLoadDesign: (id: number) => void
  onNewDesign: () => void
  onSave: () => void
  savePending?: boolean
}

function RowLabel({ children }: { children: string }) {
  return (
    <span className="w-[3.25rem] shrink-0 text-right text-[11px] font-medium text-slate-400">
      {children}
    </span>
  )
}

export default function DesignerHeaderBar({
  description,
  regions,
  regionCode,
  onRegionChange,
  isAuthenticated,
  designId,
  designName,
  onDesignNameChange,
  onLoadDesign,
  onNewDesign,
  onSave,
  savePending = false,
}: Props) {
  const active = regions.find((r) => r.code === regionCode)

  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch">
        {/* 지역 · 기온 */}
        <div
          className="flex min-w-0 flex-col justify-center gap-2 px-4 py-3"
          data-tutorial="region"
        >
          {description && (
            <p className="truncate text-xs leading-snug text-slate-500" title={description}>
              {description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {regions.length > 0 && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-500" aria-hidden />
              <select
                value={regionCode}
                onChange={(e) => onRegionChange(e.target.value)}
                aria-label="지역 선택"
                className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {regions.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {active && (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Thermometer className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
              <span className="whitespace-nowrap tabular-nums font-semibold">
                {active.baseAirTemp.toFixed(1)}°C
              </span>
              <span
                className={cn(
                  'whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none',
                  active.source === 'kma'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700',
                )}
                title={
                  active.source === 'kma'
                    ? '기상청 실시간 데이터'
                    : '내장 샘플 데이터 (API 키 미설정)'
                }
              >
                {active.source === 'kma' ? '실시간' : '샘플'}
              </span>
            </div>
          )}
          </div>
          {active?.climate && <ClimateDataStrip climate={active.climate} className="mt-1" />}
        </div>

        {/* 설계 관리 — 2행 */}
        <div
          className="flex w-[15.5rem] shrink-0 flex-col justify-center gap-1.5 border-l border-slate-100 bg-slate-50/80 px-3 py-2.5 lg:w-[17rem]"
          data-tutorial="save"
        >
          <div className="flex items-center gap-2">
            <RowLabel>불러오기</RowLabel>
            {isAuthenticated ? (
              <LoadDesignButton
                currentDesignId={designId}
                onSelect={onLoadDesign}
                onNewDesign={onNewDesign}
                showEmpty
                variant="select-only"
              />
            ) : (
              <Link to="/login" state={{ from: '/designer' }} className="min-w-0 flex-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-full gap-1.5 bg-white text-xs"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  로그인 후 불러오기
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            <RowLabel>저장</RowLabel>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <input
                type="text"
                value={designName}
                onChange={(e) => onDesignNameChange(e.target.value)}
                placeholder="설계 이름"
                disabled={!isAuthenticated}
                aria-label="설계 이름"
                className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none ring-sky-500 focus:ring-2 disabled:bg-slate-100 disabled:text-slate-400"
              />
              {isAuthenticated ? (
                <Button
                  size="sm"
                  className="h-8 shrink-0 gap-1 px-2.5 text-xs"
                  onClick={onSave}
                  disabled={savePending || !regionCode}
                >
                  <Save className="h-3.5 w-3.5" />
                  {savePending ? '…' : '저장'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 gap-1 bg-white px-2.5 text-xs"
                  disabled
                  title="로그인 후 저장할 수 있습니다"
                >
                  <Save className="h-3.5 w-3.5" />
                  저장
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
