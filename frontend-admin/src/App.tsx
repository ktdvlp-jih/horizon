import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'
import { AdminRoute } from '@/components/AdminRoute'
import { AdminLayout } from '@/components/AdminLayout'
import { LoginPage } from '@/pages/LoginPage'
import { AccessDeniedPage } from '@/pages/AccessDeniedPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { UsersPage } from '@/pages/UsersPage'
import { AiCoachPage } from '@/pages/AiCoachPage'
import { DesignsPage } from '@/pages/DesignsPage'
import { RegionsPage } from '@/pages/RegionsPage'
import { ChallengesPage } from '@/pages/ChallengesPage'
import { DisasterScenariosPage } from '@/pages/DisasterScenariosPage'
import { SystemPage } from '@/pages/SystemPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function routerBasename(): string | undefined {
  const base = import.meta.env.BASE_URL
  if (!base || base === '/') return undefined
  return base.replace(/\/$/, '')
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={routerBasename()}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />
            <Route element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="ai-coach" element={<AiCoachPage />} />
                <Route path="designs" element={<DesignsPage />} />
                <Route path="regions" element={<RegionsPage />} />
                <Route path="challenges" element={<ChallengesPage />} />
                <Route path="disaster-scenarios" element={<DisasterScenariosPage />} />
                <Route path="system" element={<SystemPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
