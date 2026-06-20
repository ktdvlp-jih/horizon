import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/', label: '대시보드' },
  { to: '/users', label: '사용자' },
  { to: '/ai-coach', label: 'AI 코치' },
  { to: '/designs', label: '설계' },
  { to: '/regions', label: '지역' },
  { to: '/challenges', label: '도전과제' },
  { to: '/system', label: '시스템' },
]

export function AdminLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-full">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-slate-900 text-slate-100">
        <div className="border-b border-slate-700 px-4 py-5">
          <div className="text-lg font-semibold">Horizon Admin</div>
          <div className="mt-1 text-xs text-slate-400">관리자 콘솔</div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <span className="text-sm text-slate-600">{user?.userName} (ADMIN)</span>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            로그아웃
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
