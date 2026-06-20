import { useCallback, useEffect, useState } from 'react'
import { CircleHelp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HeatmapGuideButton() {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="히트맵 색상 안내"
        title="히트맵 색상 안내"
      >
        <CircleHelp className="h-4 w-4" />
        <span className="hidden sm:inline">색상 안내</span>
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
          onClick={close}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="heatmap-guide-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="heatmap-guide-title" className="text-lg font-bold text-slate-900">
                  히트맵 색상은 어떻게 정해지나요?
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  절대 온도가 아니라, <strong className="font-semibold text-slate-700">현재 화면 기준 상대값</strong>
                  으로 표시됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              className="mb-4 h-3 w-full rounded-full"
              style={{
                background: 'linear-gradient(to right, hsl(220,85%,58%), hsl(110,85%,52%), hsl(0,85%,46%))',
              }}
              aria-hidden
            />
            <div className="mb-4 flex justify-between text-xs text-slate-500">
              <span>가장 시원 (min)</span>
              <span>중간</span>
              <span>가장 더움 (max)</span>
            </div>

            <ul className="space-y-3 text-sm text-slate-600">
              <li className="rounded-lg bg-sky-50 px-3 py-2">
                <span className="font-semibold text-sky-800">실시간 설계</span>
                <br />
                지금 격자의 <strong>가장 낮은 셀 = 파랑</strong>,{' '}
                <strong>가장 높은 셀 = 빨강</strong>입니다. 타일을 바꾸면 min/max도
                함께 바뀝니다.
              </li>
              <li className="rounded-lg bg-amber-50 px-3 py-2">
                <span className="font-semibold text-amber-900">하루 재생</span>
                <br />
                그날 6시~20시 <strong>전체 구간의 최저·최고</strong>로 색 범위를 고정합니다.
                시간이 바뀌어도 색 기준이 튀지 않습니다.
              </li>
              <li className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600">
                예: 격자 온도가 20~24°C이면 20°C는 파랑 쪽, 24°C는 빨강 쪽입니다.
                온도 차이가 작으면(예: 22~23°C) 작은 차이도 색 대비가 크게 보일 수
                있습니다.
              </li>
            </ul>

            <p className="mt-4 text-xs text-slate-400">
              숫자 온도(°C)는 각 셀 위에 표시됩니다. 색은 비교용, 숫자는 실제 값입니다.
            </p>

            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={close}>
                확인
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
