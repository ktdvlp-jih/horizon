package com.horizon.ai.dto;

import java.util.Map;

public record CoachSettingsDto(
        String systemPrompt,
        String userPromptTemplate,
        String model,
        String baseUrl,
        String apiKey,
        double temperature,
        boolean llmEnabled,
        Map<String, Object> ruleWeights,
        Map<String, Object> gradeThresholds,
        String learningPointDefault
) {
}
