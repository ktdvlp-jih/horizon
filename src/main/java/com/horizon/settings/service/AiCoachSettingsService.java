package com.horizon.settings.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.horizon.ai.dto.CoachSettingsDto;
import com.horizon.common.exception.BusinessException;
import com.horizon.common.exception.ErrorCode;
import com.horizon.settings.entity.AiCoachSettings;
import com.horizon.settings.repository.AiCoachSettingsRepository;
import com.horizon.settings.seed.AdminSettingsSeedRunner;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiCoachSettingsService {

    private static final short SINGLETON_ID = 1;

    private final AiCoachSettingsRepository repository;
    private final SettingsEncryptionService encryptionService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public AiCoachSettings getEntity() {
        return repository.findById(SINGLETON_ID)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "AI 코치 설정이 없습니다."));
    }

    @Transactional(readOnly = true)
    public CoachSettingsDto getActiveDecrypted() {
        AiCoachSettings s = getEntity();
        return toDto(s, decryptKey(s));
    }

    public CoachSettingsDto toPublicDto(AiCoachSettings s, String updatedByLoginId) {
        return new CoachSettingsDto(
                s.getSystemPrompt(),
                s.getUserPromptTemplate(),
                s.getOpenaiModel(),
                s.getOpenaiBaseUrl() != null ? s.getOpenaiBaseUrl() : "",
                null,
                s.getTemperature().doubleValue(),
                s.isLlmEnabled(),
                parseMap(s.getRuleWeightsJson()),
                parseMap(s.getGradeThresholdsJson()),
                s.getLearningPointDefault()
        );
    }

    public record AiCoachSettingsView(
            String systemPrompt,
            String userPromptTemplate,
            String openaiModel,
            String openaiBaseUrl,
            String apiKeyMasked,
            boolean apiKeyConfigured,
            double temperature,
            boolean llmEnabled,
            Map<String, Object> ruleWeights,
            Map<String, Object> gradeThresholds,
            String learningPointDefault,
            java.time.LocalDateTime updatedAt,
            String updatedByLoginId
    ) {
    }

    @Transactional(readOnly = true)
    public AiCoachSettingsView getView(String updatedByLoginId) {
        AiCoachSettings s = getEntity();
        String plainKey = decryptKey(s);
        return new AiCoachSettingsView(
                s.getSystemPrompt(),
                s.getUserPromptTemplate(),
                s.getOpenaiModel(),
                s.getOpenaiBaseUrl() != null ? s.getOpenaiBaseUrl() : "",
                encryptionService.maskApiKey(plainKey),
                plainKey != null && !plainKey.isBlank(),
                s.getTemperature().doubleValue(),
                s.isLlmEnabled(),
                parseMap(s.getRuleWeightsJson()),
                parseMap(s.getGradeThresholdsJson()),
                s.getLearningPointDefault(),
                s.getUpdatedAt(),
                updatedByLoginId
        );
    }

    @Transactional
    public AiCoachSettingsView update(UpdateCommand cmd, Long adminId, String adminLoginId) {
        AiCoachSettings s = getEntity();
        String apiKeyEnc = s.getOpenaiApiKeyEnc();
        if (cmd.apiKey() != null && !cmd.apiKey().isBlank() && !encryptionService.isMaskedPlaceholder(cmd.apiKey())) {
            apiKeyEnc = encryptionService.encrypt(cmd.apiKey().trim());
        }
        String ruleJson = cmd.ruleWeights() != null ? writeJson(cmd.ruleWeights()) : s.getRuleWeightsJson();
        String gradeJson = cmd.gradeThresholds() != null ? writeJson(cmd.gradeThresholds()) : s.getGradeThresholdsJson();
        s.applyUpdate(
                cmd.systemPrompt() != null ? cmd.systemPrompt() : s.getSystemPrompt(),
                cmd.userPromptTemplate() != null ? cmd.userPromptTemplate() : s.getUserPromptTemplate(),
                cmd.openaiModel() != null ? cmd.openaiModel() : s.getOpenaiModel(),
                cmd.openaiBaseUrl() != null ? cmd.openaiBaseUrl() : s.getOpenaiBaseUrl(),
                apiKeyEnc,
                cmd.temperature() != null ? BigDecimal.valueOf(cmd.temperature()) : s.getTemperature(),
                cmd.llmEnabled() != null ? cmd.llmEnabled() : s.isLlmEnabled(),
                ruleJson,
                gradeJson,
                cmd.learningPointDefault() != null ? cmd.learningPointDefault() : s.getLearningPointDefault(),
                adminId
        );
        return getView(adminLoginId);
    }

    public record UpdateCommand(
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

    private CoachSettingsDto toDto(AiCoachSettings s, String apiKey) {
        return new CoachSettingsDto(
                s.getSystemPrompt(),
                s.getUserPromptTemplate(),
                s.getOpenaiModel(),
                s.getOpenaiBaseUrl() != null ? s.getOpenaiBaseUrl() : "",
                apiKey,
                s.getTemperature().doubleValue(),
                s.isLlmEnabled(),
                parseMap(s.getRuleWeightsJson()),
                parseMap(s.getGradeThresholdsJson()),
                s.getLearningPointDefault()
        );
    }

    private String decryptKey(AiCoachSettings s) {
        if (s.getOpenaiApiKeyEnc() == null || s.getOpenaiApiKeyEnc().isBlank()) {
            return null;
        }
        return encryptionService.decrypt(s.getOpenaiApiKeyEnc());
    }

    private Map<String, Object> parseMap(String json) {
        return AdminSettingsSeedRunner.parseJsonMap(objectMapper, json);
    }

    private String writeJson(Map<String, Object> map) {
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "JSON 직렬화에 실패했습니다.");
        }
    }
}
