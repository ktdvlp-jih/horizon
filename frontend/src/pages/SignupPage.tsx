import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signup({
        loginId,
        password,
        userName,
        email: email.trim() || undefined,
      })
      navigate('/designer', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">회원가입</h1>
        <p className="mt-2 text-sm text-slate-500">Horizon에서 설계를 저장하고 관리하세요.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-sky-600" />
            새 계정 만들기
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="아이디" id="loginId">
              <input
                id="loginId"
                type="text"
                autoComplete="username"
                required
                minLength={4}
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-sky-500 focus:ring-2"
                placeholder="4자 이상"
              />
            </Field>
            <Field label="비밀번호" id="password">
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-sky-500 focus:ring-2"
              />
            </Field>
            <Field label="이름" id="userName">
              <input
                id="userName"
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-sky-500 focus:ring-2"
              />
            </Field>
            <Field label="이메일 (선택)" id="email">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-sky-500 focus:ring-2"
              />
            </Field>
            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? '가입 중…' : '회원가입'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="font-medium text-sky-600 hover:underline">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  )
}
