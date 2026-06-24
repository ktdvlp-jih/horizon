import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Trophy } from 'lucide-react'
import { fetchLeaderboard } from '@/api/designApi'
import { useRegions } from '@/hooks/useRegions'
import { RESILIENCE_AXES } from '@/lib/experiences'
import { formatHeatIslandDelta } from '@/lib/heatMetrics'
import { regionNameByCode } from '@/lib/regions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function HomePage() {
  const { data: regions } = useRegions()
  const { data: topDesigns } = useQuery({
    queryKey: ['leaderboard', 'home-top3'],
    queryFn: () => fetchLeaderboard(undefined, 3),
  })

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-600 px-6 py-12 text-center text-white sm:py-16">
        <p className="mb-3 text-sm font-medium text-sky-100">Horizon · AI 웹 체험</p>
        <h1 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">
          도시 기후 설계자
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sky-100">
          기상청 데이터로 도시를 설계하고, 열섬·대기·재난을 검증하는 AI 웹 체험.
          여러 환경 문제를 견디는 균형 잡힌 도시 설계를 학습합니다.
        </p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-sky-200/90">
          중·고등학생, 기후·환경·재난 교육 수강생 및 관심 있는 일반인 · 로그인 없이도 체험 가능
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/designer?guest=1">
            <Button size="lg" variant="secondary" className="shadow-lg">
              로그인 없이 체험 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/designer?tutorial=1">
            <Button size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
              튜토리얼로 시작
            </Button>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold text-slate-900">하나의 도시, 네 개의 축</h2>
        <p className="mb-4 text-sm text-slate-500">
          같은 설계를 여러 렌즈로 평가하며, 균형 잡힌 도시를 만듭니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RESILIENCE_AXES.map((axis) => (
            <Card key={axis.title} className="h-full">
              <CardContent className="space-y-2 pt-5">
                <span className="text-2xl">{axis.emoji}</span>
                <h3 className="font-bold text-slate-800">{axis.title}</h3>
                <p className="text-sm text-slate-500">{axis.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4">
          <Link to="/designer">
            <Button size="lg" className="gap-1">
              도시 기후 설계자 열기 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {topDesigns && topDesigns.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Trophy className="h-5 w-5 text-amber-500" />
              리더보드 Top 3
            </h2>
            <Link to="/leaderboard" className="text-sm font-medium text-sky-600 hover:underline">
              전체 보기
            </Link>
          </div>
          <ol className="space-y-2">
            {topDesigns.map((d, i) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-2 text-sm"
              >
                <span className="font-semibold text-slate-400">#{i + 1}</span>
                <span className="flex-1 font-medium text-slate-800">{d.name}</span>
                <span className="text-slate-500">{regionNameByCode(regions, d.regionCode)}</span>
                <span className="shrink-0 tabular-nums font-medium text-sky-700">
                  기준 대비 {formatHeatIslandDelta(d.deltaT)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">도시 기후 설계자 — 이렇게 학습합니다</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-600">
          <li>1. 지역을 고르면 그 지역의 실제 기온·일사량이 기준값으로 설정됩니다.</li>
          <li>2. 타일로 도시를 설계하고, 열섬·대기·재난 렌즈로 단계적으로 검증합니다.</li>
          <li>3. 렌즈를 바꿔 위험도를 확인하고, 균형 잡힌 종합 점수를 높여갑니다.</li>
          <li>4. 시나리오 레벨로 단계별 학습하고, 스트레스 테스트와 통합 AI 코치로 설계를 보완합니다.</li>
        </ol>
      </section>
    </div>
  )
}
