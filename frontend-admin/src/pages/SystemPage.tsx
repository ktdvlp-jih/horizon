import { useQuery } from '@tanstack/react-query'
import { fetchConfigSummary, fetchSystemHealth, testAiCoach } from '@/api/adminApi'
import { useState } from 'react'

export function SystemPage() {
  const health = useQuery({ queryKey: ['admin-health'], queryFn: fetchSystemHealth })
  const config = useQuery({ queryKey: ['admin-config'], queryFn: fetchConfigSummary })
  const [testMsg, setTestMsg] = useState('')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">시스템</h1>
      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-medium">Health</h2>
        <pre className="mt-2 overflow-auto text-xs text-slate-600">
          {JSON.stringify(health.data, null, 2)}
        </pre>
      </section>
      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-medium">Config Summary</h2>
        <pre className="mt-2 overflow-auto text-xs text-slate-600">
          {JSON.stringify(config.data, null, 2)}
        </pre>
      </section>
      <button
        type="button"
        className="rounded border px-4 py-2 text-sm"
        onClick={async () => {
          const r = await testAiCoach(true)
          setTestMsg(`${r.source} · ${r.latencyMs}ms · score ${r.coachResponse.score}`)
        }}
      >
        AI 연결 테스트
      </button>
      {testMsg && <p className="text-sm text-green-700">{testMsg}</p>}
    </div>
  )
}
