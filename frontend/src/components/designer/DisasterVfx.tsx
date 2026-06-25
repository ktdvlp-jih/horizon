import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group, Mesh, PerspectiveCamera } from 'three'
import type { ClimateContext, DisasterMode, TileType } from '@/types'

function hash(r: number, c: number): number {
  const n = Math.sin(r * 127.1 + c * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function normRisk(v: number, min: number, max: number): number {
  const span = max - min
  if (span < 0.001) return 0.5
  return Math.min(1, Math.max(0, (v - min) / span))
}

/** Education VFX: ensure motion is visible even when grid defenses lower risk scores. */
function effectStrength(n: number, playing: boolean, mode: DisasterMode | null): number {
  if (!playing || !mode) return n
  const floor = mode === 'typhoon' ? 0.55 : mode === 'earthquake' ? 0.5 : 0.48
  return Math.max(n, floor)
}

const STRUCTURE: TileType[] = ['BUILDING', 'INDUSTRY', 'SHELTER', 'SEAWALL', 'RETAINING', 'HIGH_GROUND']
const VEGETATION: TileType[] = ['TREE', 'PARK', 'GREEN_BUFFER', 'WETLAND']

export function RainParticles({ intensity = 0.5 }: { intensity?: number }) {
  const drops = useRef<(Mesh | null)[]>([])
  const count = 80
  const positions = useMemo(() => {
    const arr: [number, number, number][] = []
    for (let i = 0; i < count; i++) {
      arr.push([(Math.random() - 0.5) * 14, Math.random() * 8 + 2, (Math.random() - 0.5) * 14])
    }
    return arr
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const m = drops.current[i]
      if (!m) continue
      const base = positions[i]
      const y = ((base[1] - t * (4 + intensity * 6)) % 10) + 1
      m.position.set(base[0], y, base[2])
    }
  })

  if (intensity < 0.05) return null

  return (
    <group>
      {positions.map((p, i) => (
        <mesh key={i} ref={(el) => (drops.current[i] = el)} position={p}>
          <boxGeometry args={[0.02, 0.35, 0.02]} />
          <meshBasicMaterial color="#9ec5e8" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

export function FloodPlane({ level = 0.4 }: { level?: number }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = level + Math.sin(clock.elapsedTime * 1.2) * 0.08
  })
  if (level < 0.05) return null
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, level, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#3d8fd4" transparent opacity={0.62} roughness={0.1} metalness={0.35} />
    </mesh>
  )
}

/** Shake as a delta on top of OrbitControls — never snap camera back to spawn. */
export function CameraShake({ intensity = 0 }: { intensity?: number }) {
  const { camera } = useThree()
  const offset = useRef({ x: 0, y: 0, z: 0 })

  useFrame(({ clock }) => {
    const cam = camera as PerspectiveCamera
    cam.position.x -= offset.current.x
    cam.position.y -= offset.current.y
    cam.position.z -= offset.current.z
    offset.current = { x: 0, y: 0, z: 0 }

    if (intensity < 0.05) return

    const t = clock.elapsedTime
    const ox = Math.sin(t * 42) * 0.14 * intensity
    const oy = Math.cos(t * 38) * 0.1 * intensity
    const oz = Math.sin(t * 35) * 0.14 * intensity
    cam.position.x += ox
    cam.position.y += oy
    cam.position.z += oz
    offset.current = { x: ox, y: oy, z: oz }
  })
  return null
}

export function UvGlow({ uvIndex = 0 }: { uvIndex?: number }) {
  if (!uvIndex || uvIndex < 3) return null
  const strength = Math.min(1, (uvIndex - 2) / 8)
  return (
    <mesh position={[0, 6, 0]}>
      <sphereGeometry args={[3.5, 16, 16]} />
      <meshBasicMaterial color="#fde68a" transparent opacity={0.08 + strength * 0.12} depthWrite={false} />
    </mesh>
  )
}

export function HeatShimmer({ sensibleC, baseC = 25 }: { sensibleC?: number | null; baseC?: number }) {
  const ref = useRef<Group>(null)
  const delta = (sensibleC ?? baseC) - baseC
  useFrame(({ clock }) => {
    if (!ref.current || delta < 2) return
    ref.current.position.y = Math.sin(clock.elapsedTime * 3) * 0.04 * Math.min(1, delta / 8)
  })
  if (delta < 2) return null
  return (
    <group ref={ref}>
      {[-3, 0, 3].map((x) => (
        <mesh key={x} position={[x, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.5, 0.15]} />
          <meshBasicMaterial color="#fca5a5" transparent opacity={0.15} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

export function DebrisField({
  grid,
  risk,
  min,
  max,
  mode,
  playing = false,
}: {
  grid: TileType[][]
  risk: number[][] | null
  min: number
  max: number
  mode: DisasterMode | null
  playing?: boolean
}) {
  const pieces = useMemo(() => {
    if (!mode || !playing) return []
    const out: { x: number; z: number; y: number; sx: number }[] = []
    const size = grid.length
    const off = (size - 1) / 2
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const tile = grid[r][c]
        if (!STRUCTURE.includes(tile)) continue
        const v = risk?.[r]?.[c]
        const n = v != null ? normRisk(v, min, max) : 0.5
        const h = hash(r, c)
        const include = n >= 0.2 || (mode === 'typhoon' && h > 0.35) || (mode === 'earthquake' && h > 0.4)
        if (!include) continue
        out.push({ x: c - off + (h - 0.5) * 0.3, z: r - off, y: 0.4 + h * 1.2, sx: 0.1 + h * 0.16 })
      }
    }
    return out.slice(0, 60)
  }, [grid, risk, min, max, mode, playing])

  const refs = useRef<(Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    pieces.forEach((p, i) => {
      const m = refs.current[i]
      if (!m) return
      if (mode === 'typhoon') {
        m.position.y = p.y + Math.abs(Math.sin(t * 2.2 + i)) * 2.2
        m.position.x = p.x + Math.sin(t * 1.5 + i) * 0.35
        m.rotation.x += 0.05
        m.rotation.z += 0.04
      } else {
        m.position.y = Math.max(0.05, p.y - ((t * 0.04 + i * 0.01) % 1.5))
        m.rotation.x += 0.03
        m.rotation.z += 0.02
      }
    })
  })

  if (pieces.length === 0) return null
  return (
    <group>
      {pieces.map((p, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[p.x, p.y, p.z]} castShadow>
          <boxGeometry args={[p.sx, p.sx * 0.6, p.sx * 0.8]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

export function AnimatedTileShell({
  tile,
  r,
  c,
  posX,
  posZ,
  mode,
  risk,
  riskMin,
  riskMax,
  playing,
  children,
}: {
  tile: TileType
  r: number
  c: number
  posX: number
  posZ: number
  mode: DisasterMode | null
  risk: number | null
  riskMin: number
  riskMax: number
  playing: boolean
  children: ReactNode
}) {
  const groupRef = useRef<Group>(null)
  const h = hash(r, c)
  const n = risk != null ? normRisk(risk, riskMin, riskMax) : 0.45
  const fx = effectStrength(n, playing, mode)

  useFrame(({ clock }) => {
    const g = groupRef.current
    if (!g) return
    g.position.set(posX, 0, posZ)
    g.rotation.set(0, 0, 0)
    g.scale.set(1, 1, 1)
    if (!playing || !mode) return
    const t = clock.elapsedTime + h * 10

    if (mode === 'typhoon') {
      g.rotation.z = Math.sin(t * 2.8) * 0.22 * fx
      if (STRUCTURE.includes(tile)) {
        g.position.y = Math.abs(Math.sin(t * 1.8)) * fx * 2.4
        g.rotation.x = Math.sin(t * 1.4) * 0.45 * fx
        if (fx > 0.5 && h > 0.55) {
          g.position.x = posX + Math.sin(t * 2.1) * 0.25 * fx
          g.position.z = posZ + Math.cos(t * 1.9) * 0.2 * fx
        }
      }
      if (VEGETATION.includes(tile)) {
        g.rotation.z = Math.sin(t * 3.5) * 0.35 * fx
      }
    } else if (mode === 'earthquake') {
      g.position.x = posX + Math.sin(t * 28) * 0.1 * fx
      g.position.z = posZ + Math.cos(t * 24) * 0.1 * fx
      if (STRUCTURE.includes(tile)) {
        const collapse = Math.min(1, fx * 1.1)
        g.scale.y = 1 - collapse * 0.82
        g.rotation.z = (h - 0.5) * collapse * 1.2
        g.position.y = -collapse * 0.65
      }
    } else if (mode === 'tsunami') {
      const wave = Math.sin(t * 1.1 - (r + c) * 0.15) * 0.5 + 0.5
      if (STRUCTURE.includes(tile) || VEGETATION.includes(tile)) {
        g.position.y = wave * fx * 1.4
        g.rotation.y = Math.sin(t + h) * 0.35 * fx
      }
      if (tile === 'TREE' || tile === 'PARK') {
        g.rotation.z = (h > 0.5 ? 1 : -1) * fx * 1.3
        g.position.x = posX + Math.sin(t * 1.3) * 0.28 * fx
      }
    }
  })

  return <group ref={groupRef}>{children}</group>
}

export function climateRainIntensity(climate?: ClimateContext | null): number {
  const mm = climate?.rainfallMm
  if (mm == null) return 0
  return Math.min(1, mm / 25)
}

export function climateFloodLevel(mode: DisasterMode | null, risk: number[][] | null, min: number, max: number): number {
  if (mode !== 'tsunami') return 0
  if (!risk) return 0.55
  let peak = 0
  for (const row of risk) {
    for (const v of row) peak = Math.max(peak, normRisk(v, min, max))
  }
  return Math.max(0.5, peak * 1.6)
}

export function climateShakeIntensity(
  mode: DisasterMode | null,
  risk: number[][] | null,
  min: number,
  max: number,
  playing: boolean,
): number {
  if (mode !== 'earthquake' || !playing) return 0
  if (!risk) return 0.65
  let peak = 0
  for (const row of risk) {
    for (const v of row) peak = Math.max(peak, normRisk(v, min, max))
  }
  return Math.max(0.55, peak)
}
