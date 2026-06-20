import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FolderOpen, Thermometer } from 'lucide-react'
import { fetchMyDesigns } from '@/api/designApi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function MyDesignsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-designs'],
    queryFn: fetchMyDesigns,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">내 설계</h1>
          <p className="text-sm text-slate-500">저장한 도시 기후 설계 목록입니다.</p>
        </div>
        <Link to="/designer">
          <Button>새 설계 만들기</Button>
        </Link>
      </div>

      {isLoading && (
        <p className="text-sm text-slate-500">불러오는 중…</p>
      )}

      {isError && (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          목록을 불러오지 못했습니다.
        </p>
      )}

      {!isLoading && !isError && data?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FolderOpen className="h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-500">아직 저장한 설계가 없습니다.</p>
            <Link to="/designer">
              <Button variant="outline">설계 시작하기</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{d.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                <p>지역: {d.regionCode}</p>
                <p className="flex items-center gap-1">
                  <Thermometer className="h-3.5 w-3.5 text-rose-500" />
                  ΔT {d.deltaT.toFixed(1)}°C · 녹지 {Math.round(d.greenRatio * 100)}%
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(d.createdAt).toLocaleString('ko-KR')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
