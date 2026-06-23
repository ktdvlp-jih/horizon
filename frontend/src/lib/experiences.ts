export type ExperienceStatus = 'active' | 'coming-soon'

export interface Experience {
  id: string
  slug: string
  title: string
  description: string
  route: string
  status: ExperienceStatus
  emoji: string
}

/** Evaluation axes integrated into the single main experience. */
export const RESILIENCE_AXES: { emoji: string; title: string; description: string }[] = [
  { emoji: '🌡️', title: '열섬', description: '녹지·수변으로 도시 온도를 식힙니다.' },
  { emoji: '🌫️', title: '미세먼지', description: '배출원과 녹지완충으로 대기질을 관리합니다.' },
  { emoji: '🛡️', title: '재난', description: '태풍·지진·해일 시나리오로 방어선을 설계합니다.' },
  { emoji: '🌾', title: '농어업', description: '외곽 광역 구역과 장기 기후로 먹거리를 지킵니다.' },
]

export const EXPERIENCES: Experience[] = [
  {
    id: 'urban-climate',
    slug: 'urban-climate',
    title: '도시 기후 설계자',
    description:
      '하나의 도시를 열섬·미세먼지·재난·농어업 4축으로 동시에 설계하고, 시나리오 레벨로 회복탄력성을 키웁니다.',
    route: '/designer',
    status: 'active',
    emoji: '🌍',
  },
]

export const URBAN_CLIMATE = EXPERIENCES[0]
/** Disaster response is now absorbed into the main designer as the 재난 lens. */
export const DISASTER_RESPONSE = EXPERIENCES[0]
