import { useCallback, useEffect, useRef, useState } from 'react'
import type { DisasterMode, Grid } from '@/types'
import { simulateDisasterTimeline } from '@/api/disasterApi'

export function useDisasterAnimation(
  mode: DisasterMode,
  regionCode: string,
  scenarioId: string,
  grid: Grid,
) {
  const [frames, setFrames] = useState<number[][][]>([])
  const [labels, setLabels] = useState<string[]>([])
  const [globalMin, setGlobalMin] = useState(0)
  const [globalMax, setGlobalMax] = useState(1)
  const [frameIndex, setFrameIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<number | null>(null)

  const load = useCallback(async () => {
    if (!regionCode || !scenarioId) return
    setLoading(true)
    try {
      const tl = await simulateDisasterTimeline({ mode, regionCode, scenarioId, grid })
      setFrames(tl.frames.map((f) => f.cellValues))
      setLabels(tl.frames.map((f) => f.label))
      setGlobalMin(tl.globalMin)
      setGlobalMax(tl.globalMax)
      setFrameIndex(0)
    } finally {
      setLoading(false)
    }
  }, [mode, regionCode, scenarioId, grid])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!playing || frames.length === 0) return
    timerRef.current = window.setInterval(() => {
      setFrameIndex((i) => (i + 1 >= frames.length ? 0 : i + 1))
    }, 900)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [playing, frames.length])

  const animatedRisk = frames.length > 0 ? frames[frameIndex] : null

  return {
    animatedRisk,
    labels,
    frameIndex,
    globalMin,
    globalMax,
    playing,
    setPlaying,
    loading,
    reload: load,
    hasFrames: frames.length > 0,
  }
}
