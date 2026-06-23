package com.horizon.resilience.service;

import com.horizon.disaster.dto.DisasterMode;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Resolves the fixed weight profile for a given scenario. Per the design,
 * weights are scenario-fixed (not user-tunable): each scenario emphasizes the
 * axes that matter for its learning objective.
 *
 * <p>When a disaster scenario is active the profile is driven by its
 * {@link DisasterMode}; otherwise (heat/air-only design) a balanced profile is
 * used. A small id-keyed override map allows authored scenarios to pin a
 * specific profile.</p>
 */
@Component
public class ScenarioWeightsResolver {

    private static final ScenarioWeights BALANCED =
            new ScenarioWeights(1.0, 1.0, 1.0, 1.0, 0.25);

    private static final Map<DisasterMode, ScenarioWeights> BY_MODE = Map.of(
            // Typhoon/flood: disaster dominant, heat (drainage/green) secondary.
            DisasterMode.TYPHOON, new ScenarioWeights(0.8, 0.6, 2.6, 0.5, 0.3),
            // Earthquake: disaster dominant, others light.
            DisasterMode.EARTHQUAKE, new ScenarioWeights(0.6, 0.5, 2.8, 0.4, 0.3),
            // Tsunami: disaster dominant, agriculture (coastal fishery) secondary.
            DisasterMode.TSUNAMI, new ScenarioWeights(0.6, 0.5, 2.6, 0.8, 0.3)
    );

    /** scenarioId -> fixed override weights (authored scenarios). */
    private static final Map<String, ScenarioWeights> BY_SCENARIO = Map.of(
            "heatwave-default", new ScenarioWeights(2.4, 1.6, 0.5, 0.6, 0.3),
            "airquality-default", new ScenarioWeights(1.3, 2.6, 0.4, 0.5, 0.3),
            "agriculture-default", new ScenarioWeights(1.0, 0.8, 0.5, 2.6, 0.3)
    );

    /** Resolve by scenario id alone (no disaster mode context). */
    public ScenarioWeights resolve(String scenarioId) {
        return resolve(scenarioId, null);
    }

    public ScenarioWeights resolve(String scenarioId, DisasterMode mode) {
        if (scenarioId != null && BY_SCENARIO.containsKey(scenarioId)) {
            return BY_SCENARIO.get(scenarioId);
        }
        if (mode != null) {
            return BY_MODE.getOrDefault(mode, BALANCED);
        }
        return BALANCED;
    }
}
