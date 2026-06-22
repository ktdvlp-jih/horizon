import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchDisasterScenarios, updateDisasterScenario } from '@/api/adminApi'
import type { DisasterScenarioDto } from '@/types'

export function DisasterScenariosPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-disaster-scenarios'],
    queryFn: fetchDisasterScenarios,
  })

  const saveMut = useMutation({
    mutationFn: (row: DisasterScenarioDto) => updateDisasterScenario(row.id, row),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-disaster-scenarios'] }),
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">재난 시나리오</h1>
      <p className="text-sm text-slate-600">
        태풍·지진·해일 교육용 시나리오입니다. paramsJson은 시뮬 엔진 입력입니다.
      </p>
      {isLoading && <p className="text-slate-500">로딩 중…</p>}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">mode</th>
              <th className="px-3 py-2">제목</th>
              <th className="px-3 py-2">지역</th>
              <th className="px-3 py-2">enabled</th>
              <th className="px-3 py-2">작업</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row) => (
              <tr key={row.id} className="border-b">
                <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                <td className="px-3 py-2">{row.mode}</td>
                <td className="px-3 py-2">{row.title}</td>
                <td className="px-3 py-2">{row.regionCode ?? '—'}</td>
                <td className="px-3 py-2">{row.enabled ? 'Y' : 'N'}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-sky-700 underline"
                    onClick={() =>
                      saveMut.mutate({ ...row, enabled: !row.enabled })
                    }
                  >
                    {row.enabled ? '비활성' : '활성'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
