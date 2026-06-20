import { useQuery } from '@tanstack/react-query'
import { fetchRegions } from '@/api/weatherApi'

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: fetchRegions,
    staleTime: 5 * 60_000,
  })
}
