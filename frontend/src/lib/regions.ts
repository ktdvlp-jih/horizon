import type { RegionWeather } from '@/types'

export function regionNameByCode(regions: RegionWeather[] | undefined, code: string): string {
  if (!code) return code
  return regions?.find((r) => r.code === code)?.name ?? code
}

export function buildRegionNameMap(regions: RegionWeather[] | undefined): Map<string, string> {
  const map = new Map<string, string>()
  for (const r of regions ?? []) {
    map.set(r.code, r.name)
  }
  return map
}
