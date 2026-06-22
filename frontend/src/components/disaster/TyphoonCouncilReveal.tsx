import { cn } from '@/lib/utils'
import { COUNCIL_REVEAL_MESSAGES, type CouncilRevealPhase } from '@/lib/typhoonBriefing'
import { Gavel, Loader2, Radio, Zap } from 'lucide-react'

interface Props {
  phase: CouncilRevealPhase
  visible: boolean
}

const PHASE_ORDER: CouncilRevealPhase[] = [
  'submitting',
  'simulating',
  'deliberating',
  'revealed',
]

export default function TyphoonCouncilReveal({ phase, visible }: Props) {
  if (!visible || phase === 'idle') return null

  const activeIndex = PHASE_ORDER.indexOf(phase)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-lg">
      <div className="mb-3 flex items-center gap-2">
        <Radio className="h-4 w-4 animate-pulse text-sky-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-sky-300">
          LIVE · 시의회 진행
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {PHASE_ORDER.map((p, i) => {
          const done = i < activeIndex
          const current = p === phase
          return (
            <div
              key={p}
              className={cn(
                'rounded-lg px-3 py-2 transition-all duration-500',
                current && 'bg-sky-500/20 ring-1 ring-sky-400/60',
                done && 'bg-emerald-500/10 opacity-80',
                !done && !current && 'opacity-40',
              )}
            >
              <div className="flex items-center gap-2">
                {current ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />
                ) : done ? (
                  <Gavel className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Zap className="h-3.5 w-3.5 text-slate-500" />
                )}
                <span className="text-[11px] font-medium">
                  {p === 'submitting' && '제출'}
                  {p === 'simulating' && '시뮬레이션'}
                  {p === 'deliberating' && '표결'}
                  {p === 'revealed' && '공개'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-sm font-medium text-slate-100">{COUNCIL_REVEAL_MESSAGES[phase]}</p>
    </div>
  )
}
