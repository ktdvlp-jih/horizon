import { AlertTriangle, Megaphone } from 'lucide-react'
import { buildSituationBriefing } from '@/lib/typhoonBriefing'
import type { ScenarioSummary } from '@/types'
import { Button } from '@/components/ui/button'

interface Props {
  regionName: string
  scenario?: ScenarioSummary | null
  onStartPlanning: () => void
}

export default function TyphoonSituationBrief({ regionName, scenario, onStartPlanning }: Props) {
  const brief = buildSituationBriefing(regionName, scenario)

  return (
    <div className="overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm">
      <div className="flex items-start gap-3 border-b border-amber-200/80 bg-amber-100/60 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-amber-800">{brief.urgency}</p>
          <h3 className="text-base font-bold text-amber-950">{brief.title}</h3>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <ul className="space-y-2">
          {brief.bullets.map((line, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug text-amber-950/90">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              {line}
            </li>
          ))}
        </ul>

        <div className="rounded-lg border border-amber-200/80 bg-white/70 px-3 py-2.5 text-xs text-amber-900">
          <span className="font-semibold">당신의 역할:</span> {regionName} 시장. 시의회에 제출할{' '}
          <strong>긴급 방어 계획</strong>을 수립하고, 시뮬레이션 결과로 설득해야 합니다.
        </div>

        <Button className="w-full gap-2 sm:w-auto" onClick={onStartPlanning}>
          <Megaphone className="h-4 w-4" />
          방어 계획 수립 시작
        </Button>
      </div>
    </div>
  )
}
