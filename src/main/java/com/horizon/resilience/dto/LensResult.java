package com.horizon.resilience.dto;

import java.util.List;

/**
 * One evaluation axis ("lens") over the shared city grid.
 *
 * @param kind    axis key: "heat" | "air" | "disaster" | "agriculture"
 * @param label   Korean display label
 * @param heatmap per-cell value grid for the axis-specific heatmap overlay
 * @param min     global min of the heatmap (for color scaling)
 * @param max     global max of the heatmap (for color scaling)
 * @param score   normalized axis score 0..100 (higher is better/healthier)
 * @param metrics axis-specific metrics payload (record serialized by Jackson)
 */
public record LensResult(
        String kind,
        String label,
        List<List<Double>> heatmap,
        double min,
        double max,
        double score,
        Object metrics
) {
}
