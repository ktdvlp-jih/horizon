import { cn } from '@/lib/utils'

interface Props {
  mode: 'tile' | 'heatmap'
  onChange: (mode: 'tile' | 'heatmap') => void
}

export default function GridViewToggle({ mode, onChange }: Props) {
  return (
    <div
      className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
      role="group"
      aria-label="격자 보기 방식"
    >
      <button
        type="button"
        onClick={() => onChange('tile')}
        className={cn(
          'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
          mode === 'tile' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
        )}
        aria-pressed={mode === 'tile'}
      >
        타일
      </button>
      <button
        type="button"
        onClick={() => onChange('heatmap')}
        className={cn(
          'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
          mode === 'heatmap' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
        )}
        aria-pressed={mode === 'heatmap'}
      >
        히트맵
      </button>
    </div>
  )
}

export function gridViewHint(mode: 'tile' | 'heatmap', animating: boolean): string {
  if (animating) {
    return '재생 중에는 시간대별 온도 히트맵만 표시됩니다. 타일 아이콘은 숨겨집니다.'
  }
  if (mode === 'heatmap') {
    return '히트맵 모드: 온도 색·숫자로 표시됩니다. 「효과」 켜면 더운/시원한 셀에 연출이 추가됩니다.'
  }
  return '타일 모드: 건물·도로 등 설계 타일만 표시됩니다. 온도·냉각 효과는 「히트맵」 또는 「하루 재생」에서 확인하세요.'
}
