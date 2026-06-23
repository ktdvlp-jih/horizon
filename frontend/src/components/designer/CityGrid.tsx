import { memo, useCallback, useRef } from 'react'
import type { Grid, SimulationResult, TileType } from '@/types'
import { cellFromPointer } from '@/lib/grid'
import { TILE_BY_TYPE, tempToColor, lensColor, type HeatmapKind } from '@/lib/tiles'
import ClimateParticles from './ClimateParticles'

interface Props {
  grid: Grid
  result: SimulationResult | null
  showHeatmap: boolean
  onPaint: (r: number, c: number) => void
  onStrokeStart?: () => void
  onStrokeEnd?: () => void
  animatedTemps?: number[][] | null
  colorMin?: number
  colorMax?: number
  ambient?: boolean
  particles?: boolean
  solarIntensity?: number
  /** Generic lens value overlay (risk / air) instead of temperature. */
  riskValues?: number[][] | null
  animatedRisk?: number[][] | null
  heatmapKind?: HeatmapKind
}

function isCoolingTile(tile: TileType): boolean {
  return tile === 'WATER' || tile === 'TREE' || tile === 'PARK' || tile === 'WETLAND'
}

function ambientClass(tile: TileType, norm: number): string | null {
  if (isCoolingTile(tile)) return 'fx-cool'
  if (norm >= 0.62) return 'fx-heat'
  if (norm <= 0.4) return 'fx-cool'
  return null
}

export default memo(CityGrid)

function CityGrid({
  grid,
  result,
  showHeatmap,
  onPaint,
  onStrokeStart,
  onStrokeEnd,
  animatedTemps = null,
  colorMin,
  colorMax,
  ambient = false,
  particles = false,
  solarIntensity = 1,
  riskValues = null,
  animatedRisk = null,
  heatmapKind = 'temp',
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const strokeActiveRef = useRef(false)
  const lastCellRef = useRef<[number, number] | null>(null)
  const onPaintRef = useRef(onPaint)
  const onStrokeStartRef = useRef(onStrokeStart)
  const onStrokeEndRef = useRef(onStrokeEnd)

  onPaintRef.current = onPaint
  onStrokeStartRef.current = onStrokeStart
  onStrokeEndRef.current = onStrokeEnd

  const size = grid.length
  const cellTextClass = size >= 12 ? 'text-[8px]' : 'text-[10px]'
  const animating = !!animatedTemps || !!animatedRisk
  const isValueOverlay = heatmapKind === 'risk' || heatmapKind === 'air'
  const temps = !isValueOverlay && animating ? animatedTemps : !isValueOverlay ? result?.surfaceTemps ?? null : null
  const risks = isValueOverlay ? (animating ? animatedRisk : riskValues) : null
  const heat = animating || showHeatmap
  const min = isValueOverlay
    ? (animating ? colorMin ?? 0 : colorMin ?? 0)
    : animating
      ? colorMin ?? 0
      : result?.metrics.minSurfaceTemp ?? 0
  const max = isValueOverlay
    ? (animating ? colorMax ?? 1 : colorMax ?? 1)
    : animating
      ? colorMax ?? 1
      : result?.metrics.maxSurfaceTemp ?? 1

  const paintAt = useCallback(
    (clientX: number, clientY: number) => {
      const el = gridRef.current
      if (!el) return
      const cell = cellFromPointer(el, clientX, clientY, size)
      if (!cell) return
      const [r, c] = cell
      if (lastCellRef.current?.[0] === r && lastCellRef.current?.[1] === c) return
      lastCellRef.current = [r, c]
      onPaintRef.current(r, c)
    },
    [size],
  )

  const finishStroke = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!strokeActiveRef.current) return
    strokeActiveRef.current = false
    lastCellRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    onStrokeEndRef.current?.()
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      e.preventDefault()
      strokeActiveRef.current = true
      lastCellRef.current = null
      e.currentTarget.setPointerCapture(e.pointerId)
      onStrokeStartRef.current?.()
      paintAt(e.clientX, e.clientY)
    },
    [paintAt],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!strokeActiveRef.current) return
      paintAt(e.clientX, e.clientY)
    },
    [paintAt],
  )

  const s = Math.min(1, Math.max(0, solarIntensity))
  const skyStyle = {
    background: `radial-gradient(120% 80% at 50% -10%,
      hsla(${205 - (1 - s) * 35}, ${50 + s * 30}%, ${85 - (1 - s) * 30}%, ${0.12 + s * 0.18}),
      transparent 70%)`,
  }

  const showAmbientFx = ambient && temps && (showHeatmap || animating)
  const span = max - min

  return (
    <div className="relative">
      {animating && (
        <div className="pointer-events-none absolute -inset-3 rounded-2xl" style={skyStyle} aria-hidden />
      )}

      <div
        ref={gridRef}
        className="relative grid touch-none select-none gap-[2px] rounded-xl bg-slate-200 p-[2px]"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, touchAction: 'none' }}
        role="grid"
        aria-label="도시 설계 격자"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        onLostPointerCapture={(e) => {
          if (strokeActiveRef.current) finishStroke(e)
        }}
      >
        {grid.map((row, r) =>
          row.map((tile, c) => {
            const temp = !isValueOverlay && heat && temps ? temps[r][c] : null
            const risk = isValueOverlay && heat && risks ? risks[r][c] : null
            const norm =
              temp != null && span >= 0.001
                ? Math.min(1, Math.max(0, (temp - min) / span))
                : risk != null && span >= 0.001
                  ? Math.min(1, Math.max(0, (risk - min) / span))
                  : 0.5
            const bg =
              heat && temp != null
                ? tempToColor(temp, min, max)
                : heat && risk != null
                  ? lensColor(heatmapKind, risk, min, max)
                  : TILE_BY_TYPE[tile]?.swatch ?? '#ccc'

            return (
              <div
                key={`${r}-${c}`}
                role="gridcell"
                aria-label={`${r + 1}행 ${c + 1}열 ${TILE_BY_TYPE[tile]?.label ?? tile}`}
                className={`relative aspect-square overflow-hidden rounded-[3px] ${cellTextClass} leading-none`}
                style={{ backgroundColor: bg }}
              >
                {showAmbientFx && (
                  <span
                    className={`pointer-events-none absolute inset-0 ${ambientClass(tile, norm) ?? ''}`}
                    aria-hidden
                  />
                )}
                {!heat && TILE_BY_TYPE[tile] && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-80">
                    {TILE_BY_TYPE[tile].emoji}
                  </span>
                )}
                {heat && temp != null && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-semibold text-white/90">
                    {Math.round(temp)}
                  </span>
                )}
                {heat && risk != null && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-white/90">
                    {heatmapKind === 'air' ? Math.round(risk) : Math.round(risk * 100)}
                  </span>
                )}
              </div>
            )
          }),
        )}
      </div>

      <ClimateParticles temps={temps} min={min} max={max} active={animating && particles} />
    </div>
  )
}
