/** 표면온도 − 기준 기온. 양수면 더 뜨거움, 음수면 더 시원함. */
export const HEAT_ISLAND_LABEL = '기준 대비'

export const HEAT_ISLAND_HINT =
  '평균 표면온도가 기준 기온보다 얼마나 높거나 낮은지를 나타냅니다.'

export function formatHeatIslandDelta(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}°C`
}
