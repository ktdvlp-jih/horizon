import { useQuery } from '@tanstack/react-query'
import { fetchSystemHealth, fetchSystemStats } from '@/api/adminApi'

export function DashboardPage() {
  const health = useQuery({ queryKey: ['admin-health'], queryFn: fetchSystemHealth })
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: fetchSystemStats })

  const h = health.data
  const s = stats.data

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">대시보드</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Spring" value={String(h?.spring ?? '—')} />
        <Card title="Database" value={String(h?.database ?? '—')} />
        <Card
          title="AI Service"
          value={
            h?.aiService && typeof h.aiService === 'object' && 'status' in h.aiService
              ? String((h.aiService as { status: string }).status)
              : '—'
          }
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-medium">통계</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            <li>사용자: {s?.userCount ?? '—'}</li>
            <li>설계: {s?.designCount ?? '—'}</li>
          </ul>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-medium">리더보드 Top 5</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {(s?.leaderboardTop5 ?? []).map((d) => (
              <li key={d.id} className="text-slate-600">
                {d.name} · 기준 대비 {d.deltaT > 0 ? '+' : ''}{d.deltaT.toFixed(1)}°C
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  )
}
