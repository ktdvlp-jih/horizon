import { useState } from 'react'
import { buildTyphoonVideoPrompt } from '@/lib/typhoonBriefing'
import type { CouncilVerdict } from '@/lib/typhoonBriefing'
import type { DisasterMetrics, ScenarioSummary } from '@/types'
import type { TyphoonZoneId } from '@/lib/typhoonZones'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Clapperboard, Copy } from 'lucide-react'

interface Props {
  regionName: string
  scenario?: ScenarioSummary | null
  planMetrics: DisasterMetrics
  baselineMetrics?: DisasterMetrics | null
  verdict: CouncilVerdict
  zoneRiskPct: Record<TyphoonZoneId, number>
  timelineLabels?: string[]
}

export default function TyphoonVideoPromptPanel(props: Props) {
  const [copied, setCopied] = useState(false)
  const prompt = buildTyphoonVideoPrompt({
    regionName: props.regionName,
    scenario: props.scenario,
    planMetrics: props.planMetrics,
    baselineMetrics: props.baselineMetrics,
    verdict: props.verdict,
    zoneRiskPct: props.zoneRiskPct,
    timelineLabels: props.timelineLabels,
  })

  const copy = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50/80 to-white">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clapperboard className="h-4 w-4 text-violet-600" />
          AI 브리핑 영상 프롬프트
        </CardTitle>
        <p className="text-[11px] leading-snug text-slate-500">
          Runway, Sora, Kling 등 영상 AI에 붙여 넣을 수 있는 30–45초 시의회 브리핑 시나리오입니다.
          시뮬레이션 결과가 자동 반영됩니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <pre className="max-h-48 overflow-y-auto rounded-lg border border-violet-100 bg-white p-3 text-[10px] leading-relaxed text-slate-700 whitespace-pre-wrap">
          {prompt}
        </pre>
        <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => void copy()}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? '복사됨' : '프롬프트 복사'}
        </Button>
      </CardContent>
    </Card>
  )
}
