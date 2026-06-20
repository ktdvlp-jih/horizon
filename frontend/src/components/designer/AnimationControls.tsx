import { Calendar, Pause, Play, Sparkles, Square, Sun, Wind } from 'lucide-react'
import type { ClimateAnimation } from '@/hooks/useClimateAnimation'
import { Button } from '@/components/ui/button'

const SPEEDS = [0.5, 1, 2]

interface Props {
  anim: ClimateAnimation
  ambient: boolean
  onToggleAmbient: () => void
  particles: boolean
  onToggleParticles: () => void
  date: string
  maxDate: string
  onDateChange: (date: string) => void
}

export default function AnimationControls({
  anim,
  ambient,
  onToggleAmbient,
  particles,
  onToggleParticles,
  date,
  maxDate,
  onDateChange,
}: Props) {
  const { timeline, snapshot, isLoading, isPlaying } = anim
  const lastIndex = timeline ? timeline.frames.length - 1 : 0

  const datePicker = (
    <label className="flex items-center gap-1 text-xs text-slate-500">
      <Calendar className="h-3.5 w-3.5" />
      <input
        type="date"
        value={date}
        max={maxDate}
        onChange={(e) => onDateChange(e.target.value)}
        className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-700"
        aria-label="실측 날짜 선택"
      />
    </label>
  )

  if (!timeline) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="text-xs text-slate-500">
          선택한 날짜의 도시 기후 변화를 재생해 보세요.
        </div>
        <div className="flex items-center gap-2">
          {datePicker}
          <Button size="sm" onClick={anim.load} disabled={isLoading}>
            <Play className="h-4 w-4" />
            {isLoading ? '불러오는 중…' : '하루 재생'}
          </Button>
        </div>
      </div>
    )
  }

  const solarPct = snapshot ? Math.round(snapshot.solarIntensity * 100) : 0

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={anim.toggle} aria-label={isPlaying ? '일시정지' : '재생'}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={anim.stop} aria-label="정지">
          <Square className="h-4 w-4" />
        </Button>

        <input
          type="range"
          min={0}
          max={lastIndex}
          step={0.01}
          value={anim.position}
          onChange={(e) => anim.seek(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-sky-500"
          aria-label="시간대 스크럽"
        />

        <div className="flex min-w-[64px] items-center justify-end gap-1 text-sm font-bold text-slate-800 tabular-nums">
          <Sun className="h-4 w-4 text-amber-500" />
          {snapshot?.label ?? '--:--'}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
              timeline.source === 'observed'
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {timeline.source === 'observed' ? '실측 데이터' : '모델 추정'}
          </span>
          <span className="text-[10px] text-slate-400">
            {timeline.source === 'observed'
              ? `${timeline.date} 시간별 관측(기온·일사) 기반`
              : `${timeline.date} 관측 불완전 · 일주기 모델 기반`}
          </span>
        </div>
        {datePicker}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => anim.setSpeed(s)}
              className={`rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${
                anim.speed === s
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
          <span className="ml-2 text-[11px] text-slate-400">태양 강도 {solarPct}%</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleAmbient}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${
              ambient ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
            aria-pressed={ambient}
          >
            <Sparkles className="h-3.5 w-3.5" /> 효과
          </button>
          <button
            onClick={onToggleParticles}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${
              particles ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
            aria-pressed={particles}
          >
            <Wind className="h-3.5 w-3.5" /> 입자
          </button>
        </div>
      </div>

      {anim.error && <div className="text-[11px] text-rose-500">{anim.error}</div>}
    </div>
  )
}
