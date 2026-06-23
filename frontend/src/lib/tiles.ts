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
  { type: 'BARE', label: '맨땅', emoji: '🟫', swatch: '#a8a29e', hint: '흙·자연 토양, 포장 전 빈터' },
  { type: 'PARK', label: '공원', emoji: '🌱', swatch: '#86efac', hint: '잔디 증발산 냉각' },
  { type: 'TREE', label: '가로수', emoji: '🌳', swatch: '#22c55e', hint: '그늘+증발산, 강한 냉각' },
  { type: 'WATER', label: '수변', emoji: '💧', swatch: '#38bdf8', hint: '물 증발, 가장 시원함' },
  { type: 'SIDEWALK', label: '보도', emoji: '🚶', swatch: '#78716c', hint: '보행 보도, 도로보다 덜 뜨거움' },
  { type: 'WETLAND', label: '습지', emoji: '🪷', swatch: '#2dd4bf', hint: '습지·연못, 증발과 녹지로 주변을 식힘' },
  { type: 'PLAZA', label: '광장', emoji: '🏛️', swatch: '#d6d3d1', hint: '밝은 포장, 반사로 열 흡수 감소' },
  { type: 'SEAWALL', label: '방조제', emoji: '🧱', swatch: '#64748b', hint: '태풍·해일 방어' },
  { type: 'DRAIN', label: '배수로', emoji: '🕳️', swatch: '#475569', hint: '침수 배제' },
  { type: 'GREEN_BUFFER', label: '녹지완충', emoji: '🌿', swatch: '#4ade80', hint: '풍·파랑 완화' },
  { type: 'SHELTER', label: '대피소', emoji: '🏕️', swatch: '#f59e0b', hint: '대피 공간' },
  { type: 'RETAINING', label: '옹벽', emoji: '🪨', swatch: '#78716c', hint: '지진 붕괴 완화' },
  { type: 'HIGH_GROUND', label: '고지', emoji: '⛰️', swatch: '#a3e635', hint: '해일·지진 대피 고지' },
]

export const TILE_BY_TYPE: Record<TileType, TileMeta> = TILES.reduce(
  (acc, t) => {
    acc[t.type] = t
    return acc
  },
  {} as Record<TileType, TileMeta>,
)

/** Tile counts sorted by usage (for metrics panel). */
export function summarizeTileCounts(counts: Record<string, number>) {
  return TILES.map((t) => ({ meta: t, count: counts[t.type] ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
}

/** Maps a surface temperature to a heatmap color (blue -> red). */
export function tempToColor(temp: number, min: number, max: number): string {
  if (max - min < 0.001) return 'hsl(30, 80%, 55%)'
  const t = Math.min(1, Math.max(0, (temp - min) / (max - min)))
  // hue 220 (cool blue) -> 0 (hot red)
  const hue = 220 - t * 220
  return `hsl(${hue}, 85%, ${58 - t * 12}%)`
}

/** Maps risk 0..1 (green safe -> red danger). */
export function riskToColor(risk: number, min: number, max: number): string {
  if (max - min < 0.001) return 'hsl(120, 60%, 50%)'
  const t = Math.min(1, Math.max(0, (risk - min) / (max - min)))
  const hue = 120 - t * 120
  return `hsl(${hue}, 75%, ${52 - t * 10}%)`
}

/** Maps PM concentration (clean cyan -> hazardous deep purple). */
export function airToColor(pm: number, min: number, max: number): string {
  if (max - min < 0.001) return 'hsl(190, 65%, 55%)'
  const t = Math.min(1, Math.max(0, (pm - min) / (max - min)))
  // hue 190 (clean cyan) -> 290 (hazardous purple)
  const hue = 190 + t * 100
  return `hsl(${hue}, ${55 + t * 25}%, ${62 - t * 26}%)`
}

export type HeatmapKind = 'temp' | 'risk' | 'air'

/** Color for a lens overlay value given its kind. */
export function lensColor(kind: HeatmapKind, value: number, min: number, max: number): string {
  switch (kind) {
    case 'temp':
      return tempToColor(value, min, max)
    case 'air':
      return airToColor(value, min, max)
    case 'risk':
    default:
      return riskToColor(value, min, max)
  }
}
