import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Target } from 'lucide-react'
import type { ChallengeConfig, DesignMetrics } from '@/types'
import { formatChallengeReveal } from '@/lib/challengeRules'

interface Props {
  challenges: ChallengeConfig[]
  completedIds: Set<string>
  completedMetrics?: Record<string, DesignMetrics>
  formatReveal?: (challenge: ChallengeConfig, metrics?: DesignMetrics) => string
}

export default function ChallengePanel({
  challenges,
  completedIds,
  completedMetrics = {},
  formatReveal = formatChallengeReveal,
}: Props) {
  const [open, setOpen] = useState(false)
  const doneCount = challenges.filter((c) => completedIds.has(c.id)).length
  const next = challenges.find((c) => !completedIds.has(c.id))

  if (challenges.length === 0) return null

  return (
    <div className="rounded-xl border border-sky-100 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-sky-50/50"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-sky-900">
            <Target className="h-4 w-4 shrink-0 text-sky-600" />
            도전과제
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
              {doneCount}/{challenges.length}
            </span>
          </div>
          {!open && next && (
            <span className="truncate text-xs text-slate-500">
              다음: {next.title}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {open && (
        <>
          {next && (
            <div className="border-t border-sky-50 bg-sky-50/80 px-4 py-2.5 text-xs text-sky-900">
              <p className="font-semibold">{next.title}</p>
              <p className="mt-0.5 leading-relaxed text-sky-800/90">{next.description}</p>
              <p className="mt-2 text-[11px] text-sky-700/80">
                설계가 만족스러우면 아래 「하루 재생」을 눌러 달성 여부를 확인하세요.
              </p>
            </div>
          )}

          <ul className="max-h-72 space-y-1 overflow-y-auto border-t border-slate-100 px-2 py-2">
            {challenges.map((c) => {
              const done = completedIds.has(c.id)
              return (
                <li
                  key={c.id}
                  className={`rounded-lg px-2 py-2 text-xs ${
                    done ? 'bg-emerald-50 text-emerald-900' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {done ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{c.title}</div>
                      {done ? (
                        <p className="mt-0.5 text-emerald-800/90">
                          {formatReveal(c, completedMetrics[c.id])}
                        </p>
                      ) : (
                        <p className="mt-0.5 leading-relaxed text-slate-500">{c.description}</p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
