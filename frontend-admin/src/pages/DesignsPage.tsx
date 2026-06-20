import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { deleteDesign, fetchDesigns, patchDesign } from '@/api/adminApi'

export function DesignsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ['admin-designs', page],
    queryFn: () => fetchDesigns({ page, size: 20 }),
  })

  const patchMut = useMutation({
    mutationFn: ({ id, visible }: { id: number; visible: boolean }) => patchDesign(id, visible),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-designs'] }),
  })

  const deleteMut = useMutation({
    mutationFn: deleteDesign,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-designs'] }),
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">설계 관리</h1>
      {isLoading && <p className="text-slate-500">로딩 중…</p>}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">이름</th>
              <th className="px-4 py-2">지역</th>
              <th className="px-4 py-2">ΔT</th>
              <th className="px-4 py-2">소유자</th>
              <th className="px-4 py-2">리더보드</th>
              <th className="px-4 py-2">작업</th>
            </tr>
          </thead>
          <tbody>
            {(data?.content ?? []).map((d) => (
              <tr key={d.id} className="border-b last:border-0">
                <td className="px-4 py-2">{d.id}</td>
                <td className="px-4 py-2">{d.name}</td>
                <td className="px-4 py-2">{d.regionCode}</td>
                <td className="px-4 py-2">{d.deltaT.toFixed(1)}°C</td>
                <td className="px-4 py-2">{d.ownerLoginId ?? '—'}</td>
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={d.visibleOnLeaderboard}
                    onChange={(e) =>
                      patchMut.mutate({ id: d.id, visible: e.target.checked })
                    }
                  />
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    className="text-red-600 underline"
                    onClick={() => {
                      if (confirm('삭제(soft)하시겠습니까?')) deleteMut.mutate(d.id)
                    }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => setPage((p) => p - 1)}
          className="rounded border px-3 py-1 text-sm disabled:opacity-40"
        >
          이전
        </button>
        <span className="py-1 text-sm">{page + 1} / {data?.totalPages ?? 1}</span>
        <button
          type="button"
          disabled={!data || page >= data.totalPages - 1}
          onClick={() => setPage((p) => p + 1)}
          className="rounded border px-3 py-1 text-sm disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  )
}
