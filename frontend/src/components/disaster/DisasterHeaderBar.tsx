import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { DISASTER_DESCRIPTION, DISASTER_MODE_LABELS } from '@/lib/disasterTiles'
import type { DisasterMode, RegionWeather, ScenarioSummary } from '@/types'
import { LogIn, MapPin, Save, Thermometer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import LoadDisasterDesignSelect from '@/components/disaster/LoadDisasterDesignSelect'

interface Props {
  mode: DisasterMode
  onModeChange: (mode: DisasterMode) => void
  description?: string
  regions: RegionWeather[]
  regionCode: string
  regionFallbackName?: string
  regionsLoading?: boolean
  regionsError?: boolean
  onRegionChange: (code: string) => void
  scenarios: ScenarioSummary[]
  scenarioId: string
  onScenarioChange: (id: string) => void
  isAuthenticated: boolean
  designId?: number | null
  designName: string
  onDesignNameChange: (name: string) => void
  onLoadDesign: (id: number) => void
  onNewDesign: () => void
  onSave: () => void
  savePending?: boolean
  canSave?: boolean
  saveLabel?: string
  scenariosLoading?: boolean
  scenariosError?: string | null
  onRetryScenarios?: () => void
}

const MODES: DisasterMode[] = ['typhoon', 'earthquake', 'tsunami']

function RowLabel({ children }: { children: string }) {
  return (
    <span className="w-[3.25rem] shrink-0 text-right text-[11px] font-medium text-slate-400">
      {children}
    </span>
  )
}

export default function DisasterHeaderBar({
  mode,
  onModeChange,
  description = DISASTER_DESCRIPTION,
  regions,
  regionCode,
  regionFallbackName,
  regionsLoading = false,
  regionsError = false,
  onRegionChange,
  scenarios,
  scenarioId,
  onScenarioChange,
  isAuthenticated,
  designId,
  designName,
  onDesignNameChange,
  onLoadDesign,
  onNewDesign,
  onSave,
  savePending = false,
  canSave = true,
  saveLabel = '저장',
  scenariosLoading = false,
  scenariosError = null,
  onRetryScenarios,
}: Props) {
  const active = regions.find((r) => r.code === regionCode)
  const regionLabel = active?.name ?? regionFallbackName ?? regionCode
  const showRegionSelect = regions.length > 0
  const showRegionBadge = !showRegionSelect && !!regionLabel
  const modeHint =
    mode === 'typhoon'
      ? '태풍 D-1 긴급 시의회 — 시장으로서 방어 계획을 수립하고 시의회에 제출·설득하세요.'
      : description

  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="border-b border-slate-100 px-4 py-2">
        <p className="text-xs text-slate-500">{modeHint}</p>
        <div className="mt-2 flex gap-1">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                mode === m ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {DISASTER_MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch">
        <div className="flex min-w-0 flex-col justify-center gap-2 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {showRegionSelect && (
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

            {showRegionBadge && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-500" aria-hidden />
                <span
                  className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-800"
                  title="선택한 시나리오에 연결된 지역"
                >
                  {regionLabel}
                </span>
              </div>
            )}

            {regionsLoading && !regionLabel && (
              <span className="text-[11px] text-slate-400">지역 불러오는 중…</span>
            )}

            {regionsError && !regionLabel && (
              <span className="text-[11px] text-rose-600">지역 목록을 불러오지 못했습니다</span>
            )}

            {active && (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Thermometer className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                <span className="whitespace-nowrap tabular-nums font-semibold">
                  {active.baseAirTemp.toFixed(1)}°C
                </span>
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 text-xs text-slate-400">시나리오</span>
                <select
                  value={scenarioId}
                  onChange={(e) => onScenarioChange(e.target.value)}
                  aria-label="시나리오 선택"
                  disabled={scenariosLoading || !!scenariosError || scenarios.length === 0}
                  className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {scenarios.length === 0 && <option value="">시나리오 없음</option>}
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
              {scenariosLoading && (
                <p className="text-[11px] text-slate-400">시나리오 불러오는 중…</p>
              )}
              {scenariosError && (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] text-rose-600">{scenariosError}</p>
                  {onRetryScenarios && (
                    <button
                      type="button"
                      className="text-[11px] font-medium text-sky-600 underline"
                      onClick={onRetryScenarios}
                    >
                      다시 시도
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="flex w-[15.5rem] shrink-0 flex-col justify-center gap-1.5 border-l border-slate-100 bg-slate-50/80 px-3 py-2.5 lg:w-[17rem]"
          data-tutorial="save"
        >
          <div className="flex items-center gap-2">
            <RowLabel>불러오기</RowLabel>
            {isAuthenticated ? (
              <LoadDisasterDesignSelect
                mode={mode}
                currentDesignId={designId}
                onSelect={onLoadDesign}
                onNewDesign={onNewDesign}
              />
            ) : (
              <Link to="/login" state={{ from: '/disaster' }} className="min-w-0 flex-1">
                <Button size="sm" variant="outline" className="h-8 w-full gap-1.5 bg-white text-xs">
                  <LogIn className="h-3.5 w-3.5" />
                  로그인 후 불러오기
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            <RowLabel>{saveLabel}</RowLabel>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <input
                type="text"
                value={designName}
                onChange={(e) => onDesignNameChange(e.target.value)}
                placeholder={mode === 'typhoon' ? '계획 이름' : '설계 이름'}
                disabled={!isAuthenticated}
                aria-label="계획 이름"
                className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none ring-sky-500 focus:ring-2 disabled:bg-slate-100 disabled:text-slate-400"
              />
              {isAuthenticated ? (
                <Button
                  size="sm"
                  className="h-8 shrink-0 gap-1 px-2.5 text-xs"
                  onClick={onSave}
                  disabled={savePending || !canSave || !regionCode}
                >
                  <Save className="h-3.5 w-3.5" />
                  {savePending ? '…' : saveLabel}
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
                  {saveLabel}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
