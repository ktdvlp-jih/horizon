package com.horizon.settings.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "ai_coach_settings")
public class AiCoachSettings {

    @Id
    private Short id;

    @Column(name = "system_prompt", nullable = false, columnDefinition = "text")
    private String systemPrompt;

    @Column(name = "user_prompt_template", nullable = false, columnDefinition = "text")
    private String userPromptTemplate;

    @Column(name = "openai_model", nullable = false, length = 100)
    private String openaiModel;

    @Column(name = "openai_base_url", length = 500)
    private String openaiBaseUrl;

    @Column(name = "openai_api_key_enc", columnDefinition = "text")
    private String openaiApiKeyEnc;

    @Column(nullable = false, precision = 3, scale = 2)
    private BigDecimal temperature;

    @Column(name = "llm_enabled", nullable = false)
    private boolean llmEnabled;

    @Column(name = "rule_weights_json", nullable = false, columnDefinition = "text")
    private String ruleWeightsJson;

    @Column(name = "grade_thresholds_json", nullable = false, columnDefinition = "text")
    private String gradeThresholdsJson;

    @Column(name = "learning_point_default", nullable = false, columnDefinition = "text")
    private String learningPointDefault;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public AiCoachSettings(Short id, String systemPrompt, String userPromptTemplate, String openaiModel,
                           String openaiBaseUrl, String openaiApiKeyEnc, BigDecimal temperature, boolean llmEnabled,
                           String ruleWeightsJson, String gradeThresholdsJson, String learningPointDefault,
                           Long updatedBy, LocalDateTime updatedAt) {
        this.id = id;
        this.systemPrompt = systemPrompt;
        this.userPromptTemplate = userPromptTemplate;
        this.openaiModel = openaiModel;
        this.openaiBaseUrl = openaiBaseUrl;
        this.openaiApiKeyEnc = openaiApiKeyEnc;
        this.temperature = temperature;
        this.llmEnabled = llmEnabled;
        this.ruleWeightsJson = ruleWeightsJson;
        this.gradeThresholdsJson = gradeThresholdsJson;
        this.learningPointDefault = learningPointDefault;
        this.updatedBy = updatedBy;
        this.updatedAt = updatedAt;
    }

    public void applyUpdate(String systemPrompt, String userPromptTemplate, String openaiModel, String openaiBaseUrl,
                            String openaiApiKeyEnc, BigDecimal temperature, boolean llmEnabled,
                            String ruleWeightsJson, String gradeThresholdsJson, String learningPointDefault,
                            Long updatedBy) {
        this.systemPrompt = systemPrompt;
        this.userPromptTemplate = userPromptTemplate;
        this.openaiModel = openaiModel;
        this.openaiBaseUrl = openaiBaseUrl;
        if (openaiApiKeyEnc != null) {
            this.openaiApiKeyEnc = openaiApiKeyEnc;
        }
        this.temperature = temperature;
        this.llmEnabled = llmEnabled;
        this.ruleWeightsJson = ruleWeightsJson;
        this.gradeThresholdsJson = gradeThresholdsJson;
        this.learningPointDefault = learningPointDefault;
        this.updatedBy = updatedBy;
        this.updatedAt = LocalDateTime.now();
    }
}
