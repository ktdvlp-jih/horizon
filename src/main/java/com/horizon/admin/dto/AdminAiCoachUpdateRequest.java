package com.horizon.admin.dto;

import java.util.Map;

public record AdminAiCoachUpdateRequest(
        String systemPrompt,
        String userPromptTemplate,
        String openaiModel,
        String openaiBaseUrl,
        String apiKey,
        Double temperature,
        Boolean llmEnabled,
        Map<String, Object> ruleWeights,
        Map<String, Object> gradeThresholds,
        String learningPointDefault
) {
}
