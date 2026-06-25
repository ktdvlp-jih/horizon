import type { DisasterMode } from '@/types'

/** Infer disaster mode from seeded scenario id prefix. */
export function scenarioToMode(scenarioId: string): DisasterMode | null {
  if (!scenarioId) return null
  if (scenarioId.startsWith('typhoon-')) return 'typhoon'
  if (scenarioId.startsWith('eq-')) return 'earthquake'
  if (scenarioId.startsWith('tsunami-')) return 'tsunami'
  return null
}
