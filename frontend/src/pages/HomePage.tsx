import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Trophy } from 'lucide-react'
import { fetchLeaderboard } from '@/api/designApi'
import { useRegions } from '@/hooks/useRegions'
import { RESILIENCE_AXES } from '@/lib/experiences'
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
        <p className="mb-3 text-sm font-medium text-sky-100">Horizon · 환경 체험 허브</p>
        <h1 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">
          AI와 데이터로 탐험하는 보이지 않는 환경
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sky-100">
          하나의 도시를 열섬·미세먼지·재난·농어업 4축으로 동시에 설계하는 도시 기후 설계자.
          로그인 없이도 체험하고, 저장·코치는 로그인 후 이용하세요.
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
          개별 체험을 나누지 않고, 같은 설계를 여러 렌즈로 평가해 균형 잡힌 회복도시를 만듭니다.
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
                <span className="tabular-nums text-sky-700">
                  ΔT {d.deltaT > 0 ? '+' : ''}
                  {d.deltaT.toFixed(1)}°C
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
          <li>2. 콘크리트로 가득한 기본 도시를 공원·가로수·수변으로 바꿔봅니다.</li>
          <li>3. Before/After로 평균 온도 변화를 보며 열섬 완화 원리를 체득합니다.</li>
          <li>4. 로그인 후 AI 코치의 제안을 반영해 점수를 높여갑니다.</li>
        </ol>
      </section>
    </div>
  )
}
