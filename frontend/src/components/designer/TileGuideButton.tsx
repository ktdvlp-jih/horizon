import { useCallback, useEffect, useState } from 'react'
import { CircleHelp, X } from 'lucide-react'
import { TILES } from '@/lib/tiles'
import { Button } from '@/components/ui/button'

export default function TileGuideButton() {
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label="타일 종류 안내"
        title="타일 종류 안내"
      >
        <CircleHelp className="h-4 w-4" />
      </button>

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
            aria-labelledby="tile-guide-title"
            className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="tile-guide-title" className="text-lg font-bold text-slate-900">
                  타일 종류 안내
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  각 타일의 열섬·냉각 특성입니다. 팔레트에서 타일을 고른 뒤 격자에 칠하세요.
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

            <ul className="space-y-2">
              {TILES.map((tile) => (
                <li
                  key={tile.type}
                  className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
                    style={{ backgroundColor: tile.swatch }}
                  >
                    {tile.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{tile.label}</p>
                    <p className="text-sm leading-snug text-slate-600">{tile.hint}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/80 px-3 py-2.5 text-sm text-sky-900">
              <p className="font-semibold">실수했을 때</p>
              <p className="mt-1 leading-relaxed text-sky-800/90">
                팔레트 아래 <strong>실행 취소</strong>·<strong>다시 실행</strong>으로 방금 칠한 타일을
                되돌릴 수 있습니다. 단축키{' '}
                <kbd className="rounded border border-sky-200 bg-white px-1.5 py-0.5 text-xs font-medium text-sky-900">
                  Ctrl+Z
                </kbd>
                {' / '}
                <kbd className="rounded border border-sky-200 bg-white px-1.5 py-0.5 text-xs font-medium text-sky-900">
                  Ctrl+Y
                </kbd>
                (Mac:{' '}
                <kbd className="rounded border border-sky-200 bg-white px-1.5 py-0.5 text-xs font-medium text-sky-900">
                  ⌘Z
                </kbd>
                {' / '}
                <kbd className="rounded border border-sky-200 bg-white px-1.5 py-0.5 text-xs font-medium text-sky-900">
                  ⌘⇧Z
                </kbd>
                )도 됩니다.
              </p>
            </div>

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
