import type { Grid, LensKind } from '@/types'

/** A single level within a scenario track. */
export interface LevelDef {
  id: string
  order: number
  title: string
  brief: string
  /** Focus lens auto-selected when the level is active. */
  lens: LensKind
  /** Disaster scenario id (seeded) for disaster-focused levels. */
  scenarioId?: string
  /** Pass condition: a metric must reach `min`. */
  goal: { metric: 'resilience' | LensKind; min: number }
  /** Start from the previous completed level's saved grid (progressive editing). */
  carryOver: boolean
}

export interface ScenarioTrack {
  id: string
  title: string
  emoji: string
  intro: string
  levels: LevelDef[]
}

/**
 * Scenario tracks. Each track teaches one axis, then later levels layer in
 * trade-offs. Carry-over levels start from the grid the learner built in the
 * previous level so improvements are incremental (better learning effect).
 */
export const TRACKS: ScenarioTrack[] = [
  {
    id: 'heat',
    title: '도시 기후 입문',
    emoji: '🌡️',
    intro: '녹지와 수변으로 열섬을 식히는 기본기를 익힙니다.',
    levels: [
      {
        id: 'heat-1',
        order: 1,
        title: '첫 그늘 만들기',
        brief: '가로수·공원을 배치해 열섬 점수 60 이상을 달성하세요.',
        lens: 'heat',
        goal: { metric: 'heat', min: 60 },
        carryOver: false,
      },
      {
        id: 'heat-2',
        order: 2,
        title: '시원한 바람길',
        brief: '이전 설계를 이어받아 수변·습지를 더해 열섬 점수 75 이상으로.',
        lens: 'heat',
        goal: { metric: 'heat', min: 75 },
        carryOver: true,
      },
    ],
  },
  {
    id: 'air',
    title: '맑은 하늘 만들기',
    emoji: '🌫️',
    intro: '배출원을 줄이고 녹지 완충으로 미세먼지를 흡착합니다.',
    levels: [
      {
        id: 'air-1',
        order: 1,
        title: '먼지 흡착 벨트',
        brief: '녹지완충·가로수로 미세먼지 점수 60 이상을 만드세요.',
        lens: 'air',
        goal: { metric: 'air', min: 60 },
        carryOver: false,
      },
      {
        id: 'air-2',
        order: 2,
        title: '공장과 공존하기',
        brief: '공장(배출원)을 두면서도 완충 녹지로 미세먼지 점수 70 이상을 유지하세요.',
        lens: 'air',
        goal: { metric: 'air', min: 70 },
        carryOver: true,
      },
    ],
  },
  {
    id: 'disaster',
    title: '재난 대비 설계',
    emoji: '🛡️',
    intro: '실제 재난 시나리오로 도시 방어선을 설계합니다.',
    levels: [
      {
        id: 'disaster-1',
        order: 1,
        title: '태풍 방어선 (매미 2003)',
        brief: '방조제·배수로·녹지완충으로 재난 점수 60 이상을 달성하세요.',
        lens: 'disaster',
        scenarioId: 'typhoon-maemi-2003',
        goal: { metric: 'disaster', min: 60 },
        carryOver: false,
      },
      {
        id: 'disaster-2',
        order: 2,
        title: '균형 잡힌 회복 도시',
        brief: '재난 대비를 유지하면서 종합 회복탄력성 65 이상으로 균형을 맞추세요.',
        lens: 'disaster',
        scenarioId: 'typhoon-maemi-2003',
        goal: { metric: 'resilience', min: 65 },
        carryOver: true,
      },
    ],
  },
  {
    id: 'agriculture',
    title: '지속가능 도농 통합',
    emoji: '🌾',
    intro: '외곽 농어업과 도시를 함께 설계해 장기 기후에 대비합니다.',
    levels: [
      {
        id: 'agri-1',
        order: 1,
        title: '먹거리 안보',
        brief: '구역 배분과 도시 녹지로 농어업 점수 60 이상을 만드세요.',
        lens: 'agriculture',
        goal: { metric: 'agriculture', min: 60 },
        carryOver: false,
      },
    ],
  },
]

export const TRACK_BY_ID: Record<string, ScenarioTrack> = TRACKS.reduce(
  (acc, t) => {
    acc[t.id] = t
    return acc
  },
  {} as Record<string, ScenarioTrack>,
)

const ALL_LEVELS: LevelDef[] = TRACKS.flatMap((t) => t.levels)
export const LEVEL_BY_ID: Record<string, LevelDef> = ALL_LEVELS.reduce(
  (acc, l) => {
    acc[l.id] = l
    return acc
  },
  {} as Record<string, LevelDef>,
)

interface LevelProgress {
  completed: string[]
  gridByLevel: Record<string, Grid>
}

const PROGRESS_KEY = 'horizon.levels.progress.v1'

export function loadProgress(): LevelProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return { completed: [], gridByLevel: {} }
    const parsed = JSON.parse(raw) as Partial<LevelProgress>
    return {
      completed: parsed.completed ?? [],
      gridByLevel: parsed.gridByLevel ?? {},
    }
  } catch {
    return { completed: [], gridByLevel: {} }
  }
}

function saveProgress(progress: LevelProgress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    /* ignore quota errors */
  }
}

/** A level is unlocked if it is first in its track or the previous one is done. */
export function isLevelUnlocked(track: ScenarioTrack, level: LevelDef, completed: string[]): boolean {
  if (level.order <= 1) return true
  const prev = track.levels.find((l) => l.order === level.order - 1)
  return prev ? completed.includes(prev.id) : true
}

/** The grid to start a level from (previous level's saved grid for carry-over). */
export function carryOverGrid(track: ScenarioTrack, level: LevelDef): Grid | null {
  if (!level.carryOver) return null
  const prev = track.levels.find((l) => l.order === level.order - 1)
  if (!prev) return null
  const progress = loadProgress()
  return progress.gridByLevel[prev.id] ?? null
}

/** Marks a level complete, persisting the grid used to clear it. Returns next level id (if any). */
export function completeLevel(levelId: string, grid: Grid): string | null {
  const progress = loadProgress()
  if (!progress.completed.includes(levelId)) {
    progress.completed = [...progress.completed, levelId]
  }
  progress.gridByLevel = { ...progress.gridByLevel, [levelId]: grid }
  saveProgress(progress)

  const level = LEVEL_BY_ID[levelId]
  if (!level) return null
  const track = TRACKS.find((t) => t.levels.some((l) => l.id === levelId))
  const next = track?.levels.find((l) => l.order === level.order + 1)
  return next?.id ?? null
}
