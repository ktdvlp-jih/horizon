import { Link } from 'react-router-dom'
import { ArrowRight, MousePointerClick, Sparkles, Thermometer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-600 px-6 py-12 text-center text-white sm:py-16">
        <p className="mb-3 text-sm font-medium text-sky-100">Horizon · 도시 기후 설계자</p>
        <h1 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">
          당신이 도시를 설계하면, 더위가 바뀐다
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sky-100">
          건물·도로·공원·나무·물을 직접 배치하고, 실제 기상 데이터 기반 열섬 히트맵이
          실시간으로 변하는 것을 확인하세요. AI 도시 코치가 설계를 평가합니다.
        </p>
        <div className="mt-6 flex justify-center">
          <Link to="/designer">
            <Button size="lg" variant="secondary" className="shadow-lg">
              지금 설계 시작 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <p className="mt-3 text-xs text-sky-200">로그인 후 설계 · 30초 안에 첫 변화 체험</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Feature
          icon={<MousePointerClick className="h-5 w-5 text-sky-600" />}
          title="직접 설계"
          desc="격자에 타일을 칠해 나만의 도시를 만듭니다. 마우스·터치 모두 지원."
        />
        <Feature
          icon={<Thermometer className="h-5 w-5 text-rose-500" />}
          title="실시간 열섬"
          desc="기상 데이터 기반으로 표면 온도가 즉시 계산되어 히트맵으로 보입니다."
        />
        <Feature
          icon={<Sparkles className="h-5 w-5 text-violet-500" />}
          title="AI 코치"
          desc="설계 점수·강약점·개선 제안을 받아 더 시원한 도시로 발전시킵니다."
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">이렇게 학습합니다</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-600">
          <li>1. 지역을 고르면 그 지역의 실제 기온·일사량이 기준값으로 설정됩니다.</li>
          <li>2. 콘크리트로 가득한 기본 도시를 공원·가로수·수변으로 바꿔봅니다.</li>
          <li>3. 평균 온도가 떨어지는 것을 보며 열섬 완화 원리를 체득합니다.</li>
          <li>4. AI 코치의 제안을 반영해 점수를 높여갑니다.</li>
        </ol>
      </section>
    </div>
  )
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card>
      <CardContent className="space-y-2 pt-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50">{icon}</div>
        <h3 className="font-bold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-500">{desc}</p>
      </CardContent>
    </Card>
  )
}
