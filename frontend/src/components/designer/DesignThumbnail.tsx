import type { Grid } from '@/types'
import { TILE_BY_TYPE } from '@/lib/tiles'

interface Props {
  grid: Grid
  size?: number
  className?: string
}

/** Mini CSS grid preview for saved designs. */
export default function DesignThumbnail({ grid, size = 10, className = '' }: Props) {
  const n = grid.length || size
  return (
    <div
      className={`grid gap-px rounded-lg bg-slate-200 p-px ${className}`}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {grid.flatMap((row, r) =>
        row.map((tile, c) => (
          <div
            key={`${r}-${c}`}
            className="aspect-square rounded-[1px]"
            style={{ backgroundColor: TILE_BY_TYPE[tile]?.swatch ?? '#ccc' }}
          />
        )),
      )}
    </div>
  )
}
