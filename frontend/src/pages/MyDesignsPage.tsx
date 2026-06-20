import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { FolderInput, FolderOpen, Thermometer, Trash2 } from 'lucide-react'
import { deleteDesign, fetchMyDesigns } from '@/api/designApi'
import { useRegions } from '@/hooks/useRegions'
import { regionNameByCode } from '@/lib/regions'
import DesignThumbnail from '@/components/designer/DesignThumbnail'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { normalizeLoadedGrid } from '@/lib/grid'

export default function MyDesignsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: regions } = useRegions()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-designs'],
    queryFn: fetchMyDesigns,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDesign,
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['my-designs'] })
      void queryClient.removeQueries({ queryKey: ['design', id] })
    },
  })

  const onDelete = (id: number, name: string) => {
    if (!window.confirm(`「${name}」 설계를 삭제할까요?\n삭제하면 복구할 수 없습니다.`)) {
      return
    }
    deleteMutation.mutate(id)
  }

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

      {deleteMutation.isError && (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          삭제에 실패했습니다. 잠시 후 다시 시도하세요.
        </p>
      )}

      {isLoading && <p className="text-sm text-slate-500">불러오는 중…</p>}

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
          {data.map((d) => {
            const deleting = deleteMutation.isPending && deleteMutation.variables === d.id
            return (
              <Card key={d.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{d.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-600">
                  <DesignThumbnail grid={normalizeLoadedGrid(d.grid)} className="mb-2 max-w-[160px]" />
                  <p>지역: {regionNameByCode(regions, d.regionCode)}</p>
                  <p className="flex items-center gap-1">
                    <Thermometer className="h-3.5 w-3.5 text-rose-500" />
                    ΔT {d.deltaT.toFixed(1)}°C · 녹지 {Math.round(d.greenRatio * 100)}%
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(d.createdAt).toLocaleString('ko-KR')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => navigate(`/designer?designId=${d.id}`)}
                    >
                      <FolderInput className="h-3.5 w-3.5" />
                      불러오기
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      disabled={deleteMutation.isPending}
                      onClick={() => onDelete(d.id, d.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deleting ? '삭제 중…' : '삭제'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
