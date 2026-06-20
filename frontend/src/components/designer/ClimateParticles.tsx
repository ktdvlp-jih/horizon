import { useEffect, useRef } from 'react'

interface Props {
  temps: number[][] | null
  min: number
  max: number
  active: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

const MAX_PARTICLES = 80

/**
 * Lightweight canvas overlay that drifts particles over the grid: warmer cells
 * push particles upward faster and tint them red (rising heat), cooler cells
 * drift gently and tint cyan. Reads the current interpolated temps via a ref so
 * the animation loop is not torn down on every frame update.
 */
export default function ClimateParticles({ temps, min, max, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tempsRef = useRef<number[][] | null>(temps)
  const rangeRef = useRef({ min, max })
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number | null>(null)

  tempsRef.current = temps
  rangeRef.current = { min, max }

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const spawn = (): Particle => ({
      x: Math.random() * width,
      y: height + Math.random() * 20,
      vx: (Math.random() - 0.5) * 8,
      vy: -(10 + Math.random() * 20),
      life: 0,
      maxLife: 2 + Math.random() * 2.5,
    })

    const particles = particlesRef.current
    while (particles.length < MAX_PARTICLES) particles.push(spawn())

    const norm = (x: number, y: number): number => {
      const grid = tempsRef.current
      if (!grid || width === 0 || height === 0) return 0.5
      const rows = grid.length
      const cols = grid[0].length
      const c = Math.min(cols - 1, Math.max(0, Math.floor((x / width) * cols)))
      const r = Math.min(rows - 1, Math.max(0, Math.floor((y / height) * rows)))
      const { min: lo, max: hi } = rangeRef.current
      if (hi - lo < 0.001) return 0.5
      return Math.min(1, Math.max(0, (grid[r][c] - lo) / (hi - lo)))
    }

    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const heat = norm(p.x, p.y)
        // Hot cells accelerate upward; cool cells let particles settle/drift.
        p.vy += (-30 * heat - 4) * dt
        p.vx += (Math.random() - 0.5) * 20 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.life += dt

        if (p.y < -10 || p.life > p.maxLife || p.x < -10 || p.x > width + 10) {
          particles[i] = spawn()
          continue
        }

        const fade = 1 - p.life / p.maxLife
        const alpha = Math.max(0, Math.min(0.55, fade * 0.55))
        const radius = 1.2 + heat * 2.2
        const red = Math.round(120 + heat * 135)
        const green = Math.round(200 - heat * 130)
        const blue = Math.round(255 - heat * 200)
        ctx.beginPath()
        ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)

    return () => {
      ro.disconnect()
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      ctx.clearRect(0, 0, width, height)
    }
  }, [active])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full rounded-xl"
      aria-hidden
    />
  )
}
