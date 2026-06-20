import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createRegion, deleteRegion, fetchRegions, refreshRegionCache, updateRegion } from '@/api/adminApi'
import type { RegionConfigDto } from '@/types'

export function RegionsPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-regions'], queryFn: fetchRegions })
  const [editing, setEditing] = useState<RegionConfigDto | null>(null)

  const saveMut = useMutation({
    mutationFn: async (r: RegionConfigDto) => {
      const exists = data?.some((x) => x.code === r.code)
      if (exists && editing?.code === r.code) {
        return updateRegion(r.code, r)
      }
      if (exists) throw new Error('코드 중복')
      return createRegion(r)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-regions'] })
      setEditing(null)
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">지역 설정</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => refreshRegionCache()}
            className="rounded border px-3 py-1.5 text-sm"
          >
            캐시 새로고침
          </button>
          <button
            type="button"
            onClick={() =>
              setEditing({
                code: '',
                name: '',
                kmaStation: '',
                sampleTemp: 33,
                sampleSolar: 0.85,
                enabled: true,
                sortOrder: (data?.length ?? 0) + 1,
                coastalExposure: 0.35,
                seismicZone: 2,
                elevationProfileJson: null,
              })
            }
            className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white"
          >
            추가
          </button>
        </div>
      </div>
      {isLoading && <p className="text-slate-500">로딩 중…</p>}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-2">코드</th>
              <th className="px-4 py-2">이름</th>
              <th className="px-4 py-2">KMA</th>
              <th className="px-4 py-2">sample temp</th>
              <th className="px-4 py-2">sample solar</th>
              <th className="px-4 py-2">enabled</th>
              <th className="px-4 py-2">작업</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr key={r.code} className="border-b">
                <td className="px-4 py-2">{r.code}</td>
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.kmaStation}</td>
                <td className="px-4 py-2">{r.sampleTemp}</td>
                <td className="px-4 py-2">{r.sampleSolar}</td>
                <td className="px-4 py-2">{r.enabled ? 'Y' : 'N'}</td>
                <td className="px-4 py-2">
                  <button type="button" className="mr-2 underline" onClick={() => setEditing(r)}>
                    편집
                  </button>
                  <button
                    type="button"
                    className="text-red-600 underline"
                    onClick={() => {
                      if (confirm('비활성/삭제하시겠습니까?')) deleteRegion(r.code).then(() => qc.invalidateQueries({ queryKey: ['admin-regions'] }))
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
      {editing && (
        <RegionForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={(r) => saveMut.mutate(r)}
        />
      )}
    </div>
  )
}

function RegionForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: RegionConfigDto
  onCancel: () => void
  onSave: (r: RegionConfigDto) => void
}) {
  const [form, setForm] = useState(initial)
  return (
    <div className="rounded-lg border bg-white p-4">
      <h2 className="font-medium">{form.code ? '지역 편집' : '지역 추가'}</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          placeholder="code"
          disabled={!!initial.code}
          className="rounded border px-2 py-1"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <input
          placeholder="name"
          className="rounded border px-2 py-1"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="kmaStation"
          className="rounded border px-2 py-1"
          value={form.kmaStation}
          onChange={(e) => setForm({ ...form, kmaStation: e.target.value })}
        />
        <input
          type="number"
          step="0.1"
          className="rounded border px-2 py-1"
          value={form.sampleTemp}
          onChange={(e) => setForm({ ...form, sampleTemp: Number(e.target.value) })}
        />
        <input
          type="number"
          step="0.01"
          className="rounded border px-2 py-1"
          value={form.sampleSolar}
          onChange={(e) => setForm({ ...form, sampleSolar: Number(e.target.value) })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          enabled
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className="rounded bg-slate-900 px-3 py-1 text-sm text-white" onClick={() => onSave(form)}>
          저장
        </button>
        <button type="button" className="rounded border px-3 py-1 text-sm" onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  )
}
