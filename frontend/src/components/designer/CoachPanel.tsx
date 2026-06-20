import { Link } from 'react-router-dom'
import { Sparkles, ThumbsUp, AlertTriangle, Lightbulb, LogIn } from 'lucide-react'
import type { CoachResponse } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  coach: CoachResponse | null
  loading: boolean
  error: string | null
  onRequest: () => void
  locked?: boolean
  requestDisabled?: boolean
  title?: string
  requestLabel?: string
  scoreLabel?: string
}

export default function CoachPanel({
  coach,
  loading,
  error,
  onRequest,
  locked = false,
  requestDisabled = false,
  title = 'AI 도시 코치',
  requestLabel = 'AI 코치에게 평가받기',
  scoreLabel = '설계 점수',
}: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-violet-500" />
          {title}
        </CardTitle>
        {coach && !locked && (
          <span
            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500"
            title={coach.source === 'llm' ? 'LLM 생성' : '규칙 기반 (LLM 키 미설정)'}
          >
            {coach.source === 'llm' ? 'AI 생성' : '규칙 기반'}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {locked ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600">
            <p>AI 코치는 로그인 후 이용할 수 있습니다.</p>
            <Link to="/login" state={{ from: '/designer' }}>
              <Button size="sm" className="mt-3 gap-1">
                <LogIn className="h-3.5 w-3.5" />
                로그인하고 코치 받기
              </Button>
            </Link>
          </div>
        ) : (
          <Button
            onClick={onRequest}
            disabled={loading || requestDisabled}
            className="w-full"
            variant="secondary"
          >
            {loading ? '분석 중…' : requestLabel}
          </Button>
        )}

        {error && !locked && <p className="text-sm text-rose-600">{error}</p>}

        {coach && !loading && !locked && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-violet-50 p-3">
              <div className="text-3xl font-black text-violet-700">{coach.score}</div>
              <div>
                <div className="text-xs text-violet-500">{scoreLabel}</div>
                <div className="text-sm font-bold text-violet-800">{coach.grade}</div>
              </div>
            </div>

            <Section icon={<ThumbsUp className="h-4 w-4 text-emerald-500" />} title="잘한 점" items={coach.strengths} />
            <Section icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} title="아쉬운 점" items={coach.weaknesses} />
            <Section icon={<Lightbulb className="h-4 w-4 text-sky-500" />} title="개선 제안" items={coach.suggestions} />

            {coach.learningPoint && (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
                💡 {coach.learningPoint}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Section({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  if (!items?.length) return null
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        {icon}
        {title}
      </div>
      <ul className="space-y-1 pl-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-slate-600">
            · {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
