import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AuthProvider } from '@/context/AuthContext'
import HomePage from '@/pages/HomePage'
import DesignerPage from '@/pages/DesignerPage'
import LeaderboardPage from '@/pages/LeaderboardPage'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import MyDesignsPage from '@/pages/MyDesignsPage'
import DisasterDesignerPage from '@/pages/DisasterDesignerPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="designer" element={<DesignerPage />} />
              <Route path="disaster" element={<DisasterDesignerPage />} />
              <Route path="experiences/urban-climate" element={<Navigate to="/designer" replace />} />
              <Route path="experiences/disaster-response" element={<Navigate to="/disaster" replace />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignupPage />} />
              <Route
                path="my-designs"
                element={
                  <ProtectedRoute>
                    <MyDesignsPage />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
