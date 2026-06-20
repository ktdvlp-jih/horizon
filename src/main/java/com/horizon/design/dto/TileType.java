package com.horizon.design.dto;

/**
 * City tile types and their thermal properties used by the heat-island model.
 *
 * @param albedo       solar reflectivity 0..1 (higher reflects more, heats less)
 * @param selfCooling  local cooling offset in deg C (evapotranspiration / shade)
 * @param emittedHeat  anthropogenic / stored heat radiated to neighbors (deg C)
 * @param green        counts toward green ratio
 * @param impervious   counts toward impervious (sealed surface) ratio
 * @param water        counts toward water ratio
 */
public enum TileType {
    BUILDING(0.25, 0.0, 3.2, false, true, false),
    ROAD(0.12, 0.0, 2.4, false, true, false),
    BARE(0.20, 0.0, 0.8, false, true, false),
    PARK(0.30, 4.0, 0.0, true, false, false),
    TREE(0.25, 7.0, 0.0, true, false, false),
    WATER(0.08, 8.0, 0.0, false, false, true);

    private final double albedo;
    private final double selfCooling;
    private final double emittedHeat;
    private final boolean green;
    private final boolean impervious;
    private final boolean water;

    TileType(double albedo, double selfCooling, double emittedHeat,
             boolean green, boolean impervious, boolean water) {
        this.albedo = albedo;
        this.selfCooling = selfCooling;
        this.emittedHeat = emittedHeat;
        this.green = green;
        this.impervious = impervious;
        this.water = water;
    }

    public double albedo() {
        return albedo;
    }

    public double selfCooling() {
        return selfCooling;
    }

    public double emittedHeat() {
        return emittedHeat;
    }

    public boolean isGreen() {
        return green;
    }

    public boolean isImpervious() {
        return impervious;
    }

    public boolean isWater() {
        return water;
    }

    public static TileType fromString(String value) {
        if (value == null) {
            return BARE;
        }
        try {
            return TileType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return BARE;
        }
    }
}
