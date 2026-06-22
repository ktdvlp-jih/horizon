import { cn } from '@/lib/utils'
import { COUNCIL_QUESTIONS } from '@/lib/typhoonBriefing'
import {
  DEFENSE_COST_LABELS,
  TYPHOON_BUDGET_MAX,
  TYPHOON_ZONE_HINTS,
  TYPHOON_ZONE_LABELS,
  TYPHOON_ZONE_ORDER,
  type DefenseLevel,
  type TyphoonPlan,
  type TyphoonZoneDefense,
  type TyphoonZoneId,
  setZoneDefense,
  typhoonPlanBudgetRemaining,
  typhoonPlanBudgetUsed,
} from '@/lib/typhoonZones'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Minus, Plus, RotateCcw } from 'lucide-react'

interface Props {
  plan: TyphoonPlan
  onChange: (plan: TyphoonPlan) => void
  onReset: () => void
  briefingMode?: boolean
}

const DEFENSE_KEYS = ['drain', 'seawall', 'shelter', 'greenBuffer'] as const

export default function TyphoonZonePlanner({ plan, onChange, onReset, briefingMode }: Props) {
  const used = typhoonPlanBudgetUsed(plan)
  const remaining = typhoonPlanBudgetRemaining(plan)

  const adjust = (zoneId: TyphoonZoneId, key: keyof TyphoonZoneDefense, delta: number) => {
    const current = plan.zones[zoneId][key]
    const next = Math.min(3, Math.max(0, current + delta)) as DefenseLevel
    if (next === current) return
    const updated = setZoneDefense(plan, zoneId, key, next)
    if (updated) onChange(updated)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">
            {briefingMode ? '긴급 방어 예산 배분' : '구역 방어 계획'}
          </CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            {briefingMode
              ? '시의회에 설명할 근거를 만들며, 72pt 예산을 구역별로 배분하세요.'
              : '예산 안에서 구역별 배수·방조제·대피·녹지를 배분하세요.'}
          </p>
        </div>
        <Button size="sm" variant="ghost" className="h-8 shrink-0" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">
              {briefingMode ? '긴급 방어 예산' : '방어 예산'}
            </span>
            <span className="tabular-nums text-slate-600">
              {used} / {TYPHOON_BUDGET_MAX} pt
              <span className="ml-2 text-sky-600">잔여 {remaining}</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                used > TYPHOON_BUDGET_MAX * 0.9 ? 'bg-amber-500' : 'bg-sky-500',
              )}
              style={{ width: `${Math.min(100, (used / TYPHOON_BUDGET_MAX) * 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {TYPHOON_ZONE_ORDER.map((zoneId) => (
            <ZoneCard
              key={zoneId}
              zoneId={zoneId}
              defense={plan.zones[zoneId]}
              councilQuestion={briefingMode ? COUNCIL_QUESTIONS[zoneId] : undefined}
              onAdjust={(key, delta) => adjust(zoneId, key, delta)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ZoneCard({
  zoneId,
  defense,
  councilQuestion,
  onAdjust,
}: {
  zoneId: TyphoonZoneId
  defense: TyphoonZoneDefense
  councilQuestion?: string
  onAdjust: (key: keyof TyphoonZoneDefense, delta: number) => void
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-2.5">
      <div className="mb-2">
        <div className="text-sm font-semibold text-slate-800">{TYPHOON_ZONE_LABELS[zoneId]}</div>
        <div className="text-[11px] text-slate-500">{TYPHOON_ZONE_HINTS[zoneId]}</div>
        {councilQuestion && (
          <p className="mt-1.5 rounded-md bg-violet-50 px-2 py-1 text-[10px] leading-snug text-violet-800">
            💬 {councilQuestion}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {DEFENSE_KEYS.map((key) => (
          <DefenseStepper
            key={key}
            label={DEFENSE_COST_LABELS[key]}
            level={defense[key]}
            onMinus={() => onAdjust(key, -1)}
            onPlus={() => onAdjust(key, 1)}
          />
        ))}
      </div>
    </div>
  )
}

function DefenseStepper({
  label,
  level,
  onMinus,
  onPlus,
}: {
  label: string
  level: DefenseLevel
  onMinus: () => void
  onPlus: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-1 rounded-md bg-slate-50 px-2 py-1">
      <span className="text-[11px] text-slate-600">{label}</span>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className="rounded p-0.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
          onClick={onMinus}
          disabled={level <= 0}
          aria-label={`${label} 감소`}
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-4 text-center text-xs font-bold tabular-nums">{level}</span>
        <button
          type="button"
          className="rounded p-0.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
          onClick={onPlus}
          disabled={level >= 3}
          aria-label={`${label} 증가`}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
