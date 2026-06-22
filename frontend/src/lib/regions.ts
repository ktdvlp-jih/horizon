import type { RegionWeather } from '@/types'

/** /api/regions 실패 시 표시용 (region_config 시드와 동일) */
export const FALLBACK_REGION_NAMES: Record<string, string> = {
  seoul: '서울',
  busan: '부산',
  daegu: '대구',
  incheon: '인천',
  gwangju: '광주',
  daejeon: '대전',
  jeju: '제주',
  ulsan: '울산',
}

export function regionNameByCode(regions: RegionWeather[] | undefined, code: string): string {
  if (!code) return code
  return regions?.find((r) => r.code === code)?.name ?? FALLBACK_REGION_NAMES[code] ?? code
}

export function buildRegionNameMap(regions: RegionWeather[] | undefined): Map<string, string> {
  const map = new Map<string, string>()
  for (const r of regions ?? []) {
    map.set(r.code, r.name)
  }
  return map
}
