import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  playing: boolean
  onToggle: () => void
  onReload: () => void
  loading?: boolean
  label?: string
  hasFrames?: boolean
  hint?: string
}

export default function DisasterAnimationControls({
  playing,
  onToggle,
  onReload,
  loading,
  label,
  hasFrames,
  hint,
}: Props) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1"
          onClick={onToggle}
          disabled={loading || !hasFrames}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? '일시정지' : '재생'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1"
          onClick={onReload}
          disabled={loading || !hasFrames}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          다시 로드
        </Button>
        {label && hasFrames && <span className="text-xs text-slate-500">{label}</span>}
        {loading && <span className="text-xs text-slate-400">타임라인 로드 중…</span>}
      </div>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}
