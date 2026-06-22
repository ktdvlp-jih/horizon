import { FileCheck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  planDirty: boolean
  simLoading: boolean
  hasResult: boolean
  canSubmit: boolean
  blockReason?: string | null
  onSubmit: () => void
}

export default function TyphoonCouncilSubmit({
  planDirty,
  simLoading,
  hasResult,
  canSubmit,
  blockReason,
  onSubmit,
}: Props) {
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-sky-950">시의회 제출</h3>
      <p className="mt-1 text-xs leading-snug text-sky-900/80">
        방어 계획을 시의회에 제출하면, <strong>무조치 대비</strong> 시뮬레이션 결과와 표결 반응을
        확인할 수 있습니다. 발표 전에 꼭 실행하세요.
      </p>

      {blockReason && !simLoading && (
        <p className="mt-2 rounded-md bg-amber-100 px-2.5 py-1.5 text-[11px] text-amber-900">
          {blockReason}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={onSubmit}
          disabled={simLoading || !canSubmit}
        >
          {simLoading ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileCheck className="h-3.5 w-3.5" />
          )}
          {simLoading ? '시뮬레이션 중…' : hasResult ? '계획 수정 후 재제출' : '시의회에 제출하기'}
        </Button>
        {planDirty && !simLoading && hasResult && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            계획이 변경됨 — 재제출 필요
          </span>
        )}
      </div>
    </div>
  )
}
