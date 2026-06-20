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

export const EXPERIENCES: Experience[] = [
  {
    id: 'urban-climate',
    slug: 'urban-climate',
    title: '도시 기후 설계자',
    description: '타일로 도시를 설계하고 열섬 변화를 실시간으로 확인하세요.',
    route: '/designer',
    status: 'active',
    emoji: '🌡️',
  },
  {
    id: 'disaster-response',
    slug: 'disaster-response',
    title: '3대 재난 대응 설계자',
    description: '태풍·지진·해일 시나리오로 도시 방어선을 설계하고 위험을 확인하세요.',
    route: '#',
    status: 'coming-soon',
    emoji: '🛡️',
  },
  {
    id: 'mode-3',
    slug: 'future-climate',
    title: '미래 기후·농어업 (예정)',
    description: '장기 기후 변화에 따른 농작물·어획 시뮬레이션이 준비 중입니다.',
    route: '#',
    status: 'coming-soon',
    emoji: '🌾',
  },
  {
    id: 'mode-4',
    slug: 'air-quality',
    title: '미세먼지 (예정)',
    description: '대기질·미세먼지 체험이 준비 중입니다.',
    route: '#',
    status: 'coming-soon',
    emoji: '🌫️',
  },
  {
    id: 'mode-5',
    slug: 'coming-soon-5',
    title: '체험 5',
    description: '새로운 환경 탐험이 준비 중입니다.',
    route: '#',
    status: 'coming-soon',
    emoji: '☀️',
  },
  {
    id: 'mode-6',
    slug: 'coming-soon-6',
    title: '체험 6',
    description: '새로운 환경 탐험이 준비 중입니다.',
    route: '#',
    status: 'coming-soon',
    emoji: '🌍',
  },
]

export const URBAN_CLIMATE = EXPERIENCES[0]
export const DISASTER_RESPONSE = EXPERIENCES[1]
