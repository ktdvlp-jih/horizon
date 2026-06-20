package com.horizon.admin.service;

import com.horizon.admin.dto.AdminAiCoachTestRequest;
import com.horizon.admin.dto.AdminAiCoachUpdateRequest;
import com.horizon.auth.util.AuthUtil;
import com.horizon.design.dto.DesignSummary;
import com.horizon.ai.client.AiServiceClient;
import com.horizon.ai.dto.CoachRequest;
import com.horizon.ai.dto.CoachResponse;
import com.horizon.ai.dto.CoachSettingsDto;
import com.horizon.design.repository.CityDesignRepository;
import com.horizon.design.service.DesignService;
import com.horizon.settings.repository.RegionConfigRepository;
import com.horizon.settings.service.AiCoachSettingsService;
import com.horizon.user.repository.UserRepository;
import com.horizon.weather.crawler.KmaWeatherClient;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminSystemService {

    private final DataSource dataSource;
    private final AiServiceClient aiServiceClient;
    private final KmaWeatherClient kmaWeatherClient;
    private final UserRepository userRepository;
    private final CityDesignRepository cityDesignRepository;
    private final DesignService designService;
    private final AiCoachSettingsService aiCoachSettingsService;
    private final RegionConfigRepository regionConfigRepository;

    @Value("${horizon.cors.origins:}")
    private String corsOrigins;

    @Value("${horizon.settings.encryption-key:}")
    private String encryptionKey;

    public Map<String, Object> health() {
        Map<String, Object> ai = new HashMap<>();
        ai.put("status", aiServiceClient.isHealthy() ? "UP" : "DOWN");
        try {
            var aiHealth = aiServiceClient.health();
            ai.put("model", aiHealth != null ? aiHealth.model() : "unknown");
        } catch (Exception e) {
            ai.put("model", "unknown");
        }
        return Map.of(
                "spring", "UP",
                "database", databaseUp() ? "UP" : "DOWN",
                "aiService", ai,
                "kmaApiConfigured", kmaWeatherClient.isConfigured(),
                "checkedAt", java.time.LocalDateTime.now().toString()
        );
    }

    public Map<String, Object> stats() {
        List<DesignSummary> top5 = designService.leaderboard(null, 5);
        return Map.of(
                "userCount", userRepository.count(),
                "activeUserCount", userRepository.countByUseYn("Y"),
                "designCount", cityDesignRepository.countByDeletedAtIsNull(),
                "designCountToday", cityDesignRepository.countByDeletedAtIsNull(),
                "leaderboardTop5", top5
        );
    }

    public Map<String, Object> configSummary() {
        var view = aiCoachSettingsService.getView(null);
        return Map.of(
                "corsOrigins", corsOrigins,
                "aiModel", view.openaiModel(),
                "aiLlmEnabled", view.llmEnabled(),
                "aiKeyConfigured", view.apiKeyConfigured(),
                "regionCount", regionConfigRepository.count(),
                "encryptionKeyConfigured", encryptionKey != null && !encryptionKey.isBlank()
                        && !encryptionKey.contains("horizon-dev-settings-key")
        );
    }

    @Transactional
    public AiCoachSettingsService.AiCoachSettingsView updateAiCoach(AdminAiCoachUpdateRequest req) {
        Long adminId = AuthUtil.currentUserId();
        String loginId = AuthUtil.currentUser().getUsername();
        return aiCoachSettingsService.update(new AiCoachSettingsService.UpdateCommand(
                req.systemPrompt(),
                req.userPromptTemplate(),
                req.openaiModel(),
                req.openaiBaseUrl(),
                req.apiKey(),
                req.temperature(),
                req.llmEnabled(),
                req.ruleWeights(),
                req.gradeThresholds(),
                req.learningPointDefault()
        ), adminId, loginId);
    }

    public AdminAiCoachTestRequest.AdminAiCoachTestResponse testAiCoach(AdminAiCoachTestRequest request) {
        AdminAiCoachTestRequest.SampleMetrics m = request.sampleMetrics();
        if (m == null) {
            m = defaultSample();
        }
        CoachSettingsDto settings = request.useSavedSettings()
                ? aiCoachSettingsService.getActiveDecrypted()
                : aiCoachSettingsService.getActiveDecrypted();

        CoachRequest coachRequest = new CoachRequest(
                m.region(),
                m.baseAirTemp(),
                m.solarLoad(),
                m.gridSize(),
                m.greenRatio(),
                m.imperviousRatio(),
                m.waterRatio(),
                m.avgSurfaceTemp(),
                m.maxSurfaceTemp(),
                m.deltaT(),
                m.tileCounts(),
                settings
        );
        long start = System.currentTimeMillis();
        CoachResponse response = aiServiceClient.coach(coachRequest);
        long latency = System.currentTimeMillis() - start;
        return new AdminAiCoachTestRequest.AdminAiCoachTestResponse(latency, response.source(), response);
    }

    private AdminAiCoachTestRequest.SampleMetrics defaultSample() {
        return new AdminAiCoachTestRequest.SampleMetrics(
                "seoul", 33.5, 0.86, 10, 0.12, 0.0, 0.88, 45.2, 52.1, 11.7,
                Map.of("BUILDING", 45, "ROAD", 43, "BARE", 12)
        );
    }

    private boolean databaseUp() {
        try (Connection conn = dataSource.getConnection()) {
            return conn.isValid(2);
        } catch (Exception e) {
            return false;
        }
    }
}
