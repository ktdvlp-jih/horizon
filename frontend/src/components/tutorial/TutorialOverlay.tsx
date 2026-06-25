import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'horizon.tutorial.urban-climate.v3'

const STEPS = [
  {
    title: '지역 선택',
    body: '상단에서 기상 데이터가 적용될 지역을 고르세요. 기상청 API허브 10종(기온·일사·강수·PM10·평년·자외선·정체·체감·태풍·지진)이 이 지역 값으로 연결됩니다.',
    anchor: '[data-tutorial="region"]',
  },
  {
    title: '타일 칠하기',
    body: '왼쪽 팔레트에서 타일을 고른 뒤 격자를 클릭·드래그해 배치하세요. 공원·가로수·수변은 식히고, 도로·건물·공장(🏭)은 열·미세먼지를 늘립니다.',
    anchor: '[data-tutorial="palette"]',
  },
  {
    title: '캠페인 Lv.1–10',
    body: '회복탄력성 패널의 「캠페인」에서 레벨을 고르세요. 타일 % 상한·녹지/방재 최소·외곽 구역 배분·점수를 모두 만족해야 클리어합니다. 레벨마다 다른 KMA 데이터가 점수에 반영됩니다.',
    anchor: '[data-tutorial="resilience-levels"]',
  },
  {
    title: '3D 재난·기후 뷰',
    body: '격자 위 「3D」 버튼을 누르세요. 재난 시나리오(태풍·지진·해일)를 고른 뒤 재생하면 건물 비산·붕괴·침수 애니메이션이 나옵니다. 자외선·체감온도·강수는 배경 효과로 표시됩니다.',
    anchor: '[data-tutorial="heatmap"]',
  },
  {
    title: '회복탄력성 — 렌즈·점수',
    body: '「회복탄력성 평가」에서 타일을 칠하면 종합 점수가 자동으로 나옵니다. 🌡️열섬·🌫️미세먼지 등 렌즈 탭을 누르면 격자 색이 축에 맞게 바뀝니다.',
    anchor: '[data-tutorial="resilience-lens"]',
  },
  {
    title: '외곽 구역 배분',
    body: '🌾농어업 렌즈를 켜면 외곽·광역·구역 배분 슬라이더가 나타납니다. 농지·어장·보존림·태양광 비율도 캠페인 클리어 조건에 포함됩니다.',
    anchor: '[data-tutorial="resilience-zones"]',
  },
  {
    title: '스트레스 테스트·AI 코치',
    body: '▶ 스트레스 테스트로 폭염→태풍→미세먼지→수확기를 순서대로 점검하고, 🤖 통합 AI 코치로 4축 개선 힌트를 받으세요.',
    anchor: '[data-tutorial="resilience-stress"]',
  },
  {
    title: '저장·코치 (로그인)',
    body: '로그인하면 설계를 저장하고 AI 도시 코치의 평가를 받을 수 있습니다.',
    anchor: '[data-tutorial="save"]',
  },
]

interface Props {
  force?: boolean
  onDone?: () => void
  onStepChange?: (step: number) => void
}

function measureAnchor(selector: string): DOMRect | null {
  const el = document.querySelector(selector)
  return el ? el.getBoundingClientRect() : null
}

export default function TutorialOverlay({ force = false, onDone, onStepChange }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)

  const scrollToStep = useCallback((index: number) => {
    const anchor = STEPS[index]?.anchor
    if (!anchor) {
      setHighlightRect(null)
      return
    }
    const el = document.querySelector(anchor)
    if (!el) {
      setHighlightRect(null)
      return
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    const update = () => setHighlightRect(measureAnchor(anchor))
    update()
    const t = window.setTimeout(update, 450)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (force) {
      setOpen(true)
      setStep(0)
      return
    }
    if (localStorage.getItem(STORAGE_KEY)) return
    setOpen(true)
  }, [force])

  useEffect(() => {
    if (!open) return
    onStepChange?.(step)
    const clearScrollTimer = scrollToStep(step)
    const onLayout = () => {
      const anchor = STEPS[step]?.anchor
      if (anchor) setHighlightRect(measureAnchor(anchor))
    }
    window.addEventListener('scroll', onLayout, true)
    window.addEventListener('resize', onLayout)
    return () => {
      clearScrollTimer?.()
      window.removeEventListener('scroll', onLayout, true)
      window.removeEventListener('resize', onLayout)
    }
  }, [open, step, scrollToStep, onStepChange])

  const close = (persist: boolean) => {
    if (persist) localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
    onDone?.()
  }

  const goToStep = (next: number) => {
    setStep(next)
  }

  if (!open) return null

  const current = STEPS[step]

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/60" aria-hidden />
      {highlightRect && (
        <div
          className="pointer-events-none absolute rounded-xl ring-4 ring-sky-400 ring-offset-2 ring-offset-transparent transition-all duration-300"
          style={{
            top: highlightRect.top - 4,
            left: highlightRect.left - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
          }}
        />
      )}
      <div className="absolute bottom-6 left-1/2 w-[min(420px,calc(100%-2rem))] -translate-x-1/2 rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-1 flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-sky-600">
            튜토리얼 {step + 1}/{STEPS.length}
          </p>
          <button
            type="button"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={() => close(true)}
            aria-label="튜토리얼 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="text-lg font-bold text-slate-900">{current.title}</h3>
        <p className="mt-2 text-sm text-slate-600">{current.body}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Button size="sm" variant="ghost" onClick={() => close(true)}>
            건너뛰기
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button size="sm" variant="outline" onClick={() => goToStep(step - 1)}>
                이전
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => goToStep(step + 1)}>
                다음
              </Button>
            ) : (
              <Button size="sm" onClick={() => close(true)}>
                시작하기
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
