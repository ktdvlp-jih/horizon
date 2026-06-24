import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import {
  ContactShadows,
  Instance,
  Instances,
  OrbitControls,
  RoundedBox,
  Sky,
} from '@react-three/drei'
import {
  CanvasTexture,
  Color,
  RepeatWrapping,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from 'three'
import { Lock, Pause, Play, Unlock, X } from 'lucide-react'
import type { Grid, TileType } from '@/types'
import { TILES, lensColor, type HeatmapKind } from '@/lib/tiles'

interface Props {
  open: boolean
  onClose: () => void
  grid: Grid
  values?: number[][] | null
  valueMin?: number
  valueMax?: number
  heatmapKind?: HeatmapKind
  showHeatmap?: boolean
  brush?: TileType
  onBrushChange?: (tile: TileType) => void
  onPaintCell?: (r: number, c: number) => void
  playing?: boolean
  loading?: boolean
  onPlay?: () => void
  onStop?: () => void
}

/** Architectural massing-model palette: light structures, green nature, blue water. */
const ARCH = {
  building: '#eef1f5',
  industry: '#c2c6cd',
  wall: '#dce1e8',
  shelterBody: '#eef1f5',
  shelterRoof: '#e08a5b',
  highBody: '#cdb78f',
  highTop: '#9ccc65',
  road: '#d3dae2',
  line: '#aab2bd',
  slab: '#e2e7ed',
  drain: '#9aa3af',
  trunk: '#86603c',
  tree: '#5bab5e',
  treeDark: '#479a4b',
  park: '#8dc24f',
  water: '#5cb8e6',
}

function hash(r: number, c: number): number {
  const n = Math.sin(r * 127.1 + c * 311.7) * 43758.5453
  return n - Math.floor(n)
}

/** Building floors vary so the skyline reads like a real city, not a flat bar chart. */
function buildingFloors(r: number, c: number): number {
  return 2 + Math.floor(hash(r, c) * 5.5)
}

function tileTop(tile: TileType, r: number, c: number): number {
  switch (tile) {
    case 'BUILDING':
      return buildingFloors(r, c)
    case 'INDUSTRY':
      return 2.4
    case 'TREE':
      return 1.55
    case 'SEAWALL':
    case 'RETAINING':
      return 1.8
    case 'SHELTER':
      return 1.5
    case 'HIGH_GROUND':
      return 1.6
    case 'WATER':
    case 'WETLAND':
      return 0.28
    case 'PARK':
    case 'GREEN_BUFFER':
      return 0.4
    default:
      return 0.24
  }
}

function shade(hex: string | Color, amt: number): Color {
  const base = hex instanceof Color ? hex.clone() : new Color(hex)
  return base.offsetHSL(0, 0, amt)
}

type Facade = 'concrete' | 'glass' | 'warm'

/** One-floor window strip per facade style; tiled vertically per floor for a real building skin. */
const FACADE_BASE: Record<Facade, { wall: string; spandrel: string; win: string; winLit: string }> = {
  concrete: { wall: '#e3e7ec', spandrel: '#c2cad3', win: '#7f8c9c', winLit: '#aeb8c4' },
  glass: { wall: '#9fbdd1', spandrel: '#6f93ab', win: '#41657d', winLit: '#8fb6cf' },
  warm: { wall: '#e7ddcb', spandrel: '#cdbfa4', win: '#8a7c63', winLit: '#bcae8e' },
}

const baseCanvasCache = new Map<Facade, HTMLCanvasElement>()
const facadeTexCache = new Map<string, CanvasTexture>()

function facadeCanvas(variant: Facade): HTMLCanvasElement {
  const cached = baseCanvasCache.get(variant)
  if (cached) return cached
  const cfg = FACADE_BASE[variant]
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')!
  ctx.fillStyle = cfg.wall
  ctx.fillRect(0, 0, 64, 64)
  // spandrel band (concrete strip between floors)
  ctx.fillStyle = cfg.spandrel
  ctx.fillRect(0, 0, 64, 10)
  // window row
  const cols = 4
  const margin = 7
  const gap = 5
  const ww = (64 - margin * 2 - gap * (cols - 1)) / cols
  const wh = 38
  for (let i = 0; i < cols; i++) {
    ctx.fillStyle = Math.random() > 0.45 ? cfg.winLit : cfg.win
    ctx.fillRect(margin + i * (ww + gap), 16, ww, wh)
  }
  baseCanvasCache.set(variant, c)
  return c
}

/** Texture tiled `floors` times vertically so each floor shows a window row. */
function facadeTexture(variant: Facade, floors: number): CanvasTexture {
  const key = `${variant}-${floors}`
  const hit = facadeTexCache.get(key)
  if (hit) return hit
  const tex = new CanvasTexture(facadeCanvas(variant))
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.repeat.set(2, Math.max(1, Math.round(floors)))
  const t = tex as unknown as { colorSpace: string }
  t.colorSpace = 'srgb'
  facadeTexCache.set(key, tex)
  return tex
}

function buildingFacade(r: number, c: number): Facade {
  const h = hash(c * 3.1 + 5, r * 2.7 + 9)
  if (h > 0.64) return 'glass'
  if (h > 0.34) return 'concrete'
  return 'warm'
}

type TreeStyle = 'round' | 'pine' | 'layered'

function OneTree({
  x,
  z,
  scale,
  style,
  tint,
}: {
  x: number
  z: number
  scale: number
  style: TreeStyle
  tint: number
}) {
  const green = shade(ARCH.tree, tint)
  const dark = shade(ARCH.treeDark, tint * 0.5)
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.11, 0.8, 6]} />
        <meshStandardMaterial color={ARCH.trunk} roughness={1} />
      </mesh>
      {style === 'round' && (
        <>
          <mesh position={[0, 1.0, 0]} castShadow>
            <icosahedronGeometry args={[0.4, 1]} />
            <meshStandardMaterial color={green} flatShading roughness={0.95} />
          </mesh>
          <mesh position={[0.16, 1.22, -0.08]} castShadow>
            <icosahedronGeometry args={[0.26, 1]} />
            <meshStandardMaterial color={dark} flatShading roughness={0.95} />
          </mesh>
          <mesh position={[-0.16, 1.24, 0.12]} castShadow>
            <icosahedronGeometry args={[0.22, 1]} />
            <meshStandardMaterial color={shade(green, 0.05)} flatShading roughness={0.95} />
          </mesh>
        </>
      )}
      {style === 'pine' && (
        <>
          <mesh position={[0, 0.95, 0]} castShadow>
            <coneGeometry args={[0.5, 0.7, 7]} />
            <meshStandardMaterial color={shade(green, 0.04)} flatShading roughness={0.95} />
          </mesh>
          <mesh position={[0, 1.28, 0]} castShadow>
            <coneGeometry args={[0.4, 0.7, 7]} />
            <meshStandardMaterial color={green} flatShading roughness={0.95} />
          </mesh>
          <mesh position={[0, 1.62, 0]} castShadow>
            <coneGeometry args={[0.28, 0.6, 7]} />
            <meshStandardMaterial color={dark} flatShading roughness={0.95} />
          </mesh>
        </>
      )}
      {style === 'layered' && (
        <>
          <mesh position={[0, 0.92, 0]} castShadow>
            <sphereGeometry args={[0.42, 8, 7]} />
            <meshStandardMaterial color={green} flatShading roughness={0.95} />
          </mesh>
          <mesh position={[0, 1.32, 0]} castShadow>
            <sphereGeometry args={[0.3, 8, 7]} />
            <meshStandardMaterial color={shade(green, 0.06)} flatShading roughness={0.95} />
          </mesh>
        </>
      )}
    </group>
  )
}

function TreeCluster({ r, c }: { r: number; c: number }) {
  const styleHash = hash(r * 1.7 + 3, c * 2.3 + 1)
  const style: TreeStyle = styleHash > 0.66 ? 'pine' : styleHash > 0.33 ? 'layered' : 'round'
  const big = 0.95 + hash(c, r) * 0.4
  const tint = (hash(r, c) - 0.5) * 0.12
  const cluster = hash(r + 0.5, c + 0.5) > 0.55
  if (!cluster) return <OneTree x={0} z={0} scale={big} style={style} tint={tint} />
  return (
    <group>
      <OneTree x={-0.16} z={-0.12} scale={big * 0.88} style={style} tint={tint} />
      <OneTree x={0.2} z={0.16} scale={big * 0.6} style={style === 'pine' ? 'round' : 'pine'} tint={0.05} />
    </group>
  )
}

/** Animated smoke puffs rising from a factory chimney. */
function Smoke({ x, y, z }: { x: number; y: number; z: number }) {
  const puffs = useRef<(Mesh | null)[]>([])
  const N = 4
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (let i = 0; i < N; i++) {
      const m = puffs.current[i]
      if (!m) continue
      const local = (t * 0.35 + i / N) % 1
      m.position.y = y + local * 1.5
      m.position.x = x + Math.sin((local + i) * 3) * 0.12
      const s = 0.1 + local * 0.34
      m.scale.setScalar(s)
      ;(m.material as MeshStandardMaterial).opacity = 0.45 * (1 - local)
    }
  })
  return (
    <group>
      {Array.from({ length: N }).map((_, i) => (
        <mesh key={i} ref={(el) => (puffs.current[i] = el)} position={[x, y, z]}>
          <sphereGeometry args={[0.4, 8, 8]} />
          <meshStandardMaterial color="#c9ced6" transparent opacity={0.4} depthWrite={false} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

/** Reflective water surface with drifting caustic shimmer + foam edge. */
function WaterSurface({ wetland = false }: { wetland?: boolean }) {
  const shimmer = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!shimmer.current) return
    const t = clock.elapsedTime
    shimmer.current.position.x = Math.sin(t * 0.7) * 0.06
    shimmer.current.position.z = Math.cos(t * 0.55) * 0.06
    shimmer.current.rotation.y = Math.sin(t * 0.25) * 0.12
  })
  const top = wetland ? 0.2 : 0.28
  const color = wetland ? '#4d9aa6' : ARCH.water
  return (
    <group>
      <mesh position={[0, top / 2, 0]} receiveShadow>
        <boxGeometry args={[1, top, 1]} />
        <meshStandardMaterial color={color} transparent opacity={0.84} roughness={0.06} metalness={0.6} />
      </mesh>
      <group ref={shimmer} position={[0, top + 0.002, 0]}>
        {[-0.24, 0.02, 0.26].map((d, i) => (
          <mesh key={i} position={[d * 0.5, 0, d]} rotation={[-Math.PI / 2, 0, Math.PI / 5]}>
            <planeGeometry args={[0.55, 0.045]} />
            <meshBasicMaterial color="#e3f4ff" transparent opacity={0.55} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, top, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.5, 24]} />
        <meshBasicMaterial color="#eaf7ff" transparent opacity={0.32} depthWrite={false} side={2} />
      </mesh>
    </group>
  )
}

function Tile({
  tile,
  r,
  c,
  x,
  z,
  editing,
  onPick,
  onHover,
}: {
  tile: TileType
  r: number
  c: number
  x: number
  z: number
  editing: boolean
  onPick: (r: number, c: number, e: ThreeEvent<MouseEvent>) => void
  onHover: (cell: [number, number] | null) => void
}) {
  const j = (hash(r, c) - 0.5) * 0.05
  const handlers = editing
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => onPick(r, c, e),
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          onHover([r, c])
        },
        onPointerOut: () => onHover(null),
      }
    : {}

  let body: React.ReactNode

  if (tile === 'BUILDING') {
    const h = buildingFloors(r, c)
    const variant = buildingFacade(r, c)
    const floors = Math.max(1, Math.round(h))
    const tex = facadeTexture(variant, floors)
    const glass = variant === 'glass'
    const roofY = h + 0.06
    const tall = h > 4
    body = (
      <group>
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.88, h, 0.88]} />
          <meshStandardMaterial
            map={tex}
            color={shade('#ffffff', j)}
            roughness={glass ? 0.3 : 0.78}
            metalness={glass ? 0.35 : 0.04}
          />
        </mesh>
        {/* parapet roof cap */}
        <mesh position={[0, roofY, 0]} castShadow>
          <boxGeometry args={[0.9, 0.12, 0.9]} />
          <meshStandardMaterial color="#9aa6b3" roughness={0.85} />
        </mesh>
        {/* rooftop equipment for taller towers */}
        {tall && (
          <mesh position={[0.18, roofY + 0.22, -0.16]} castShadow>
            <boxGeometry args={[0.28, 0.3, 0.3]} />
            <meshStandardMaterial color="#7d8a98" roughness={0.9} />
          </mesh>
        )}
        {tall && (
          <mesh position={[-0.2, roofY + 0.3, 0.18]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.5, 6]} />
            <meshStandardMaterial color="#6b7280" />
          </mesh>
        )}
      </group>
    )
  } else if (tile === 'INDUSTRY') {
    body = (
      <group>
        <RoundedBox args={[0.88, 1.6, 0.88]} radius={0.03} smoothness={2} position={[0, 0.8, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={shade(ARCH.industry, j)} roughness={0.85} />
        </RoundedBox>
        {/* sawtooth factory roof */}
        {[-0.25, 0.05, 0.35].map((zz, i) => (
          <mesh key={i} position={[0, 1.72, zz]} rotation={[Math.PI / 7, 0, 0]} castShadow>
            <boxGeometry args={[0.8, 0.06, 0.22]} />
            <meshStandardMaterial color="#9aa6b3" />
          </mesh>
        ))}
        <mesh position={[0.26, 2.0, -0.26]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 1.3, 12]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
        {/* warning band near the chimney mouth */}
        <mesh position={[0.26, 2.55, -0.26]}>
          <cylinderGeometry args={[0.105, 0.105, 0.14, 12]} />
          <meshStandardMaterial color="#d9534f" />
        </mesh>
        <Smoke x={0.26} y={2.7} z={-0.26} />
      </group>
    )
  } else if (tile === 'TREE') {
    body = <TreeCluster r={r} c={c} />
  } else if (tile === 'WATER') {
    body = <WaterSurface />
  } else if (tile === 'WETLAND') {
    body = (
      <group>
        <WaterSurface wetland />
        {/* reeds */}
        {[[-0.25, -0.2], [0.2, 0.1], [0.0, 0.28], [-0.3, 0.25], [0.3, -0.28]].map(([rx, rz], i) => (
          <mesh key={i} position={[rx, 0.48, rz]} castShadow>
            <cylinderGeometry args={[0.02, 0.03, 0.64, 5]} />
            <meshStandardMaterial color="#6f9f4a" />
          </mesh>
        ))}
        {/* lily pads */}
        <mesh position={[0.22, 0.22, -0.18]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.16, 12]} />
          <meshStandardMaterial color="#5fae57" side={2} />
        </mesh>
        <mesh position={[-0.12, 0.22, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.1, 12]} />
          <meshStandardMaterial color="#6cbf63" side={2} />
        </mesh>
      </group>
    )
  } else if (tile === 'ROAD') {
    const vertical = hash(r, c) > 0.5
    const crosswalk = hash(r * 2.2 + 1, c * 1.3 + 4) > 0.76
    body = (
      <group>
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <boxGeometry args={[1, 0.2, 1]} />
          <meshStandardMaterial color="#41464d" roughness={1} />
        </mesh>
        {/* raised curbs on the two road-side edges */}
        {[-0.46, 0.46].map((e, i) => (
          <mesh key={`curb-${i}`} position={vertical ? [e, 0.21, 0] : [0, 0.21, e]} castShadow>
            <boxGeometry args={vertical ? [0.08, 0.08, 1] : [1, 0.08, 0.08]} />
            <meshStandardMaterial color="#c2c8cf" roughness={1} />
          </mesh>
        ))}
        {crosswalk
          ? [-0.3, -0.1, 0.1, 0.3].map((d, i) => (
              <mesh key={i} position={vertical ? [d, 0.205, 0] : [0, 0.205, d]}>
                <boxGeometry args={vertical ? [0.1, 0.02, 0.66] : [0.66, 0.02, 0.1]} />
                <meshStandardMaterial color="#eef1f4" />
              </mesh>
            ))
          : [-0.3, 0.0, 0.3].map((d, i) => (
              <mesh key={i} position={vertical ? [0, 0.205, d] : [d, 0.205, 0]}>
                <boxGeometry args={vertical ? [0.05, 0.02, 0.18] : [0.18, 0.02, 0.05]} />
                <meshStandardMaterial color="#f4d24f" />
              </mesh>
            ))}
      </group>
    )
  } else if (tile === 'SIDEWALK') {
    body = (
      <group>
        <mesh position={[0, 0.13, 0]} receiveShadow>
          <boxGeometry args={[1, 0.26, 1]} />
          <meshStandardMaterial color={shade('#cbd1d8', j)} roughness={1} />
        </mesh>
        {/* curb lip on one edge */}
        <mesh position={[0, 0.28, 0.46]} castShadow>
          <boxGeometry args={[1, 0.06, 0.08]} />
          <meshStandardMaterial color="#aab2bb" roughness={1} />
        </mesh>
        {/* paving slab seams */}
        {[-0.3, 0, 0.3].map((d, i) => (
          <mesh key={`sx-${i}`} position={[d, 0.27, 0]}>
            <boxGeometry args={[0.02, 0.02, 0.9]} />
            <meshStandardMaterial color="#b3bbc4" />
          </mesh>
        ))}
        {[-0.3, 0, 0.3].map((d, i) => (
          <mesh key={`sz-${i}`} position={[0, 0.27, d]}>
            <boxGeometry args={[0.9, 0.02, 0.02]} />
            <meshStandardMaterial color="#b3bbc4" />
          </mesh>
        ))}
        {/* street tree in a pit */}
        {hash(r + 7, c + 2) > 0.7 && <OneTree x={0.3} z={-0.3} scale={0.55} style="round" tint={0} />}
      </group>
    )
  } else if (tile === 'PLAZA') {
    body = (
      <group>
        <RoundedBox args={[1, 0.28, 1]} radius={0.03} smoothness={2} position={[0, 0.14, 0]} receiveShadow>
          <meshStandardMaterial color="#ddd6c7" roughness={0.9} />
        </RoundedBox>
        {/* radial paving accent */}
        <mesh position={[0, 0.285, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.36, 24]} />
          <meshStandardMaterial color="#c3b896" side={2} />
        </mesh>
        {/* paving seams */}
        {[-0.28, 0.28].map((d, i) => (
          <mesh key={`px-${i}`} position={[d, 0.285, 0]}>
            <boxGeometry args={[0.02, 0.01, 0.92]} />
            <meshStandardMaterial color="#c7bc9c" />
          </mesh>
        ))}
        {[-0.28, 0.28].map((d, i) => (
          <mesh key={`pz-${i}`} position={[0, 0.285, d]}>
            <boxGeometry args={[0.92, 0.01, 0.02]} />
            <meshStandardMaterial color="#c7bc9c" />
          </mesh>
        ))}
        {/* central round planter with a tree */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.2, 0.22, 18]} />
          <meshStandardMaterial color="#a89a7c" roughness={1} />
        </mesh>
        <OneTree x={0} z={0} scale={0.5} style="layered" tint={0.02} />
        {/* two benches */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.34, 0.34, 0.34]} castShadow>
            <boxGeometry args={[0.26, 0.05, 0.1]} />
            <meshStandardMaterial color="#9c7a52" roughness={0.9} />
          </mesh>
        ))}
      </group>
    )
  } else if (tile === 'BARE') {
    body = (
      <group>
        <mesh position={[0, 0.12, 0]} receiveShadow>
          <boxGeometry args={[1, 0.24, 1]} />
          <meshStandardMaterial color={shade('#b08a5e', j)} roughness={1} />
        </mesh>
        <mesh position={[0.2, 0.27, 0.18]} castShadow>
          <dodecahedronGeometry args={[0.08, 0]} />
          <meshStandardMaterial color="#8a6c46" flatShading />
        </mesh>
        <mesh position={[-0.22, 0.26, -0.12]} castShadow>
          <dodecahedronGeometry args={[0.06, 0]} />
          <meshStandardMaterial color="#9c7a52" flatShading />
        </mesh>
      </group>
    )
  } else if (tile === 'DRAIN') {
    body = (
      <group>
        <mesh position={[0, 0.1, 0]} receiveShadow>
          <boxGeometry args={[1, 0.2, 1]} />
          <meshStandardMaterial color="#5b6470" roughness={1} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.7, 0.16, 0.7]} />
          <meshStandardMaterial color="#2f3640" />
        </mesh>
        {[-0.22, -0.07, 0.08, 0.23].map((gx, i) => (
          <mesh key={i} position={[gx, 0.21, 0]}>
            <boxGeometry args={[0.06, 0.04, 0.74]} />
            <meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
      </group>
    )
  } else if (tile === 'SHELTER') {
    body = (
      <group>
        <RoundedBox args={[0.76, 1.1, 0.76]} radius={0.04} smoothness={3} position={[0, 0.55, 0]} castShadow>
          <meshStandardMaterial color={ARCH.shelterBody} roughness={0.7} />
        </RoundedBox>
        <mesh position={[0, 1.28, 0]} castShadow rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.62, 0.42, 4]} />
          <meshStandardMaterial color={ARCH.shelterRoof} flatShading />
        </mesh>
        {/* white cross sign */}
        <mesh position={[0, 0.7, 0.39]}>
          <boxGeometry args={[0.22, 0.06, 0.02]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.7, 0.39]}>
          <boxGeometry args={[0.06, 0.22, 0.02]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
    )
  } else if (tile === 'HIGH_GROUND') {
    body = (
      <group>
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.98, 0.9, 0.98]} />
          <meshStandardMaterial color={ARCH.highBody} flatShading />
        </mesh>
        <mesh position={[0, 1.15, 0]} castShadow>
          <boxGeometry args={[0.66, 0.5, 0.66]} />
          <meshStandardMaterial color={shade(ARCH.highBody, 0.05)} flatShading />
        </mesh>
        <mesh position={[0, 1.44, 0]}>
          <boxGeometry args={[0.66, 0.12, 0.66]} />
          <meshStandardMaterial color={shade(ARCH.highTop, j)} flatShading />
        </mesh>
      </group>
    )
  } else if (tile === 'SEAWALL') {
    body = (
      <group>
        <RoundedBox args={[0.96, 1.6, 0.7]} radius={0.03} smoothness={2} position={[0, 0.8, 0.12]} castShadow receiveShadow>
          <meshStandardMaterial color={shade(ARCH.wall, j)} roughness={0.9} />
        </RoundedBox>
        {/* sloped sea-facing face */}
        <mesh position={[0, 0.6, -0.32]} rotation={[Math.PI / 6, 0, 0]} castShadow>
          <boxGeometry args={[0.96, 1.4, 0.18]} />
          <meshStandardMaterial color={shade(ARCH.wall, -0.05)} roughness={0.95} />
        </mesh>
      </group>
    )
  } else if (tile === 'RETAINING') {
    // Planted terraced slope (gabion steps + grass), visually distinct from the grey seawall.
    body = (
      <group>
        {[0, 1, 2].map((s) => {
          const depth = 0.92 - s * 0.26
          const y = 0.22 + s * 0.44
          const zc = -s * 0.2
          return (
            <group key={s}>
              <mesh position={[0, y, zc]} castShadow receiveShadow>
                <boxGeometry args={[0.98, 0.44, depth]} />
                <meshStandardMaterial color={shade('#9a8e7a', (1 - s) * 0.05)} flatShading roughness={1} />
              </mesh>
              {/* gabion stone facing on the step front */}
              <mesh position={[0, y, zc + depth / 2 + 0.01]}>
                <boxGeometry args={[0.98, 0.42, 0.04]} />
                <meshStandardMaterial color="#7d7468" flatShading roughness={1} metalness={0.05} />
              </mesh>
              {/* grass strip on the terrace top */}
              <mesh position={[0, y + 0.24, zc - 0.03]} receiveShadow>
                <boxGeometry args={[0.92, 0.06, depth - 0.12]} />
                <meshStandardMaterial color={shade(ARCH.park, 0.02)} roughness={1} />
              </mesh>
            </group>
          )
        })}
        {/* shrubs on the top terrace */}
        <mesh position={[0.18, 1.34, -0.42]} castShadow>
          <icosahedronGeometry args={[0.12, 0]} />
          <meshStandardMaterial color={ARCH.treeDark} flatShading />
        </mesh>
        <mesh position={[-0.2, 1.32, -0.42]} castShadow>
          <icosahedronGeometry args={[0.1, 0]} />
          <meshStandardMaterial color={ARCH.tree} flatShading />
        </mesh>
      </group>
    )
  } else if (tile === 'PARK') {
    body = (
      <group>
        <RoundedBox args={[1, 0.36, 1]} radius={0.05} smoothness={2} position={[0, 0.18, 0]} receiveShadow>
          <meshStandardMaterial color={shade(ARCH.park, j)} roughness={1} />
        </RoundedBox>
        <mesh position={[0.22, 0.48, -0.18]} castShadow>
          <icosahedronGeometry args={[0.14, 0]} />
          <meshStandardMaterial color={ARCH.treeDark} flatShading />
        </mesh>
        <mesh position={[-0.2, 0.42, 0.18]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#f9a8d4" />
        </mesh>
        <mesh position={[0.05, 0.42, 0.25]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#fde047" />
        </mesh>
      </group>
    )
  } else if (tile === 'GREEN_BUFFER') {
    body = (
      <group>
        <RoundedBox args={[0.96, 0.7, 0.96]} radius={0.16} smoothness={3} position={[0, 0.35, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={shade(ARCH.tree, j)} roughness={1} />
        </RoundedBox>
        <mesh position={[-0.2, 0.7, 0.0]} castShadow>
          <icosahedronGeometry args={[0.18, 1]} />
          <meshStandardMaterial color={ARCH.treeDark} flatShading />
        </mesh>
        <mesh position={[0.22, 0.72, 0.0]} castShadow>
          <icosahedronGeometry args={[0.16, 1]} />
          <meshStandardMaterial color={shade(ARCH.tree, 0.06)} flatShading />
        </mesh>
      </group>
    )
  } else {
    const top = tileTop(tile, r, c)
    body = (
      <mesh position={[0, top / 2, 0]} receiveShadow>
        <boxGeometry args={[1, top, 1]} />
        <meshStandardMaterial color={shade(ARCH.slab, j)} roughness={1} />
      </mesh>
    )
  }

  return (
    <group position={[x, 0, z]} {...handlers}>
      {body}
    </group>
  )
}

interface ColumnData {
  x: number
  z: number
  y: number
  scaleY: number
  capY: number
  color: Color
}

function buildColumns(
  grid: Grid,
  values: number[][] | null,
  min: number,
  max: number,
  kind: HeatmapKind,
): ColumnData[] {
  if (!values) return []
  const size = grid.length
  const offset = (size - 1) / 2
  const span = max - min
  const cols: ColumnData[] = []

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = values[r]?.[c]
      if (v == null) continue
      const t = span >= 0.001 ? Math.min(1, Math.max(0, (v - min) / span)) : 0.5
      const top = tileTop(grid[r][c], r, c)
      const colH = 0.4 + t * 4.2
      cols.push({
        x: c - offset,
        z: r - offset,
        y: top + 0.25 + colH / 2,
        scaleY: colH,
        capY: top + 0.25 + colH,
        color: new Color(lensColor(kind, v, min, max)),
      })
    }
  }
  return cols
}

function ClimateColumns({ columns, size }: { columns: ColumnData[]; size: number }) {
  const colMat = useRef<MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    if (colMat.current) colMat.current.opacity = 0.4 + Math.sin(clock.elapsedTime * 2.2) * 0.12
  })

  if (columns.length === 0) return null

  return (
    <>
      <Instances limit={size * size}>
        <boxGeometry args={[0.4, 1, 0.4]} />
        <meshBasicMaterial ref={colMat} transparent opacity={0.45} depthWrite={false} toneMapped={false} />
        {columns.map((col, i) => (
          <Instance key={i} position={[col.x, col.y, col.z]} scale={[1, col.scaleY, 1]} color={col.color} />
        ))}
      </Instances>

      <Instances limit={size * size}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshBasicMaterial transparent opacity={0.95} depthWrite={false} toneMapped={false} />
        {columns.map((col, i) => (
          <Instance key={i} position={[col.x, col.capY, col.z]} color={col.color} />
        ))}
      </Instances>
    </>
  )
}

function Scene({
  grid,
  columns,
  size,
  editing,
  dragRef,
  onPaintCell,
}: {
  grid: Grid
  columns: ColumnData[]
  size: number
  editing: boolean
  dragRef: React.MutableRefObject<{ x: number; y: number }>
  onPaintCell?: (r: number, c: number) => void
}) {
  const offset = (size - 1) / 2
  const [hover, setHover] = useState<[number, number] | null>(null)

  const handlePick = (r: number, c: number, e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const dx = Math.abs(e.nativeEvent.clientX - dragRef.current.x)
    const dy = Math.abs(e.nativeEvent.clientY - dragRef.current.y)
    if (dx > 5 || dy > 5) return
    onPaintCell?.(r, c)
  }

  return (
    <>
      <hemisphereLight args={['#ffffff', '#c8d2de', 0.75]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[size, size * 1.6, size * 0.7]}
        intensity={1.35}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <Sky sunPosition={[size, size * 1.2, size]} turbidity={4} rayleigh={0.8} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[size + 6, size + 6]} />
        <meshStandardMaterial color="#eef2f6" roughness={1} />
      </mesh>

      <ContactShadows position={[0, 0.02, 0]} opacity={0.42} scale={size * 2.2} blur={2.2} far={8} />

      {grid.map((row, r) =>
        row.map((tile, c) => (
          <Tile
            key={`${r}-${c}`}
            tile={tile}
            r={r}
            c={c}
            x={c - offset}
            z={r - offset}
            editing={editing}
            onPick={handlePick}
            onHover={setHover}
          />
        )),
      )}

      {editing && hover && (
        <mesh position={[hover[1] - offset, 3.2, hover[0] - offset]}>
          <boxGeometry args={[1, 6.4, 1]} />
          <meshBasicMaterial color="#fde68a" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      )}

      <ClimateColumns columns={columns} size={size} />
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
  const dragRef = useRef({ x: 0, y: 0 })

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
  const columns = useMemo(
    () => (heat ? buildColumns(grid, values, valueMin, valueMax, heatmapKind) : []),
    [heat, grid, values, valueMin, valueMax, heatmapKind],
  )

  if (!open) return null

  const camDist = size * 1.7

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-sky-100 to-slate-200 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 bg-white/70 px-4 py-3 backdrop-blur">
          <h2 className="text-sm font-semibold text-slate-700">
            3D 도시 뷰 · 드래그 회전 / 휠 줌 / 우클릭 이동
          </h2>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition ${
                  editing ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
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
                heat ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {heat ? '기후 효과 켜짐' : '기후 효과 끔'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-300"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {editing && (
          <div className="flex flex-wrap gap-1 border-b border-black/10 bg-white/60 px-3 py-2 backdrop-blur">
            {TILES.map((tile) => (
              <button
                key={tile.type}
                type="button"
                onClick={() => onBrushChange?.(tile.type)}
                title={tile.label}
                className={`flex h-8 items-center gap-1 rounded-md border px-2 text-xs transition ${
                  brush === tile.type
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
            camera={{ position: [camDist, camDist * 0.8, camDist], fov: 42 }}
            onPointerDown={(e) => {
              dragRef.current = { x: e.clientX, y: e.clientY }
            }}
          >
            <Scene
              grid={grid}
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

          <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-center text-[11px] text-white/90">
            {editing
              ? '팔레트에서 타일을 고르고, 도시 블록을 클릭해 칠하세요.'
              : heat
                ? '솟아오른 빛기둥 = 기후 강도. 빨갛고 높을수록 뜨겁고(위험), 낮고 푸를수록 시원합니다.'
                : '건물 높이·나무·물로 도시를 입체로 표현합니다. 상단 「기후 효과」로 열·미세먼지를 확인하세요.'}
          </p>
        </div>
      </div>
    </div>
  )
}
