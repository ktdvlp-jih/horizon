package com.horizon.resilience.service;

import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Resolves the fixed weight profile for a given scenario. Per the design,
 * weights are scenario-fixed (not user-tunable): each scenario emphasizes the
 * axes that matter for its learning objective. Unknown scenarios fall back to a
 * balanced profile.
 */
@Component
public class ScenarioWeightsResolver {

    private static final ScenarioWeights BALANCED =
            new ScenarioWeights(1.0, 1.0, 1.0, 1.0, 0.25);

    /** scenarioId -> fixed weights. Populated as scenarios are authored (P5/P6). */
    private static final Map<String, ScenarioWeights> BY_SCENARIO = Map.ofEntries(
            // Heatwave-focused scenarios lean on heat + air.
            Map.entry("heatwave-default", new ScenarioWeights(2.0, 1.5, 0.5, 0.5, 0.3)),
            // Typhoon/flood scenarios lean on disaster + heat (drainage/green).
            Map.entry("typhoon-default", new ScenarioWeights(0.8, 0.6, 2.5, 0.4, 0.3)),
            // Fine-dust scenarios lean on air + heat.
            Map.entry("airquality-default", new ScenarioWeights(1.2, 2.5, 0.4, 0.4, 0.3)),
            // Agriculture/long-term climate scenarios lean on agriculture + heat.
            Map.entry("agriculture-default", new ScenarioWeights(1.0, 0.8, 0.6, 2.5, 0.3))
    );

    public ScenarioWeights resolve(String scenarioId) {
        if (scenarioId == null || scenarioId.isBlank()) {
            return BALANCED;
        }
        return BY_SCENARIO.getOrDefault(scenarioId, BALANCED);
    }
}
