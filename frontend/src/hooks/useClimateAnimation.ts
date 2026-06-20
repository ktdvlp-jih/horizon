import { useCallback, useEffect, useRef, useState } from 'react'
import type { Grid, SimulationTimeline } from '@/types'
import { simulateTimeline } from '@/api/designApi'

/** Seconds of real time spent transitioning between two adjacent frames at 1x. */
const SECONDS_PER_FRAME = 1.1

export interface AnimatedSnapshot {
  temps: number[][]
  hour: number
  label: string
  solarIntensity: number
  airTemp: number
  avgSurfaceTemp: number
  maxSurfaceTemp: number
  minSurfaceTemp: number
  deltaT: number
}

export interface ClimateAnimation {
  timeline: SimulationTimeline | null
  snapshot: AnimatedSnapshot | null
  isLoading: boolean
  isPlaying: boolean
  /** Continuous playhead position in [0, frames-1]. */
  position: number
  speed: number
  error: string | null
  load: () => void
  play: () => void
  pause: () => void
  toggle: () => void
  stop: () => void
  seek: (position: number) => void
  setSpeed: (speed: number) => void
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpGrid(a: number[][], b: number[][], t: number): number[][] {
  return a.map((row, r) => row.map((v, c) => lerp(v, b[r][c], t)))
}

function snapshotAt(timeline: SimulationTimeline, position: number): AnimatedSnapshot {
  const frames = timeline.frames
  const last = frames.length - 1
  const clamped = Math.min(Math.max(position, 0), last)
  const i0 = Math.floor(clamped)
  const i1 = Math.min(i0 + 1, last)
  const frac = clamped - i0
  const f0 = frames[i0]
  const f1 = frames[i1]
  return {
    temps: lerpGrid(f0.surfaceTemps, f1.surfaceTemps, frac),
    hour: lerp(f0.hour, f1.hour, frac),
    label: frac < 0.5 ? f0.label : f1.label,
    solarIntensity: lerp(f0.solarIntensity, f1.solarIntensity, frac),
    airTemp: lerp(f0.airTemp, f1.airTemp, frac),
    avgSurfaceTemp: lerp(f0.avgSurfaceTemp, f1.avgSurfaceTemp, frac),
    maxSurfaceTemp: lerp(f0.maxSurfaceTemp, f1.maxSurfaceTemp, frac),
    minSurfaceTemp: lerp(f0.minSurfaceTemp, f1.minSurfaceTemp, frac),
    deltaT: lerp(f0.deltaT, f1.deltaT, frac),
  }
}

/**
 * Loads a day-cycle timeline for the given region/grid and drives a smooth
 * requestAnimationFrame playback loop with interpolation between frames.
 */
export function useClimateAnimation(
  regionCode: string,
  grid: Grid,
  date: string,
  onTimelineLoaded?: () => void,
): ClimateAnimation {
  const [timeline, setTimeline] = useState<SimulationTimeline | null>(null)
  const [snapshot, setSnapshot] = useState<AnimatedSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const timelineRef = useRef<SimulationTimeline | null>(null)
  const positionRef = useRef(0)
  const speedRef = useRef(1)
  const playingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)
  const loadTokenRef = useRef(0)
  const onTimelineLoadedRef = useRef(onTimelineLoaded)
  onTimelineLoadedRef.current = onTimelineLoaded

  timelineRef.current = timeline
  speedRef.current = speed

  const applyPosition = useCallback((p: number) => {
    const tl = timelineRef.current
    if (!tl) return
    positionRef.current = p
    setPosition(p)
    setSnapshot(snapshotAt(tl, p))
  }, [])

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    lastTsRef.current = null
  }, [])

  const finishPlayback = useCallback(() => {
    playingRef.current = false
    setIsPlaying(false)
    stopLoop()
  }, [stopLoop])

  const tick = useCallback(
    (ts: number) => {
      const tl = timelineRef.current
      if (!tl || !playingRef.current) return
      if (lastTsRef.current == null) lastTsRef.current = ts
      const dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts

      const lastIndex = tl.frames.length - 1
      const advance = (dt / SECONDS_PER_FRAME) * speedRef.current
      let next = positionRef.current + advance
      if (next >= lastIndex) {
        applyPosition(lastIndex)
        finishPlayback()
        return
      }
      applyPosition(next)
      rafRef.current = requestAnimationFrame(tick)
    },
    [applyPosition, finishPlayback],
  )

  const startLoop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    lastTsRef.current = null
    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const play = useCallback(() => {
    if (!timelineRef.current) return
    const lastIndex = timelineRef.current.frames.length - 1
    if (positionRef.current >= lastIndex) {
      applyPosition(0)
    }
    playingRef.current = true
    setIsPlaying(true)
    startLoop()
  }, [startLoop, applyPosition])

  const pause = useCallback(() => {
    playingRef.current = false
    setIsPlaying(false)
    stopLoop()
  }, [stopLoop])

  const load = useCallback(() => {
    if (!regionCode) return
    const token = ++loadTokenRef.current
    setIsLoading(true)
    setError(null)
    simulateTimeline(regionCode, grid, date)
      .then((tl) => {
        if (token !== loadTokenRef.current) return
        timelineRef.current = tl
        setTimeline(tl)
        positionRef.current = 0
        setPosition(0)
        setSnapshot(snapshotAt(tl, 0))
        setIsLoading(false)
        playingRef.current = true
        setIsPlaying(true)
        startLoop()
        onTimelineLoadedRef.current?.()
      })
      .catch(() => {
        if (token !== loadTokenRef.current) return
        setIsLoading(false)
        setError('타임라인을 불러오지 못했습니다. 잠시 후 다시 시도하세요.')
      })
  }, [regionCode, grid, date, startLoop])

  const toggle = useCallback(() => {
    if (playingRef.current) pause()
    else play()
  }, [pause, play])

  const stop = useCallback(() => {
    playingRef.current = false
    setIsPlaying(false)
    stopLoop()
    loadTokenRef.current++
    timelineRef.current = null
    setTimeline(null)
    setSnapshot(null)
    setPosition(0)
    positionRef.current = 0
    setError(null)
  }, [stopLoop])

  const seek = useCallback(
    (p: number) => {
      pause()
      applyPosition(p)
    },
    [pause, applyPosition],
  )

  useEffect(() => stopLoop, [stopLoop])

  return {
    timeline,
    snapshot,
    isLoading,
    isPlaying,
    position,
    speed,
    error,
    load,
    play,
    pause,
    toggle,
    stop,
    seek,
    setSpeed,
  }
}
