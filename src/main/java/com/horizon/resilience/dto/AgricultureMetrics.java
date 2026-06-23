package com.horizon.resilience.dto;

/**
 * Wide-area agriculture / fisheries metrics. Unlike the per-cell axes, this lens
 * is computed from city-wide aggregates (green/water/impervious ratios, heat,
 * PM) combined with a coarse outer-zone allocation and a long-term climate
 * assumption — the dense grid is too small to host farmland directly.
 *
 * @param farmland          normalized farmland share 0..1
 * @param fishery           normalized fishery share 0..1
 * @param forest            normalized conservation-forest share 0..1
 * @param solar             normalized agrivoltaics share 0..1
 * @param warmingDeltaC     long-term warming assumption (°C) used in the model
 * @param cropYieldIndex    projected crop yield index 0..100
 * @param fisheryIndex      projected fishery/aquaculture index 0..100
 * @param waterSecurityIndex water security index 0..100
 * @param carbonBalanceIndex carbon balance index 0..100
 * @param overallIndex      blended agriculture resilience index 0..100
 */
public record AgricultureMetrics(
        double farmland,
        double fishery,
        double forest,
        double solar,
        double warmingDeltaC,
        double cropYieldIndex,
        double fisheryIndex,
        double waterSecurityIndex,
        double carbonBalanceIndex,
        double overallIndex
) {
}
