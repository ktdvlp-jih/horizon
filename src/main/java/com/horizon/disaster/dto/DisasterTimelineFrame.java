package com.horizon.disaster.dto;

import java.util.List;

public record DisasterTimelineFrame(
        int stepIndex,
        String label,
        double progress,
        List<List<Double>> cellValues,
        double avgRisk,
        double maxRisk,
        double affectedRatio
) {
}
