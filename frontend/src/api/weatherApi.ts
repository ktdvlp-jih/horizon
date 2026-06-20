import { apiClient, unwrap } from './client'
import type { ApiResponse, RegionWeather } from '@/types'

export async function fetchRegions(): Promise<RegionWeather[]> {
  const res = await apiClient.get<ApiResponse<RegionWeather[]>>('/regions')
  return unwrap(res)
}
