import { cn } from '@/lib/utils'
import type { CouncilVerdict } from '@/lib/typhoonBriefing'
import { Gavel, ThumbsDown, ThumbsUp } from 'lucide-react'

interface Props {
  verdict: CouncilVerdict
}

const OUTCOME_STYLE = {
  approved: {
    ring: 'ring-emerald-200',
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  conditional: {
    ring: 'ring-amber-200',
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-800',
  },
  rejected: {
    ring: 'ring-rose-200',
    bg: 'bg-rose-50',
    icon: 'text-rose-600',
    badge: 'bg-rose-100 text-rose-800',
  },
} as const

export default function TyphoonCouncilVerdict({ verdict }: Props) {
  const style = OUTCOME_STYLE[verdict.outcome]

  return (
    <div className={cn('rounded-xl border p-4 shadow-sm ring-1', style.ring, style.bg)}>
      <div className="flex items-start gap-3">
        <Gavel className={cn('mt-0.5 h-5 w-5 shrink-0', style.icon)} />
        <div className="min-w-0 flex-1">
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', style.badge)}>
            시의회 표결 결과
          </span>
          <h3 className="mt-1 text-base font-bold text-slate-900">{verdict.headline}</h3>
          <p className="mt-1 text-sm text-slate-700">{verdict.summary}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {verdict.praise.length > 0 && (
          <div className="rounded-lg bg-white/80 px-3 py-2">
            <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <ThumbsUp className="h-3.5 w-3.5" /> 시의회 긍정 반응
            </div>
            <ul className="space-y-0.5 text-xs text-slate-600">
              {verdict.praise.map((p, i) => (
                <li key={i}>· {p}</li>
              ))}
            </ul>
          </div>
        )}
        {verdict.concerns.length > 0 && (
          <div className="rounded-lg bg-white/80 px-3 py-2">
            <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
              <ThumbsDown className="h-3.5 w-3.5" /> 지적·보완 요구
            </div>
            <ul className="space-y-0.5 text-xs text-slate-600">
              {verdict.concerns.map((c, i) => (
                <li key={i}>· {c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
