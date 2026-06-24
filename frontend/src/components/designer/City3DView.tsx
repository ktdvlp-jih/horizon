import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { Instance, Instances, OrbitControls, Sky } from '@react-three/drei'
import { Color } from 'three'
import { Lock, Pause, Play, Unlock, X } from 'lucide-react'
import type { Grid, TileType } from '@/types'
import { TILES, TILE_BY_TYPE, lensColor, type HeatmapKind } from '@/lib/tiles'

interface Props {
  open: boolean
  onClose: () => void
  grid: Grid
  /** Optional value overlay (temperature / risk / air) per cell. */
  values?: number[][] | null
  valueMin?: number
  valueMax?: number
  heatmapKind?: HeatmapKind
  showHeatmap?: boolean
  // Editing (optional)
  brush?: TileType
  onBrushChange?: (tile: TileType) => void
  onPaintCell?: (r: number, c: number) => void
  // 3D playback (optional)
  playing?: boolean
  loading?: boolean
  onPlay?: () => void
  onStop?: () => void
}

/** Block height (in voxels) per tile type — gives the city its 3D silhouette. */
const TILE_HEIGHT: Record<TileType, number> = {
  BUILDING: 4,
  INDUSTRY: 3,
  SEAWALL: 2,
  RETAINING: 2,
  SHELTER: 2,
  HIGH_GROUND: 2,
  TREE: 2,
  GREEN_BUFFER: 1,
  PARK: 1,
  PLAZA: 1,
  SIDEWALK: 1,
  ROAD: 1,
  BARE: 1,
  WATER: 1,
  WETLAND: 1,
  DRAIN: 1,
}

/** Top-face accent color (Minecraft-y "grass on dirt" look) per tile. */
const TILE_TOP: Partial<Record<TileType, string>> = {
  TREE: '#16a34a',
  PARK: '#4ade80',
  GREEN_BUFFER: '#22c55e',
  HIGH_GROUND: '#84cc16',
  BUILDING: '#cbd5e1',
}

const TREE_TRUNK = '#7c4a21'
const WATER_TILES = new Set<TileType>(['WATER', 'WETLAND'])

interface Block {
  key: string
  x: number
  y: number
  z: number
  color: Color
}

interface Column {
  key: string
  x: number
  y: number
  z: number
  scaleY: number
  color: Color
  hot: boolean
}

/** Deterministic tiny brightness variation so blocks don't look flat. */
function jitter(r: number, c: number, h: number): number {
  const n = Math.sin(r * 12.9898 + c * 78.233 + h * 37.719) * 43758.5453
  return (n - Math.floor(n) - 0.5) * 0.08
}

function makeColor(hex: string, r: number, c: number, h: number): Color {
  const col = new Color(hex)
  col.offsetHSL(0, 0, jitter(r, c, h))
  return col
}

/** City blocks — always natural tile colors (climate is shown via columns). */
function buildBlocks(grid: Grid): { solid: Block[]; water: Block[] } {
  const size = grid.length
  const offset = (size - 1) / 2
  const solid: Block[] = []
  const water: Block[] = []

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const tile = grid[r][c]
      const meta = TILE_BY_TYPE[tile]
      const baseColor = meta?.swatch ?? '#cccccc'
      const height = TILE_HEIGHT[tile] ?? 1

      if (WATER_TILES.has(tile)) {
        water.push({
          key: `${r}-${c}-w`,
          x: c - offset,
          y: 0.32,
          z: r - offset,
          color: new Color(baseColor),
        })
        continue
      }

      for (let h = 0; h < height; h++) {
        const isTop = h === height - 1
        let hex: string
        if (tile === 'TREE') hex = isTop ? TILE_TOP.TREE! : TREE_TRUNK
        else if (isTop) hex = TILE_TOP[tile] ?? baseColor
        else hex = baseColor
        solid.push({
          key: `${r}-${c}-${h}`,
          x: c - offset,
          y: h + 0.5,
          z: r - offset,
          color: makeColor(hex, r, c, h),
        })
      }
    }
  }
  return { solid, water }
}

/**
 * Climate columns rising from each tile (option B): a translucent glow whose
 * COLOR encodes the lens value and HEIGHT encodes intensity. Blocks keep their
 * own colors underneath, so the city stays readable while heat/PM/risk "rises".
 */
function buildColumns(
  grid: Grid,
  values: number[][] | null,
  min: number,
  max: number,
  kind: HeatmapKind,
): Column[] {
  if (!values) return []
  const size = grid.length
  const offset = (size - 1) / 2
  const span = max - min
  const cols: Column[] = []

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = values[r]?.[c]
      if (v == null) continue
      const t = span >= 0.001 ? Math.min(1, Math.max(0, (v - min) / span)) : 0.5
      const tileTop = TILE_HEIGHT[grid[r][c]] ?? 1
      const colH = 0.25 + t * 2.8
      cols.push({
        key: `${r}-${c}-col`,
        x: c - offset,
        y: tileTop + 0.1 + colH / 2,
        z: r - offset,
        scaleY: colH,
        color: new Color(lensColor(kind, v, min, max)),
        hot: t >= 0.55,
      })
    }
  }
  return cols
}

function Scene({
  grid,
  solid,
  water,
  columns,
  size,
  editing,
  dragRef,
  onPaintCell,
}: {
  grid: Grid
  solid: Block[]
  water: Block[]
  columns: Column[]
  size: number
  editing: boolean
  dragRef: React.MutableRefObject<{ x: number; y: number; moved: boolean }>
  onPaintCell?: (r: number, c: number) => void
}) {
  const offset = (size - 1) / 2
  const [hover, setHover] = useState<[number, number] | null>(null)

  const handlePick = (r: number, c: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const dx = Math.abs(e.nativeEvent.clientX - dragRef.current.x)
    const dy = Math.abs(e.nativeEvent.clientY - dragRef.current.y)
    if (dx > 5 || dy > 5) return // was a camera drag, not a click
    onPaintCell?.(r, c)
  }

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[size, size * 1.5, size * 0.6]} intensity={1.4} castShadow />
      <Sky sunPosition={[size, size, size]} turbidity={6} rayleigh={1.2} />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[size + 4, size + 4]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>

      {/* Solid voxels */}
      <Instances limit={size * size * 6} castShadow receiveShadow>
        <boxGeometry args={[0.92, 0.92, 0.92]} />
        <meshStandardMaterial roughness={0.85} metalness={0.05} flatShading />
        {solid.map((b) => (
          <Instance key={b.key} position={[b.x, b.y, b.z]} color={b.color} />
        ))}
      </Instances>

      {/* Translucent water, sitting lower */}
      {water.length > 0 && (
        <Instances limit={size * size}>
          <boxGeometry args={[0.96, 0.5, 0.96]} />
          <meshStandardMaterial transparent opacity={0.66} roughness={0.2} metalness={0.1} />
          {water.map((b) => (
            <Instance key={b.key} position={[b.x, b.y, b.z]} color={b.color} />
          ))}
        </Instances>
      )}

      {/* Climate glow columns (option B) — color = value, height = intensity */}
      {columns.length > 0 && (
        <Instances limit={size * size}>
          <boxGeometry args={[0.5, 1, 0.5]} />
          <meshBasicMaterial transparent opacity={0.42} depthWrite={false} toneMapped={false} />
          {columns.map((col) => (
            <Instance
              key={col.key}
              position={[col.x, col.y, col.z]}
              scale={[1, col.scaleY, 1]}
              color={col.color}
            />
          ))}
        </Instances>
      )}

      {/* Edit pick layer: invisible per-cell columns */}
      {editing &&
        grid.map((row, r) =>
          row.map((tile, c) => {
            const h = TILE_HEIGHT[tile] ?? 1
            const isHover = hover?.[0] === r && hover?.[1] === c
            return (
              <mesh
                key={`pick-${r}-${c}`}
                position={[c - offset, h / 2 + 0.05, r - offset]}
                onClick={handlePick(r, c)}
                onPointerOver={(e) => {
                  e.stopPropagation()
                  setHover([r, c])
                }}
                onPointerOut={() => setHover(null)}
              >
                <boxGeometry args={[0.98, h + 0.1, 0.98]} />
                <meshBasicMaterial
                  transparent
                  opacity={isHover ? 0.25 : 0}
                  color="#fde68a"
                  depthWrite={false}
                />
              </mesh>
            )
          }),
        )}
    </>
  )
}

export default function City3DView({
  open,
  onClose,
  grid,
  values = null,
  valueMin = 0,
  valueMax = 1,
  heatmapKind = 'temp',
  showHeatmap = false,
  brush,
  onBrushChange,
  onPaintCell,
  playing = false,
  loading = false,
  onPlay,
  onStop,
}: Props) {
  const [heat, setHeat] = useState(showHeatmap)
  const [editing, setEditing] = useState(false)
  const dragRef = useRef({ x: 0, y: 0, moved: false })

  const canEdit = !!onPaintCell
  const canAnimate = !!onPlay

  useEffect(() => setHeat(showHeatmap || playing), [showHeatmap, playing, open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const size = grid.length
  const { solid, water } = useMemo(() => buildBlocks(grid), [grid])
  const columns = useMemo(
    () => (heat ? buildColumns(grid, values, valueMin, valueMax, heatmapKind) : []),
    [heat, grid, values, valueMin, valueMax, heatmapKind],
  )

  if (!open) return null

  const camDist = size * 1.6

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">
            3D 도시 뷰 · 드래그 회전 / 휠 줌 / 우클릭 이동
          </h2>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition ${
                  editing ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                {editing ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                {editing ? '편집 중' : '잠금'}
              </button>
            )}
            {canAnimate && (
              <button
                type="button"
                onClick={() => (playing ? onStop?.() : onPlay?.())}
                disabled={loading}
                className="flex items-center gap-1 rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-sky-400 disabled:opacity-50"
              >
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {loading ? '로딩…' : playing ? '정지' : '재생'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setHeat((v) => !v)}
              title="블록 위로 솟는 기후 효과(열·미세먼지·위험)를 켜고 끕니다"
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                heat ? 'bg-amber-500 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              {heat ? '기후 효과 켜짐' : '기후 효과 끔'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white/10 p-1.5 text-slate-200 transition hover:bg-white/20"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Edit palette */}
        {editing && (
          <div className="flex flex-wrap gap-1 border-b border-white/10 bg-slate-800/60 px-3 py-2">
            {TILES.map((tile) => (
              <button
                key={tile.type}
                type="button"
                onClick={() => onBrushChange?.(tile.type)}
                title={tile.label}
                className={`flex h-8 items-center gap-1 rounded-md border px-2 text-xs transition ${
                  brush === tile.type
                    ? 'border-emerald-400 bg-emerald-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded text-[11px]"
                  style={{ backgroundColor: tile.swatch }}
                >
                  {tile.emoji}
                </span>
                <span className="hidden sm:inline">{tile.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="relative flex-1">
          <Canvas
            shadows
            camera={{ position: [camDist, camDist, camDist], fov: 45 }}
            onPointerDown={(e) => {
              dragRef.current = { x: e.clientX, y: e.clientY, moved: false }
            }}
          >
            <Scene
              grid={grid}
              solid={solid}
              water={water}
              columns={columns}
              size={size}
              editing={editing}
              dragRef={dragRef}
              onPaintCell={onPaintCell}
            />
            <OrbitControls
              enableDamping
              maxPolarAngle={Math.PI / 2.05}
              minDistance={size * 0.6}
              maxDistance={size * 4}
            />
          </Canvas>

          <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-center text-[11px] text-white/80">
            {editing
              ? '팔레트에서 타일을 고르고, 도시 블록을 클릭해 칠하세요.'
              : heat
                ? '솟아오른 빛기둥 = 기후 강도. 빨갛고 높을수록 뜨겁고(위험), 낮고 푸를수록 시원합니다.'
                : '건물·공장은 높게, 공원·물은 낮게 — 타일 높이로 입체감을 표현합니다.'}
          </p>
        </div>
      </div>
    </div>
  )
}
