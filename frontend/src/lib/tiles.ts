import type { TileType } from '@/types'

export interface TileMeta {
  type: TileType
  label: string
  emoji: string
  swatch: string
  hint: string
}

export const TILES: TileMeta[] = [
  { type: 'BUILDING', label: '건물', emoji: '🏢', swatch: '#9ca3af', hint: '콘크리트·열 저장, 열섬 강화' },
  { type: 'ROAD', label: '도로', emoji: '🛣️', swatch: '#4b5563', hint: '아스팔트, 가장 뜨거움' },
  { type: 'BARE', label: '나대지', emoji: '🟫', swatch: '#a8a29e', hint: '빈 땅, 중간 정도' },
  { type: 'PARK', label: '공원', emoji: '🌱', swatch: '#86efac', hint: '잔디 증발산 냉각' },
  { type: 'TREE', label: '가로수', emoji: '🌳', swatch: '#22c55e', hint: '그늘+증발산, 강한 냉각' },
  { type: 'WATER', label: '수변', emoji: '💧', swatch: '#38bdf8', hint: '물 증발, 가장 시원함' },
]

export const TILE_BY_TYPE: Record<TileType, TileMeta> = TILES.reduce(
  (acc, t) => {
    acc[t.type] = t
    return acc
  },
  {} as Record<TileType, TileMeta>,
)

/** Maps a surface temperature to a heatmap color (blue -> red). */
export function tempToColor(temp: number, min: number, max: number): string {
  if (max - min < 0.001) return 'hsl(30, 80%, 55%)'
  const t = Math.min(1, Math.max(0, (temp - min) / (max - min)))
  // hue 220 (cool blue) -> 0 (hot red)
  const hue = 220 - t * 220
  return `hsl(${hue}, 85%, ${58 - t * 12}%)`
}
