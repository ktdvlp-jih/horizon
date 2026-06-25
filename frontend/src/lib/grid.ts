import type { DisasterMode, Grid, TileType } from '@/types'

export const GRID_SIZE = 10

/** Starts as a dense "concrete city" so cooling actions produce a dramatic change. */
export function createInitialGrid(size = GRID_SIZE): Grid {
  const grid: Grid = []
  for (let r = 0; r < size; r++) {
    const row: TileType[] = []
    for (let c = 0; c < size; c++) {
      const isRoad = r % 3 === 0 || c % 4 === 0
      row.push(isRoad ? 'ROAD' : 'BUILDING')
    }
    grid.push(row)
  }
  return grid
}

/** Dense coastal/urban layout for disaster scenarios. */
export function createDisasterInitialGrid(mode: DisasterMode, size = GRID_SIZE): Grid {
  const grid: Grid = []
  for (let r = 0; r < size; r++) {
    const row: TileType[] = []
    for (let c = 0; c < size; c++) {
      if (mode === 'tsunami' && r < 2) row.push('WATER')
      else if (mode === 'tsunami' && r < 4) row.push('ROAD')
      else if (mode === 'typhoon' && r >= size - 2) row.push('ROAD')
      else row.push('BUILDING')
    }
    grid.push(row)
  }
  return grid
}

export function fillGrid(size: number, tile: TileType): Grid {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => tile))
}

/** Balanced green/blue city used by the guided demo for a clear before/after. */
export function createGreenCityGrid(size = GRID_SIZE): Grid {
  const grid: Grid = []
  for (let r = 0; r < size; r++) {
    const row: TileType[] = []
    for (let c = 0; c < size; c++) {
      let tile: TileType
      if (c === 4 || c === 5) tile = 'WATER' // central river
      else if (r % 3 === 0) tile = 'TREE'
      else if ((r + c) % 2 === 0) tile = 'PARK'
      else tile = 'TREE'
      // keep a small built core so it stays a "city", not a forest
      if (r >= 4 && r <= 5 && c <= 1) tile = 'BUILDING'
      row.push(tile)
    }
    grid.push(row)
  }
  return grid
}

export function setCell(grid: Grid, r: number, c: number, tile: TileType): Grid {
  if (grid[r][c] === tile) return grid
  const next = grid.slice()
  next[r] = grid[r].slice()
  next[r][c] = tile
  return next
}

/** Pad or trim saved grid to current GRID_SIZE. */
export function normalizeLoadedGrid(raw: string[][]): Grid {
  const grid: Grid = []
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: TileType[] = []
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push((raw[r]?.[c] as TileType) ?? 'BUILDING')
    }
    grid.push(row)
  }
  return grid
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row])
}

export function gridsEqual(a: Grid, b: Grid): boolean {
  if (a.length !== b.length) return false
  for (let r = 0; r < a.length; r++) {
    if (a[r].length !== b[r].length) return false
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) return false
    }
  }
  return true
}

/** Map pointer coordinates to grid cell indices (row, col). */
export function cellFromPointer(
  el: HTMLElement,
  clientX: number,
  clientY: number,
  size: number,
): [row: number, col: number] | null {
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null

  const x = clientX - rect.left
  const y = clientY - rect.top
  if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null

  const col = Math.min(size - 1, Math.max(0, Math.floor((x / rect.width) * size)))
  const row = Math.min(size - 1, Math.max(0, Math.floor((y / rect.height) * size)))
  return [row, col]
}
