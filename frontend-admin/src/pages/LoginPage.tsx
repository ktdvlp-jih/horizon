import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function LoginPage() {
  const { login, isAuthenticated, isAdmin } = useAuth()
  const [loginId, setLoginId] = useState('admin')
  const [password, setPassword] = useState('admin1234')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated && isAdmin) {
    return <Navigate to="/" replace />
  }

  if (isAuthenticated && !isAdmin) {
    return <Navigate to="/access-denied" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ loginId, password })
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-900 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg"
      >
        <h1 className="text-xl font-semibold text-slate-900">Horizon Admin</h1>
        <p className="mt-1 text-sm text-slate-500">관리자 계정으로 로그인</p>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <label className="mt-6 block text-sm">
          <span className="text-slate-600">아이디</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="mt-4 block text-sm">
          <span className="text-slate-600">비밀번호</span>
          <input
            type="password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-md bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? '로그인 중…' : '로그인'}
        </button>
        <p className="mt-4 text-center text-xs text-slate-400">데모: admin / admin1234</p>
      </form>
    </div>
  )
}
