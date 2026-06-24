import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FolderInput, Trophy } from 'lucide-react'
import { fetchLeaderboard } from '@/api/designApi'
import { useRegions } from '@/hooks/useRegions'
import { regionNameByCode } from '@/lib/regions'
import { HEAT_ISLAND_LABEL } from '@/lib/heatMetrics'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LeaderboardPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { data: regions } = useRegions()
  const [regionCode, setRegionCode] = useState('')

  const regionList = useMemo(() => regions ?? [], [regions])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['leaderboard', regionCode || 'all'],
    queryFn: () => fetchLeaderboard(regionCode || undefined),
  })

  const onLoadRef = (id: number) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/designer?refId=${id}` } })
      return
    }
    navigate(`/designer?refId=${id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Trophy className="h-5 w-5 text-amber-500" />
            리더보드
          </h1>
          <p className="text-sm text-slate-500">
            공개된 설계 중 열섬 완화 성과가 좋은 순위입니다. 참고용으로 불러올 수 있습니다.
          </p>
        </div>
        {regionList.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="lb-region" className="text-xs text-slate-500">
              지역
            </label>
            <select
              id="lb-region"
              value={regionCode}
              onChange={(e) => setRegionCode(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">전체</option>
              {regionList.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-500">불러오는 중…</p>}
      {isError && (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          리더보드를 불러오지 못했습니다.
        </p>
      )}

      {data && data.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            아직 공개된 설계가 없습니다.
          </CardContent>
        </Card>
      )}

      {data && data.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top {data.length}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">이름</th>
                  <th className="px-4 py-2 font-medium">지역</th>
                  <th className="px-4 py-2 font-medium">{HEAT_ISLAND_LABEL}</th>
                  <th className="px-4 py-2 font-medium">녹지율</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => (
                  <tr key={d.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-semibold text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{d.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {regionNameByCode(regionList, d.regionCode)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-sky-700">
                      {d.deltaT > 0 ? '+' : ''}
                      {d.deltaT.toFixed(1)}°C
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">
                      {Math.round(d.greenRatio * 100)}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => onLoadRef(d.id)}>
                        <FolderInput className="h-3.5 w-3.5" />
                        참고 불러오기
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-slate-400">
        {!isAuthenticated && (
          <>
            참고 불러오기는{' '}
            <Link to="/login" className="text-sky-600 hover:underline">
              로그인
            </Link>
            후 이용할 수 있습니다.{' '}
          </>
        )}
        설계 저장 시 새 설계로 저장됩니다.
      </p>
    </div>
  )
}
