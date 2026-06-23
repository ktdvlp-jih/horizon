package com.horizon.resilience.service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Fixed per-scenario weighting of evaluation axes. Weights are relative and are
 * normalized over the axes actually present in a given evaluation.
 *
 * @param heat        weight for the heat-island axis
 * @param air         weight for the air-quality axis
 * @param disaster    weight for the disaster-resilience axis
 * @param agriculture weight for the agriculture / fisheries axis
 * @param balanceAlpha penalty coefficient applied to (max-min) axis spread
 */
public record ScenarioWeights(
        double heat,
        double air,
        double disaster,
        double agriculture,
        double balanceAlpha
) {
    public Map<String, Double> asMap() {
        Map<String, Double> m = new LinkedHashMap<>();
        m.put("heat", heat);
        m.put("air", air);
        m.put("disaster", disaster);
        m.put("agriculture", agriculture);
        return m;
    }
}
