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
                  격자 보기 &amp; 히트맵 색상
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  <strong className="font-semibold text-slate-700">타일</strong> 모드는 건물·도로 아이콘을,
                  <strong className="font-semibold text-slate-700"> 히트맵</strong> 모드는 온도 색·숫자를 보여
                  줍니다. 둘 중 하나만 표시됩니다.
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
              <li className="rounded-lg bg-emerald-50 px-3 py-2">
                <span className="font-semibold text-emerald-800">타일 모드 (기본)</span>
                <br />
                설계한 건물·도로·공원 등 <strong>타일 아이콘</strong>을 확인합니다. 처음에는 이
                모드로 시작합니다.
              </li>
              <li className="rounded-lg bg-rose-50 px-3 py-2">
                <span className="font-semibold text-rose-800">히트맵 모드</span>
                <br />
                온도에 따라 <strong>파랑(시원) → 빨강(더움)</strong> 색과 숫자(°C)로 표시합니다.
                타일 아이콘은 숨겨집니다.
              </li>
              <li className="rounded-lg bg-violet-50 px-3 py-2">
                <span className="font-semibold text-violet-800">「효과」 연출</span>
                <br />
                히트맵·하루 재생에서만 표시됩니다. <strong>도로·건물</strong> 등 뜨거운 타일은
                붉은 펄스, <strong>공원·수변·습지</strong>는 푸른 연출입니다. 타일 모드에서는
                격자 아이콘만 보입니다.
              </li>
              <li className="rounded-lg bg-sky-50 px-3 py-2">
                <span className="font-semibold text-sky-800">히트맵 색 기준</span>
                <br />
                절대 온도가 아니라 <strong>현재 격자의 최저~최고</strong> 상대값입니다. 타일
                구성을 바꾸면 색 범위도 함께 바뀝니다.
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
