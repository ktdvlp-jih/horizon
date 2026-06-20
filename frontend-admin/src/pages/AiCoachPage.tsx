import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { fetchAiCoach, testAiCoach, updateAiCoach } from '@/api/adminApi'
import type { AiCoachSettingsView } from '@/types'

export function AiCoachPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-ai-coach'], queryFn: fetchAiCoach })
  const [form, setForm] = useState<Partial<AiCoachSettingsView> & { apiKey?: string }>({})
  const [testResult, setTestResult] = useState<string>('')

  useEffect(() => {
    if (data) {
      setForm({
        systemPrompt: data.systemPrompt,
        userPromptTemplate: data.userPromptTemplate,
        openaiModel: data.openaiModel,
        openaiBaseUrl: data.openaiBaseUrl,
        temperature: data.temperature,
        llmEnabled: data.llmEnabled,
        learningPointDefault: data.learningPointDefault,
        ruleWeights: data.ruleWeights,
        gradeThresholds: data.gradeThresholds,
      })
    }
  }, [data])

  const saveMut = useMutation({
    mutationFn: () => updateAiCoach(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ai-coach'] })
      alert('저장되었습니다.')
    },
  })

  async function handleTest() {
    const res = await testAiCoach(true)
    setTestResult(
      `[${res.source}] ${res.latencyMs}ms · score ${res.coachResponse.score} · ${res.coachResponse.grade}`,
    )
  }

  if (isLoading) return <p className="text-slate-500">로딩 중…</p>

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">AI 코치 설정</h1>
      <p className="text-sm text-slate-500">
        API 키: {data?.apiKeyConfigured ? data.apiKeyMasked : '미설정'} · 변경 시에만 입력
      </p>
      <Field label="System Prompt">
        <textarea
          rows={6}
          className="w-full rounded border px-3 py-2 font-mono text-sm"
          value={form.systemPrompt ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
        />
      </Field>
      <Field label="User Prompt Template">
        <textarea
          rows={8}
          className="w-full rounded border px-3 py-2 font-mono text-sm"
          value={form.userPromptTemplate ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, userPromptTemplate: e.target.value }))}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Model">
          <input
            className="w-full rounded border px-3 py-2"
            value={form.openaiModel ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, openaiModel: e.target.value }))}
          />
        </Field>
        <Field label="Base URL">
          <input
            className="w-full rounded border px-3 py-2"
            value={form.openaiBaseUrl ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, openaiBaseUrl: e.target.value }))}
          />
        </Field>
        <Field label="Temperature">
          <input
            type="number"
            step="0.1"
            className="w-full rounded border px-3 py-2"
            value={form.temperature ?? 0.6}
            onChange={(e) => setForm((f) => ({ ...f, temperature: Number(e.target.value) }))}
          />
        </Field>
        <Field label="API Key (새 값)">
          <input
            type="password"
            className="w-full rounded border px-3 py-2"
            placeholder="변경 시에만 입력"
            onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.llmEnabled ?? true}
          onChange={(e) => setForm((f) => ({ ...f, llmEnabled: e.target.checked }))}
        />
        LLM 사용 (false면 rule-only)
      </label>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          저장
        </button>
        <button
          type="button"
          onClick={handleTest}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          테스트 호출
        </button>
      </div>
      {testResult && <p className="text-sm text-green-700">{testResult}</p>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
