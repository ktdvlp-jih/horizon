import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  createChallenge,
  deleteChallenge,
  fetchChallenges,
  updateChallenge,
} from '@/api/adminApi'
import type { ChallengeConfigDto } from '@/types'
import { CHALLENGE_RULE_TYPES } from '@/types'

export function ChallengesPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-challenges'], queryFn: fetchChallenges })
  const [editing, setEditing] = useState<ChallengeConfigDto | null>(null)

  const saveMut = useMutation({
    mutationFn: async (c: ChallengeConfigDto) => {
      const exists = data?.some((x) => x.id === c.id)
      if (exists && editing?.id === c.id) {
        return updateChallenge(c.id, c)
      }
      if (exists) throw new Error('ID 중복')
      return createChallenge(c)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-challenges'] })
      setEditing(null)
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">도전과제 (챌린지)</h1>
          <p className="mt-1 text-sm text-slate-500">
            도시 기후 설계자 체험에 노출되는 목표입니다. description은 플레이 힌트(정답 숨김), 규칙/threshold는 달성 후 공개됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditing({
              id: '',
              experienceId: 'urban-climate',
              title: '',
              description: '',
              ruleType: 'GREEN_RATIO_MIN',
              threshold: 0.3,
              ruleParamsJson: null,
              enabled: true,
              sortOrder: (data?.length ?? 0) + 1,
            })
          }
          className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white"
        >
          추가
        </button>
      </div>
      {isLoading && <p className="text-slate-500">로딩 중…</p>}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-2">순서</th>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">제목</th>
              <th className="px-4 py-2">규칙</th>
              <th className="px-4 py-2">threshold</th>
              <th className="px-4 py-2">enabled</th>
              <th className="px-4 py-2">작업</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((c) => (
              <tr key={c.id} className="border-b">
                <td className="px-4 py-2">{c.sortOrder}</td>
                <td className="px-4 py-2 font-mono text-xs">{c.id}</td>
                <td className="px-4 py-2">{c.title}</td>
                <td className="px-4 py-2">{c.ruleType}</td>
                <td className="px-4 py-2">{c.threshold ?? '—'}</td>
                <td className="px-4 py-2">{c.enabled ? 'Y' : 'N'}</td>
                <td className="px-4 py-2">
                  <button type="button" className="mr-2 underline" onClick={() => setEditing(c)}>
                    편집
                  </button>
                  <button
                    type="button"
                    className="text-red-600 underline"
                    onClick={() => {
                      if (confirm('비활성화하시겠습니까?')) {
                        deleteChallenge(c.id).then(() =>
                          qc.invalidateQueries({ queryKey: ['admin-challenges'] }),
                        )
                      }
                    }}
                  >
                    비활성
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <ChallengeForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={(c) => saveMut.mutate(c)}
        />
      )}
    </div>
  )
}

function ChallengeForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: ChallengeConfigDto
  onCancel: () => void
  onSave: (c: ChallengeConfigDto) => void
}) {
  const [form, setForm] = useState(initial)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">{form.id ? '챌린지 편집' : '챌린지 추가'}</h2>
        <div className="space-y-3 text-sm">
          <Field label="ID (slug)">
            <input
              className="w-full rounded border px-2 py-1.5 font-mono"
              value={form.id}
              disabled={!!initial.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
            />
          </Field>
          <Field label="체험 ID">
            <input
              className="w-full rounded border px-2 py-1.5"
              value={form.experienceId}
              onChange={(e) => setForm({ ...form, experienceId: e.target.value })}
            />
          </Field>
          <Field label="제목">
            <input
              className="w-full rounded border px-2 py-1.5"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field label="힌트 (달성 전 표시 · 목표 수치 넣지 않기)">
            <textarea
              className="w-full rounded border px-2 py-1.5"
              rows={3}
              value={form.description}
              placeholder="예: 공원·가로수로 회색 칸을 녹색으로 바꿔 보세요."
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="규칙 타입">
            <select
              className="w-full rounded border px-2 py-1.5"
              value={form.ruleType}
              onChange={(e) => setForm({ ...form, ruleType: e.target.value })}
            >
              {CHALLENGE_RULE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="threshold (단일 규칙용)">
            <input
              type="number"
              step="0.01"
              className="w-full rounded border px-2 py-1.5"
              value={form.threshold ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  threshold: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="ruleParamsJson (TILE_COUNT_MIN / ALL_OF)">
            <textarea
              className="w-full rounded border px-2 py-1.5 font-mono text-xs"
              rows={4}
              value={form.ruleParamsJson ?? ''}
              placeholder='{"tileType":"TREE","minCount":10}'
              onChange={(e) =>
                setForm({ ...form, ruleParamsJson: e.target.value || null })
              }
            />
          </Field>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              enabled
            </label>
            <Field label="sortOrder">
              <input
                type="number"
                className="w-24 rounded border px-2 py-1.5"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              />
            </Field>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="rounded border px-3 py-1.5" onClick={onCancel}>
            취소
          </button>
          <button
            type="button"
            className="rounded bg-slate-900 px-3 py-1.5 text-white"
            onClick={() => onSave(form)}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
      {children}
    </div>
  )
}
