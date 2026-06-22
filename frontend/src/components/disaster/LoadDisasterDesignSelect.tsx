import { useQuery } from '@tanstack/react-query'
import { fetchMyDisasterDesigns } from '@/api/disasterApi'
import type { DisasterMode } from '@/types'

interface Props {
  mode: DisasterMode
  currentDesignId?: number | null
  onSelect: (id: number) => void
  onNewDesign: () => void
}

export default function LoadDisasterDesignSelect({
  mode,
  currentDesignId,
  onSelect,
  onNewDesign,
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['my-disaster-designs', mode],
    queryFn: () => fetchMyDisasterDesigns(mode),
    enabled: true,
  })

  return (
    <select
      className="h-8 min-w-0 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none ring-sky-500 focus:ring-2 lg:text-sm"
      value={currentDesignId ?? ''}
      disabled={isLoading}
      aria-label="방어 계획 불러오기"
      onChange={(e) => {
        const v = e.target.value
        if (!v) onNewDesign()
        else onSelect(Number(v))
      }}
    >
      <option value="">새 계획</option>
      {data?.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name}
        </option>
      ))}
    </select>
  )
}
