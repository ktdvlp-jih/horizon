import type { Grid, TileType } from '@/types'

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

export function fillGrid(size: number, tile: TileType): Grid {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => tile))
}

export function setCell(grid: Grid, r: number, c: number, tile: TileType): Grid {
  return grid.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? tile : cell)) : row))
}
