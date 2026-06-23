package com.horizon.resilience.service;

import com.horizon.design.dto.DesignMetrics;
import com.horizon.disaster.dto.DisasterMetrics;
import com.horizon.resilience.dto.AirQualityMetrics;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Deterministic, education-grade scoring for the unified resilience model.
 *
 * <p>Each axis maps its domain metrics to a 0..100 "healthier is higher" score.
 * The composite resilience score is a scenario-weighted average minus a balance
 * penalty so that a design strong on one axis but weak on another is rated below
 * a balanced design (systemic-thinking incentive — see RESILIENCE_DESIGN.md §5).</p>
 */
@Component
public class ResilienceScoring {

    /** Heat axis: lower surface-vs-air delta is better. ~1°C delta ≈ excellent. */
    public double heatScore(DesignMetrics m) {
        double delta = m.deltaT();
        double score = 100.0 - (delta - 1.0) * 9.0;
        return clamp(score);
    }

    /** Disaster axis: lower average risk is better. */
    public double disasterScore(DisasterMetrics m) {
        return clamp((1.0 - m.avgRisk()) * 100.0);
    }

    /** Air axis: lower average PM is better. ~15µg/m³ ≈ excellent, 75µg/m³ ≈ poor. */
    public double airScore(AirQualityMetrics m) {
        double score = 100.0 - (m.avgPm() - 15.0) * 1.35;
        return clamp(score);
    }

    /**
     * Composite resilience: scenario-weighted mean of present axes minus a
     * balance penalty {@code alpha * (max - min)} over the axis scores.
     */
    public Composite composite(Map<String, Double> axisScores, ScenarioWeights weights) {
        if (axisScores.isEmpty()) {
            return new Composite(0.0, 0.0);
        }
        Map<String, Double> w = weights.asMap();
        double weightedSum = 0.0;
        double weightTotal = 0.0;
        double max = Double.NEGATIVE_INFINITY;
        double min = Double.POSITIVE_INFINITY;
        for (Map.Entry<String, Double> e : axisScores.entrySet()) {
            double weight = w.getOrDefault(e.getKey(), 1.0);
            weightedSum += weight * e.getValue();
            weightTotal += weight;
            max = Math.max(max, e.getValue());
            min = Math.min(min, e.getValue());
        }
        double base = weightTotal == 0 ? 0.0 : weightedSum / weightTotal;
        double penalty = axisScores.size() < 2 ? 0.0 : weights.balanceAlpha() * (max - min);
        return new Composite(round(clamp(base - penalty)), round(penalty));
    }

    private double clamp(double v) {
        if (Double.isNaN(v)) {
            return 0.0;
        }
        return Math.max(0.0, Math.min(100.0, v));
    }

    private double round(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    public record Composite(double resilienceScore, double balancePenalty) {
    }
}
