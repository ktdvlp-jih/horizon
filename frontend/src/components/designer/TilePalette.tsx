import type { TileType } from '@/types'
import { TILES } from '@/lib/tiles'
import { cn } from '@/lib/utils'

interface Props {
  brush: TileType
  onSelect: (tile: TileType) => void
}

export default function TilePalette({ brush, onSelect }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-2">
      {TILES.map((tile) => (
        <button
          key={tile.type}
          onClick={() => onSelect(tile.type)}
          className={cn(
            'flex items-center gap-2 rounded-lg border p-2 text-left transition-all',
            brush === tile.type
              ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200'
              : 'border-slate-200 bg-white hover:border-slate-300',
          )}
          title={tile.hint}
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-base"
            style={{ backgroundColor: tile.swatch }}
          >
            {tile.emoji}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-800">{tile.label}</span>
            <span className="hidden truncate text-[11px] text-slate-400 lg:block">{tile.hint}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
