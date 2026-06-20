import { useQuery } from '@tanstack/react-query'
import { FolderOpen } from 'lucide-react'
import { fetchMyDesigns } from '@/api/designApi'
import { cn } from '@/lib/utils'

type Props = {
  currentDesignId?: number | null
  onSelect: (id: number) => void
  onNewDesign: () => void
  /** 설계가 없어도 「새 설계」 선택 UI 표시 */
  showEmpty?: boolean
  fullWidth?: boolean
  /** 헤더 툴바용 — 아이콘 없이 select만 */
  variant?: 'default' | 'select-only'
}

export default function LoadDesignButton({
  currentDesignId,
  onSelect,
  onNewDesign,
  showEmpty = false,
  fullWidth = false,
  variant = 'default',
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['my-designs'],
    queryFn: fetchMyDesigns,
  })

  if (!showEmpty && (isLoading || !data?.length)) return null

  const select = (
    <select
      className={cn(
        'h-8 min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none ring-sky-500 focus:ring-2 lg:text-sm',
        variant === 'select-only' ? 'w-full' : 'flex-1',
      )}
      value={currentDesignId ?? ''}
      disabled={isLoading}
      aria-label="설계 불러오기"
      onChange={(e) => {
        const v = e.target.value
        if (!v) onNewDesign()
        else onSelect(Number(v))
      }}
    >
      <option value="">새 설계</option>
      {data?.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name}
        </option>
      ))}
    </select>
  )

  if (variant === 'select-only') {
    return select
  }

  return (
    <label
      className={cn(
        'flex h-8 items-center gap-1.5 text-sm text-slate-600 lg:h-9',
        fullWidth ? 'w-full' : 'min-w-[9.5rem]',
      )}
    >
      <FolderOpen className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      {select}
    </label>
  )
}
