import { cn } from '@/lib/utils'

export type DesignerMobileTab = 'grid' | 'tiles' | 'insight' | 'coach'

const TABS: { id: DesignerMobileTab; label: string; emoji: string }[] = [
  { id: 'grid', label: '격자', emoji: '🗺️' },
  { id: 'tiles', label: '타일', emoji: '🎨' },
  { id: 'insight', label: '분석', emoji: '📊' },
  { id: 'coach', label: '코치', emoji: '🤖' },
]

interface Props {
  active: DesignerMobileTab
  onChange: (tab: DesignerMobileTab) => void
}

export default function DesignerMobileTabs({ active, onChange }: Props) {
  return (
    <nav
      className="sticky top-0 z-[5] -mx-4 border-b border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:hidden"
      aria-label="설계자 화면 탭"
    >
      <div className="grid grid-cols-4 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex min-h-[44px] flex-col items-center justify-center rounded-lg px-1 py-1.5 text-[11px] font-semibold transition',
              active === tab.id
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100',
            )}
          >
            <span className="text-base leading-none" aria-hidden>
              {tab.emoji}
            </span>
            <span className="mt-0.5 whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
