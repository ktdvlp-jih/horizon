package com.horizon.resilience.dto;

/**
 * Coarse regional land-use allocation around the dense city grid, used by the
 * agriculture / fisheries wide-area lens (P4). Values are ratios in 0..1 and are
 * normalized by the evaluator; they need not sum to exactly 1.
 *
 * @param farmland    share of outer land devoted to farmland
 * @param fishery     share devoted to coastal fishery / aquaculture
 * @param forest      share kept as conservation forest / buffer
 * @param solar       share devoted to renewable (agrivoltaics) installations
 */
public record AgricultureZones(
        double farmland,
        double fishery,
        double forest,
        double solar
) {
    public AgricultureZones {
        farmland = clamp(farmland);
        fishery = clamp(fishery);
        forest = clamp(forest);
        solar = clamp(solar);
    }

    private static double clamp(double v) {
        if (Double.isNaN(v) || v < 0) {
            return 0;
        }
        return Math.min(v, 1.0);
    }

    public double total() {
        return farmland + fishery + forest + solar;
    }
}
