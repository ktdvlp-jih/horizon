package com.horizon.settings.seed;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.horizon.settings.entity.AiCoachSettings;
import com.horizon.settings.entity.RegionConfig;
import com.horizon.settings.repository.AiCoachSettingsRepository;
import com.horizon.settings.repository.RegionConfigRepository;
import com.horizon.settings.service.SettingsEncryptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@Order(20)
@RequiredArgsConstructor
public class AdminSettingsSeedRunner implements ApplicationRunner {

    public static final String DEFAULT_SYSTEM_PROMPT = """
            당신은 도시 기후 설계를 코칭하는 AI 도시 코치입니다. 사용자가 설계한 도시의 지표와 타일 구성을 보고 열섬 완화 관점에서 평가합니다. 사용 가능한 타일: 건물, 도로, 맨땅, 공원, 가로수, 수변, 보도, 습지, 광장. 도로·건물은 덥고, 녹지·수변·습지·가로수는 시원합니다. 보도·광장은 도로보다 덜 뜨겁습니다. 설명만 늘어놓지 말고, 사용자의 다음 행동을 이끄는 구체적이고 짧은 피드백을 줍니다. 타일 이름은 반드시 한국어로 씁니다. 반드시 한국어로, 아래 JSON 스키마로만 응답하세요.
            {"score": int(0-100), "grade": str, "strengths": [str], "weaknesses": [str], "suggestions": [str], "learningPoint": str}""";

    public static final String DEFAULT_USER_TEMPLATE = """
            지역: {region}
            기준 기온: {baseAirTemp}°C, 일사량(정규화): {solarLoad}
            격자 크기: {gridSize}x{gridSize}
            녹지율: {greenRatio}, 수면·습지율: {waterRatio}, 불투수면율: {imperviousRatio}
            평균 표면온도: {avgSurfaceTemp}°C (기준 대비 {deltaT}°C), 최고 표면온도: {maxSurfaceTemp}°C
            타일 구성: {tileCounts}
            위 설계를 평가하고 더 시원한 도시로 가기 위한 제안을 JSON으로 주세요.""";

    public static final String DEFAULT_LEARNING_POINT =
            "알베도가 낮은 도로·건물은 햇빛을 흡수해 데워지고, 공원·가로수·수변·습지·광장은 주변까지 식힙니다. 보도는 도로보다 덜 뜨겁습니다.";

    public static final String DEFAULT_RULE_WEIGHTS_JSON = """
            {"baseScore":50,"greenMultiplier":60,"greenMax":28,"waterMultiplier":50,"waterMax":12,"deltaTMultiplier":4,"deltaTMax":22,"imperviousMultiplier":25,"imperviousMax":18,"greenRatioThreshold":0.30,"imperviousRatioThreshold":0.60,"roadRatioThreshold":0.35,"roadHighThreshold":0.40,"buildingRatioThreshold":0.50,"greenTilesLowThreshold":0.10}""";

    public static final String DEFAULT_GRADE_THRESHOLDS_JSON = """
            {"S":90,"A":75,"B":60,"C":45,"labels":{"S":"S · 쿨시티 마스터","A":"A · 시원한 도시","B":"B · 양호","C":"C · 개선 필요","D":"D · 열섬 위험"}}""";

    private final AiCoachSettingsRepository aiCoachSettingsRepository;
    private final RegionConfigRepository regionConfigRepository;
    private final ChallengeSeed challengeSeed;
    private final SettingsEncryptionService encryptionService;
    private final ObjectMapper objectMapper;

    @Value("${OPENAI_API_KEY:}")
    private String openAiApiKeyEnv;

    @Value("${OPENAI_MODEL:gpt-4o-mini}")
    private String openAiModelEnv;

    @Value("${OPENAI_BASE_URL:}")
    private String openAiBaseUrlEnv;

    @Override
    public void run(ApplicationArguments args) {
        seedAiCoachSettings();
        seedRegions();
        challengeSeed.seedIfEmpty();
        challengeSeed.syncDefaultCopy();
    }

    private void seedAiCoachSettings() {
        if (aiCoachSettingsRepository.existsById((short) 1)) {
            return;
        }
        String apiKeyEnc = null;
        if (openAiApiKeyEnv != null && !openAiApiKeyEnv.isBlank()) {
            apiKeyEnc = encryptionService.encrypt(openAiApiKeyEnv.trim());
        }
        AiCoachSettings settings = AiCoachSettings.builder()
                .id((short) 1)
                .systemPrompt(DEFAULT_SYSTEM_PROMPT.trim())
                .userPromptTemplate(DEFAULT_USER_TEMPLATE.trim())
                .openaiModel(openAiModelEnv)
                .openaiBaseUrl(openAiBaseUrlEnv != null && !openAiBaseUrlEnv.isBlank() ? openAiBaseUrlEnv : null)
                .openaiApiKeyEnc(apiKeyEnc)
                .temperature(new BigDecimal("0.60"))
                .llmEnabled(true)
                .ruleWeightsJson(DEFAULT_RULE_WEIGHTS_JSON.trim())
                .gradeThresholdsJson(DEFAULT_GRADE_THRESHOLDS_JSON.trim())
                .learningPointDefault(DEFAULT_LEARNING_POINT)
                .updatedAt(LocalDateTime.now())
                .build();
        aiCoachSettingsRepository.save(settings);
        log.info("Seeded ai_coach_settings (singleton id=1)");
    }

    private void seedRegions() {
        if (regionConfigRepository.count() > 0) {
            return;
        }
        List<RegionConfig> regions = List.of(
                region("seoul", "서울", "108", 33.5, 0.86, 1, 0.25, 2, null),
                region("busan", "부산", "159", 30.8, 0.80, 2, 0.75, 3, "[12,8,5,3,1]"),
                region("daegu", "대구", "143", 35.2, 0.90, 3, 0.15, 3, "[6,5,4,3,2]"),
                region("incheon", "인천", "112", 31.9, 0.78, 4, 0.65, 2, "[10,7,4,2,1]"),
                region("gwangju", "광주", "156", 33.1, 0.84, 5, 0.20, 2, "[5,4,3,2,1]"),
                region("daejeon", "대전", "133", 33.8, 0.85, 6, 0.10, 2, "[5,4,3,2,1]"),
                region("jeju", "제주", "184", 31.0, 0.74, 7, 0.85, 2, "[14,10,6,3,1]"),
                region("ulsan", "울산", "152", 31.5, 0.82, 8, 0.70, 3, "[11,8,5,3,1]")
        );
        regionConfigRepository.saveAll(regions);
        log.info("Seeded {} region_config rows", regions.size());
    }

    private static RegionConfig region(String code, String name, String station,
                                       double temp, double solar, int order,
                                       double coastal, int seismic, String elevationJson) {
        return RegionConfig.builder()
                .code(code)
                .name(name)
                .kmaStation(station)
                .sampleTemp(temp)
                .sampleSolar(solar)
                .enabled(true)
                .sortOrder(order)
                .coastalExposure(coastal)
                .seismicZone(seismic)
                .elevationProfileJson(elevationJson)
                .build();
    }

    public static Map<String, Object> parseJsonMap(ObjectMapper mapper, String json) {
        try {
            return mapper.readValue(json, new TypeReference<>() {
            });
        } catch (Exception e) {
            throw new IllegalStateException("Invalid JSON settings", e);
        }
    }
}
