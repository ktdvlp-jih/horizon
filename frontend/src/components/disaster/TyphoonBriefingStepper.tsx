import { cn } from '@/lib/utils'
import { BRIEFING_STEPS, type BriefingStepId } from '@/lib/typhoonBriefing'
import { Check } from 'lucide-react'

interface Props {
  activeStep: BriefingStepId
}

const ORDER: BriefingStepId[] = ['situation', 'planning', 'presentation', 'debrief']

export default function TyphoonBriefingStepper({ activeStep }: Props) {
  const activeIndex = ORDER.indexOf(activeStep)

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-300">
            태풍 대응 — 시장 브리핑
          </p>
          <h2 className="text-sm font-bold">긴급 재난 대응 의사결정 시뮬레이션</h2>
        </div>
        <span className="shrink-0 rounded-full bg-rose-500/20 px-2.5 py-1 text-[10px] font-bold text-rose-200 ring-1 ring-rose-400/40">
          D-1
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {BRIEFING_STEPS.map((step, i) => {
          const done = i < activeIndex
          const current = step.id === activeStep
          return (
            <div
              key={step.id}
              className={cn(
                'rounded-lg px-2.5 py-2 transition-colors',
                current && 'bg-white/15 ring-1 ring-sky-400/50',
                done && !current && 'bg-white/5',
                !done && !current && 'opacity-50',
              )}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                    done ? 'bg-emerald-500 text-white' : current ? 'bg-sky-400 text-slate-900' : 'bg-white/20',
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="text-xs font-semibold">{step.label}</span>
              </div>
              <p className="mt-0.5 pl-6 text-[10px] text-slate-300">{step.subtitle}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
