import { Link } from 'react-router-dom'

export function AccessDeniedPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-slate-100 p-8">
      <h1 className="text-2xl font-semibold text-slate-900">접근 거부</h1>
      <p className="text-slate-600">관리자(ADMIN) 권한이 필요합니다.</p>
      <Link to="/login" className="text-sm text-blue-600 underline">
        로그인으로 돌아가기
      </Link>
      <a href="http://localhost:5173" className="text-sm text-slate-500 underline">
        사용자 앱 (5173)
      </a>
    </div>
  )
}
