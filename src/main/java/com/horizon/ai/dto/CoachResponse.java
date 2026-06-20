package com.horizon.ai.dto;

import java.util.List;

public record CoachResponse(
        int score,
        String grade,
        List<String> strengths,
        List<String> weaknesses,
        List<String> suggestions,
        String learningPoint,
        String source
) {
}
