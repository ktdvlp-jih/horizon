import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchUsers, patchUser, resetUserPassword } from '@/api/adminApi'

export function UsersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => fetchUsers({ page, size: 20 }),
  })

  const patchMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) => patchUser(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  async function handleReset(userId: number) {
    const pw = prompt('새 비밀번호 (8자 이상):')
    if (!pw) return
    await resetUserPassword(userId, pw)
    alert('비밀번호가 초기화되었습니다.')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">사용자 관리</h1>
      {isLoading && <p className="text-slate-500">로딩 중…</p>}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">로그인</th>
              <th className="px-4 py-2">이름</th>
              <th className="px-4 py-2">역할</th>
              <th className="px-4 py-2">활성</th>
              <th className="px-4 py-2">잠금</th>
              <th className="px-4 py-2">작업</th>
            </tr>
          </thead>
          <tbody>
            {(data?.content ?? []).map((u) => (
              <tr key={u.userId} className="border-b last:border-0">
                <td className="px-4 py-2">{u.userId}</td>
                <td className="px-4 py-2">{u.loginId}</td>
                <td className="px-4 py-2">{u.userName}</td>
                <td className="px-4 py-2">
                  <select
                    value={u.role}
                    onChange={(e) =>
                      patchMut.mutate({ id: u.userId, body: { role: e.target.value } })
                    }
                    className="rounded border px-2 py-1"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    className="text-blue-600 underline"
                    onClick={() =>
                      patchMut.mutate({
                        id: u.userId,
                        body: { useYn: u.useYn === 'Y' ? 'N' : 'Y' },
                      })
                    }
                  >
                    {u.useYn}
                  </button>
                </td>
                <td className="px-4 py-2">
                  {u.lockedUntil ? (
                    <button
                      type="button"
                      className="text-orange-600 underline"
                      onClick={() => patchMut.mutate({ id: u.userId, body: { unlock: true } })}
                    >
                      해제
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    className="text-sm text-slate-600 underline"
                    onClick={() => handleReset(u.userId)}
                  >
                    비밀번호 초기화
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
        <span className="py-1 text-sm text-slate-600">
          {page + 1} / {data?.totalPages ?? 1}
        </span>
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
