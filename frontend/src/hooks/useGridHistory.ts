import { useCallback, useRef, useState } from 'react'
import type { Grid, TileType } from '@/types'
import { cloneGrid, gridsEqual, setCell } from '@/lib/grid'

const DEFAULT_MAX = 20

export function useGridHistory(initial: Grid, maxSize = DEFAULT_MAX) {
  const [grid, setGridState] = useState(() => cloneGrid(initial))
  const [historyTick, setHistoryTick] = useState(0)

  const gridRef = useRef(grid)
  const pastRef = useRef<Grid[]>([])
  const futureRef = useRef<Grid[]>([])
  const strokeStartRef = useRef<Grid | null>(null)
  const paintRafRef = useRef<number | null>(null)
  const historyRafRef = useRef<number | null>(null)
  const pendingUndoRef = useRef(0)
  const pendingRedoRef = useRef(0)

  gridRef.current = grid

  const bumpHistory = useCallback(() => setHistoryTick((t) => t + 1), [])

  const applyGridDirect = useCallback((next: Grid) => {
    gridRef.current = next
    setGridState(next)
  }, [])

  const cancelPaintRaf = useCallback(() => {
    if (paintRafRef.current != null) {
      cancelAnimationFrame(paintRafRef.current)
      paintRafRef.current = null
    }
  }, [])

  const flushPaint = useCallback(() => {
    cancelPaintRaf()
    setGridState(gridRef.current)
  }, [cancelPaintRaf])

  const schedulePaintFlush = useCallback(() => {
    if (paintRafRef.current != null) return
    paintRafRef.current = requestAnimationFrame(() => {
      paintRafRef.current = null
      setGridState(gridRef.current)
    })
  }, [])

  const flushHistoryOps = useCallback(() => {
    historyRafRef.current = null

    let undos = pendingUndoRef.current
    let redos = pendingRedoRef.current
    pendingUndoRef.current = 0
    pendingRedoRef.current = 0

    if (undos === 0 && redos === 0) return

    cancelPaintRaf()
    strokeStartRef.current = null

    // Net opposing ops (rapid Ctrl+Z then Ctrl+Y within same frame).
    if (undos > 0 && redos > 0) {
      const net = undos - redos
      undos = Math.max(0, net)
      redos = Math.max(0, -net)
    }

    let changed = false

    while (undos > 0 && pastRef.current.length > 0) {
      futureRef.current.push(cloneGrid(gridRef.current))
      const prev = pastRef.current.pop()!
      applyGridDirect(prev)
      undos--
      changed = true
    }

    while (redos > 0 && futureRef.current.length > 0) {
      pastRef.current.push(cloneGrid(gridRef.current))
      if (pastRef.current.length > maxSize) pastRef.current.shift()
      const next = futureRef.current.pop()!
      applyGridDirect(next)
      redos--
      changed = true
    }

    if (changed) bumpHistory()
  }, [applyGridDirect, bumpHistory, cancelPaintRaf, maxSize])

  const scheduleHistoryFlush = useCallback(() => {
    if (historyRafRef.current != null) return
    historyRafRef.current = requestAnimationFrame(flushHistoryOps)
  }, [flushHistoryOps])

  const paintCell = useCallback(
    (r: number, c: number, tile: TileType) => {
      const current = gridRef.current
      if (current[r][c] === tile) return
      gridRef.current = setCell(current, r, c, tile)
      schedulePaintFlush()
    },
    [schedulePaintFlush],
  )

  const reset = useCallback(
    (g: Grid) => {
      cancelPaintRaf()
      pendingUndoRef.current = 0
      pendingRedoRef.current = 0
      if (historyRafRef.current != null) {
        cancelAnimationFrame(historyRafRef.current)
        historyRafRef.current = null
      }
      pastRef.current = []
      futureRef.current = []
      strokeStartRef.current = null
      applyGridDirect(cloneGrid(g))
      bumpHistory()
    },
    [applyGridDirect, bumpHistory, cancelPaintRaf],
  )

  const replaceWithHistory = useCallback(
    (g: Grid) => {
      flushPaint()
      pastRef.current = [...pastRef.current.slice(-(maxSize - 1)), cloneGrid(gridRef.current)]
      futureRef.current = []
      strokeStartRef.current = null
      applyGridDirect(cloneGrid(g))
      bumpHistory()
    },
    [applyGridDirect, bumpHistory, flushPaint, maxSize],
  )

  const beginStroke = useCallback(() => {
    flushPaint()
    strokeStartRef.current = cloneGrid(gridRef.current)
  }, [flushPaint])

  const endStroke = useCallback(() => {
    flushPaint()
    const start = strokeStartRef.current
    strokeStartRef.current = null
    if (!start) return
    const current = gridRef.current
    if (gridsEqual(start, current)) return
    pastRef.current = [...pastRef.current.slice(-(maxSize - 1)), start]
    futureRef.current = []
    bumpHistory()
  }, [bumpHistory, flushPaint, maxSize])

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return
    pendingUndoRef.current = Math.min(pendingUndoRef.current + 1, pastRef.current.length)
    scheduleHistoryFlush()
  }, [scheduleHistoryFlush])

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return
    pendingRedoRef.current = Math.min(pendingRedoRef.current + 1, futureRef.current.length)
    scheduleHistoryFlush()
  }, [scheduleHistoryFlush])

  return {
    grid,
    paintCell,
    flushPaint,
    reset,
    replaceWithHistory,
    beginStroke,
    endStroke,
    undo,
    redo,
    canUndo: historyTick >= 0 && pastRef.current.length > 0,
    canRedo: historyTick >= 0 && futureRef.current.length > 0,
  }
}
