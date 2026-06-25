import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface DemoStepMeta {
  title: string
  narration: string
  api?: string
}

interface Props {
  steps: DemoStepMeta[]
  step: number
  playing: boolean
  onPlayToggle: () => void
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}

/** Narrated, auto-advancing tour banner pinned to the bottom of the designer. */
export default function GuidedDemo({
  steps,
  step,
  playing,
  onPlayToggle,
  onPrev,
  onNext,
  onClose,
}: Props) {
  const current = steps[step]
  const isLast = step === steps.length - 1
  if (!current) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 sm:pb-4">
      <div className="pointer-events-auto w-full max-w-2xl rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold text-white">
            가이드 투어
          </span>
          <span className="text-[11px] tabular-nums text-slate-400">
            {step + 1} / {steps.length}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              aria-label="투어 닫기"
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800">{current.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{current.narration}</p>
            {current.api && (
              <p className="mt-1 truncate font-mono text-[10px] text-sky-600" title={current.api}>
                {current.api}
              </p>
            )}
          </div>
        </div>

        {/* progress dots */}
        <div className="mt-2.5 flex items-center gap-1.5">
          {steps.map((s, i) => (
            <span
              key={s.title}
              className={cn(
                'h-1.5 flex-1 rounded-full transition',
                i < step ? 'bg-sky-300' : i === step ? 'bg-sky-600' : 'bg-slate-200',
              )}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2.5 text-xs"
            disabled={step === 0}
            onClick={onPrev}
          >
            <ChevronLeft className="h-4 w-4" /> 이전
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1 px-3 text-xs"
            onClick={onPlayToggle}
          >
            {playing ? (
              <>
                <Pause className="h-4 w-4" /> 일시정지
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> {isLast ? '다시 재생' : '자동 재생'}
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2.5 text-xs"
            disabled={isLast}
            onClick={onNext}
          >
            다음 <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
