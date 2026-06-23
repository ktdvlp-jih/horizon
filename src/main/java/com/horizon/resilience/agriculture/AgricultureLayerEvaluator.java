package com.horizon.resilience.agriculture;

import com.horizon.resilience.dto.AgricultureMetrics;
import com.horizon.resilience.dto.AgricultureZones;
import org.springframework.stereotype.Component;

/**
 * Wide-area agriculture / fisheries lens. The dense city grid is too small for
 * farmland tiles, so this evaluator works at the regional scale: a coarse
 * outer-zone allocation (farmland / fishery / forest / solar) is combined with
 * city-wide aggregates (green, water, impervious, heat, PM) and a long-term
 * warming assumption to project crop, fishery, water-security and carbon
 * indices. Education-grade and deterministic.
 */
@Component
public class AgricultureLayerEvaluator {

    /** Long-term warming assumption (°C) layered on top of the city's local heat. */
    private static final double LONG_TERM_WARMING_C = 2.0;

    private static final AgricultureZones DEFAULT_ZONES =
            new AgricultureZones(0.4, 0.2, 0.25, 0.15);

    public AgricultureMetrics evaluate(AgricultureZones rawZones, CityAggregate city) {
        AgricultureZones zones = (rawZones == null || rawZones.total() <= 0) ? DEFAULT_ZONES : rawZones;
        double total = zones.total();
        double farmland = zones.farmland() / total;
        double fishery = zones.fishery() / total;
        double forest = zones.forest() / total;
        double solar = zones.solar() / total;

        // Combined warming stress: long-term baseline + local heat-island excess.
        double warming = LONG_TERM_WARMING_C + Math.max(0, city.heatDeltaT() - 2.0) * 0.4;
        double heatStress = clamp01(warming / 6.0);
        double pmStress = clamp01((city.avgPm() - 15.0) / 80.0);

        // Crop: more farmland + greenery + water help; heat and dust hurt.
        double crop = 55
                + farmland * 35
                + city.greenRatio() * 25
                + city.waterRatio() * 20
                - heatStress * 45
                - pmStress * 18
                - solar * 8; // agrivoltaics trades some arable land
        double cropYield = clamp100(crop);

        // Fishery: fishery share + water; warming (sea temp) and impervious runoff hurt.
        double fish = 50
                + fishery * 45
                + city.waterRatio() * 18
                + forest * 10
                - heatStress * 40
                - city.imperviousRatio() * 20;
        double fisheryIndex = clamp100(fish);

        // Water security: forest + green + water buffer; impervious sealing hurts.
        double water = 45
                + forest * 35
                + city.greenRatio() * 25
                + city.waterRatio() * 25
                - city.imperviousRatio() * 35
                - heatStress * 15;
        double waterSecurity = clamp100(water);

        // Carbon balance: forest + solar + greenery sequester/offset; PM/impervious proxy emissions.
        double carbon = 40
                + forest * 35
                + solar * 30
                + city.greenRatio() * 20
                - pmStress * 25
                - city.imperviousRatio() * 20;
        double carbonBalance = clamp100(carbon);

        double overall = round(0.35 * cropYield + 0.25 * fisheryIndex
                + 0.22 * waterSecurity + 0.18 * carbonBalance);

        return new AgricultureMetrics(
                round(farmland), round(fishery), round(forest), round(solar),
                round(warming),
                round(cropYield), round(fisheryIndex), round(waterSecurity), round(carbonBalance),
                overall
        );
    }

    private double clamp01(double v) {
        return Math.max(0, Math.min(1, v));
    }

    private double clamp100(double v) {
        return Math.max(0, Math.min(100, v));
    }

    private double round(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    /** City-wide aggregates feeding the wide-area model. */
    public record CityAggregate(
            double greenRatio,
            double waterRatio,
            double imperviousRatio,
            double avgPm,
            double heatDeltaT
    ) {
    }
}
