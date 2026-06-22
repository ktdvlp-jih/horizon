import type { DisasterMode, DisasterTileType, TileType } from '@/types'
import { TILES } from '@/lib/tiles'

export interface DisasterTileMeta {
  type: DisasterTileType
  label: string
  emoji: string
  swatch: string
  hint: string
  modes: DisasterMode[]
}

const DISASTER_ONLY: DisasterTileMeta[] = [
  {
    type: 'SEAWALL',
    label: '방조제',
    emoji: '🧱',
    swatch: '#64748b',
    hint: '태풍·해일 파도·침수 완화',
    modes: ['typhoon', 'tsunami'],
  },
  {
    type: 'DRAIN',
    label: '배수로',
    emoji: '🕳️',
    swatch: '#475569',
    hint: '호우 침수 배제',
    modes: ['typhoon'],
  },
  {
    type: 'GREEN_BUFFER',
    label: '녹지 완충',
    emoji: '🌿',
    swatch: '#4ade80',
    hint: '풍속·파랑 완화',
    modes: ['typhoon', 'tsunami'],
  },
  {
    type: 'SHELTER',
    label: '대피소',
    emoji: '🏕️',
    swatch: '#f59e0b',
    hint: '대피·집결 공간',
    modes: ['typhoon', 'earthquake', 'tsunami'],
  },
  {
    type: 'RETAINING',
    label: '옹벽',
    emoji: '🪨',
    swatch: '#78716c',
    hint: '지진 시 낙석·붕괴 완화',
    modes: ['earthquake'],
  },
  {
    type: 'HIGH_GROUND',
    label: '고지',
    emoji: '⛰️',
    swatch: '#a3e635',
    hint: '해일·지진 대피 고지',
    modes: ['earthquake', 'tsunami'],
  },
]

export const DISASTER_TILES: DisasterTileMeta[] = [
  ...TILES.map((t) => ({
    type: t.type as DisasterTileType,
    label: t.label,
    emoji: t.emoji,
    swatch: t.swatch,
    hint: t.hint,
    modes: ['typhoon', 'earthquake', 'tsunami'] as DisasterMode[],
  })),
  ...DISASTER_ONLY,
]

export const DISASTER_TILE_BY_TYPE: Record<string, DisasterTileMeta> = DISASTER_TILES.reduce(
  (acc, t) => {
    acc[t.type] = t
    return acc
  },
  {} as Record<string, DisasterTileMeta>,
)

export function tilesForMode(mode: DisasterMode): DisasterTileMeta[] {
  return DISASTER_TILES.filter((t) => t.modes.includes(mode))
}

/** Maps risk 0..1 to heatmap color (green safe -> red danger). */
export function riskToColor(risk: number, min: number, max: number): string {
  if (max - min < 0.001) return 'hsl(120, 60%, 50%)'
  const t = Math.min(1, Math.max(0, (risk - min) / (max - min)))
  const hue = 120 - t * 120
  return `hsl(${hue}, 75%, ${52 - t * 10}%)`
}

export function createDisasterInitialGrid(mode: DisasterMode): TileType[] {
  const row: TileType[] = []
  for (let c = 0; c < 10; c++) {
    if (mode === 'tsunami' && c < 3) row.push('WATER')
    else if (mode === 'typhoon' && c < 2) row.push('ROAD')
    else row.push('BUILDING')
  }
  return row
}

export const DISASTER_MODE_LABELS: Record<DisasterMode, string> = {
  typhoon: '태풍',
  earthquake: '지진',
  tsunami: '해일',
}

export const DISASTER_DESCRIPTION =
  '실제 재난 사례 시나리오로 도시 대응을 설계하고, 위험 히트맵으로 결과를 확인하세요.'
