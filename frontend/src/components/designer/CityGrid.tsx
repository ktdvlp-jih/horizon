import { useCallback, useEffect, useRef, useState } from 'react'
import type { Grid, SimulationResult, TileType } from '@/types'
import { TILE_BY_TYPE, tempToColor } from '@/lib/tiles'
import ClimateParticles from './ClimateParticles'

interface Props {
  grid: Grid
  result: SimulationResult | null
  showHeatmap: boolean
  onPaint: (r: number, c: number) => void
  animatedTemps?: number[][] | null
  colorMin?: number
  colorMax?: number
  ambient?: boolean
  particles?: boolean
  solarIntensity?: number
}

function ambientClass(tile: TileType, norm: number): string | null {
  if (norm >= 0.62) return 'fx-heat'
  if (norm <= 0.4 || tile === 'WATER' || tile === 'TREE' || tile === 'PARK') return 'fx-cool'
  return null
}

export default function CityGrid({
  grid,
  result,
  showHeatmap,
  onPaint,
  animatedTemps = null,
  colorMin,
  colorMax,
  ambient = false,
  particles = false,
  solarIntensity = 1,
}: Props) {
  const [painting, setPainting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stop = () => setPainting(false)
    window.addEventListener('pointerup', stop)
    return () => window.removeEventListener('pointerup', stop)
  }, [])

  const size = grid.length
  const animating = !!animatedTemps
  const temps = animating ? animatedTemps : result?.surfaceTemps ?? null
  const heat = animating || showHeatmap
  const min = animating ? colorMin ?? 0 : result?.metrics.minSurfaceTemp ?? 0
  const max = animating ? colorMax ?? 1 : result?.metrics.maxSurfaceTemp ?? 1

  const normAt = useCallback(
    (r: number, c: number) => {
      if (!temps || max - min < 0.001) return 0.5
      return Math.min(1, Math.max(0, (temps[r][c] - min) / (max - min)))
    },
    [temps, min, max],
  )

  const cellColor = useCallback(
    (r: number, c: number) => {
      if (heat && temps) {
        return tempToColor(temps[r][c], min, max)
      }
      return TILE_BY_TYPE[grid[r][c]].swatch
    },
    [heat, temps, grid, min, max],
  )

  // Subtle sky tint that brightens toward midday during playback.
  const s = Math.min(1, Math.max(0, solarIntensity))
  const skyStyle = {
    background: `radial-gradient(120% 80% at 50% -10%,
      hsla(${205 - (1 - s) * 35}, ${50 + s * 30}%, ${85 - (1 - s) * 30}%, ${0.12 + s * 0.18}),
      transparent 70%)`,
  }

  return (
    <div className="relative" ref={containerRef}>
      {animating && (
        <div className="pointer-events-none absolute -inset-3 rounded-2xl" style={skyStyle} aria-hidden />
      )}

      <div
        className="relative grid touch-none select-none gap-[2px] rounded-xl bg-slate-200 p-[2px]"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        role="grid"
        aria-label="도시 설계 격자"
      >
        {grid.map((row, r) =>
          row.map((tile, c) => {
            const fx = ambient && temps ? ambientClass(tile, normAt(r, c)) : null
            return (
              <button
                key={`${r}-${c}`}
                role="gridcell"
                aria-label={`${r + 1}행 ${c + 1}열 ${TILE_BY_TYPE[tile].label}`}
                onPointerDown={() => {
                  setPainting(true)
                  onPaint(r, c)
                }}
                onPointerEnter={() => {
                  if (painting) onPaint(r, c)
                }}
                className="relative aspect-square overflow-hidden rounded-[3px] text-[10px] leading-none transition-colors duration-150"
                style={{ backgroundColor: cellColor(r, c) }}
              >
                {fx && <span className={`pointer-events-none absolute inset-0 ${fx}`} aria-hidden />}
                {!heat && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-80">
                    {TILE_BY_TYPE[tile].emoji}
                  </span>
                )}
                {heat && temps && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-semibold text-white/90">
                    {Math.round(temps[r][c])}
                  </span>
                )}
              </button>
            )
          }),
        )}
      </div>

      <ClimateParticles temps={temps} min={min} max={max} active={animating && particles} />
    </div>
  )
}
