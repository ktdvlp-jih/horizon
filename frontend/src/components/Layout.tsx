import { Link, NavLink, Outlet } from 'react-router-dom'
import { LogIn, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg">🌏</span>
            <span className="font-bold tracking-tight text-slate-900">Horizon</span>
            <span className="hidden text-xs text-slate-400 sm:inline">도시 기후 설계자</span>
          </Link>
          <nav className="flex max-w-[100vw] items-center gap-0.5 overflow-x-auto pb-0.5 text-sm sm:gap-1" style={{ scrollbarWidth: 'none' }}>
            <NavItem to="/" label="소개" end />
            <NavItem to="/designer" label="설계 시작" />
            <NavItem to="/leaderboard" label="리더보드" />
            {isAuthenticated && <NavItem to="/my-designs" label="내 설계" />}
            {isAuthenticated ? (
              <div className="ml-2 flex items-center gap-2 border-l border-slate-200 pl-3">
                <span className="hidden text-xs text-slate-500 sm:inline">{user?.userName}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-slate-600"
                  onClick={() => logout()}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">로그아웃</span>
                </Button>
              </div>
            ) : (
              <Link to="/login" className="ml-2">
                <Button size="sm" variant="outline" className="gap-1">
                  <LogIn className="h-3.5 w-3.5" />
                  로그인
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Horizon · AI와 실시간 데이터로 탐험하는 보이지 않는 환경의 세계
      </footer>
    </div>
  )
}

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 font-medium transition-colors sm:px-3',
          isActive ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-100',
        )
      }
    >
      {label}
    </NavLink>
  )
}
