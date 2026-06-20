import type { TileType } from '@/types'
import { TILES } from '@/lib/tiles'
import { cn } from '@/lib/utils'

interface Props {
  brush: TileType
  onSelect: (tile: TileType) => void
}

export default function TilePalette({ brush, onSelect }: Props) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {TILES.map((tile) => (
        <button
          key={tile.type}
          type="button"
          onClick={() => onSelect(tile.type)}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-2 transition-all',
            brush === tile.type
              ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
          )}
          aria-label={tile.label}
          aria-pressed={brush === tile.type}
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-md text-lg leading-none"
            style={{ backgroundColor: tile.swatch }}
          >
            {tile.emoji}
          </span>
          <span className="w-full truncate text-center text-xs font-medium text-slate-700">
            {tile.label}
          </span>
        </button>
      ))}
    </div>
  )
}
