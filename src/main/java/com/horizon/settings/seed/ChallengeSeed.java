package com.horizon.settings.seed;

import com.horizon.settings.entity.ChallengeConfig;
import com.horizon.settings.repository.ChallengeConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChallengeSeed {

    private final ChallengeConfigRepository challengeConfigRepository;

    public void seedIfEmpty() {
        if (challengeConfigRepository.count() > 0) {
            seedDisasterIfMissing();
            return;
        }
        challengeConfigRepository.saveAll(defaultUrbanClimateChallenges());
        challengeConfigRepository.saveAll(defaultDisasterChallenges());
        log.info("Seeded challenge_config rows");
    }

    public void seedDisasterIfMissing() {
        long disasterCount = challengeConfigRepository.findByExperienceIdAndEnabledTrueOrderBySortOrderAsc("typhoon").size();
        if (disasterCount > 0) {
            return;
        }
        challengeConfigRepository.saveAll(defaultDisasterChallenges());
        log.info("Seeded disaster challenge_config rows");
    }

    /** 기존 DB의 제목·힌트 문구를 최신 기본값으로 맞춥니다 (규칙/threshold는 유지). */
    public void syncDefaultCopy() {
        int updated = 0;
        for (ChallengeConfig template : defaultUrbanClimateChallenges()) {
            var opt = challengeConfigRepository.findById(template.getId());
            if (opt.isEmpty()) continue;
            ChallengeConfig existing = opt.get();
            if (existing.getTitle().equals(template.getTitle())
                    && existing.getDescription().equals(template.getDescription())) {
                continue;
            }
            existing.update(
                    template.getTitle(),
                    template.getDescription(),
                    existing.getRuleType(),
                    existing.getThreshold(),
                    existing.getRuleParamsJson(),
                    existing.isEnabled(),
                    existing.getSortOrder()
            );
            challengeConfigRepository.save(existing);
            updated++;
        }
        if (updated > 0) {
            log.info("Updated challenge copy for {} rows", updated);
        }
    }

    public static List<ChallengeConfig> defaultUrbanClimateChallenges() {
        return List.of(
                c("green-15", 1, "녹지 입문",
                        "팔레트에서 공원·가로수를 고르고, 회색 도로·건물이 많은 칸부터 녹색으로 바꿔 보세요. 왼쪽 지표에서 녹지가 늘어나는지 확인하면 됩니다.",
                        "GREEN_RATIO_MIN", 0.15, null),
                c("green-30", 2, "녹색 도시",
                        "도시 전체에 공원과 가로수를 고르게 배치해 보세요. 녹지가 늘수록 평균 온도가 내려가는지 히트맵으로 확인해 보세요.",
                        "GREEN_RATIO_MIN", 0.30, null),
                c("green-50", 3, "숲속 도시",
                        "건물·도로를 대폭 줄이고 잔디·나무·습지로 채워 보세요. 도시 절반이 가까이 녹색이 되도록 설계해 보세요.",
                        "GREEN_RATIO_MIN", 0.50, null),
                c("cool-touch", 4, "첫 번째 시원함",
                        "콘크리트만 가득한 기본 도시에서 출발해, 시원한 타일(공원·나무·물)을 배치하세요. 왼쪽 패널에서 평균 온도가 기준보다 내려갔는지 보면 됩니다.",
                        "DELTA_T_MAX", 0.0, null),
                c("cool-1", 5, "눈에 띄는 냉각",
                        "녹지와 수변을 더 늘려 보세요. 왼쪽 지표에서 기준보다 온도가 눈에 띄게 더 내려갔는지 확인하세요.",
                        "DELTA_T_MAX", -1.0, null),
                c("cool-3", 6, "열섬 깨기",
                        "도로를 줄이고 그늘·공원·물가를 늘려 보세요. Before/After에서 평균 온도가 크게 내려가도록 설계해 보세요.",
                        "DELTA_T_MAX", -3.0, null),
                c("cool-5", 7, "쿨링 챔피언",
                        "가능한 한 많은 녹지·수변·습지를 배치해 보세요. 열섬 완화 효과가 크게 나타나도록 도시 밀도를 낮춰 보세요.",
                        "DELTA_T_MAX", -5.0, null),
                c("water-10", 8, "물가 도시",
                        "수변·습지 타일로 연못이나 하천을 만들어 보세요. 물은 주변을 식히는 데 효과가 큽니다.",
                        "WATER_RATIO_MIN", 0.10, null),
                c("water-20", 9, "블루 도시",
                        "도시 곳곳에 물과 습지를 연결해 보세요. 수면 비율이 늘수록 더 시원해지는지 지표를 확인하세요.",
                        "WATER_RATIO_MIN", 0.20, null),
                c("less-concrete-55", 10, "콘크리트 다이어트",
                        "도로·건물 타일을 공원·보도·광장 등으로 바꿔 보세요. 불투수면(뜨거운 포장)이 줄어드는 방향으로 설계하세요.",
                        "IMPERVIOUS_RATIO_MAX", 0.55, null),
                c("less-concrete-40", 11, "보행 친화 도시",
                        "넓은 도로 대신 녹지·보도·작은 블록을 섞어 보세요. 아스팔트·건물 비중을 줄이면 온도도 함께 내려갑니다.",
                        "IMPERVIOUS_RATIO_MAX", 0.40, null),
                c("tree-10", 12, "가로수 거리",
                        "가로수 타일로 길을 따라 나무를 심어 보세요. 한 줄의 그늘이 생기면 주변 온도가 눈에 띄게 달라집니다.",
                        "TILE_COUNT_MIN", null, "{\"tileType\":\"TREE\",\"minCount\":10}"),
                c("tree-25", 13, "그늘 벨트",
                        "도시를 가로·세로로 가로수 띠(벨트)로 연결해 보세요. 드래그로 길게 이어서 칠하면 빠릅니다.",
                        "TILE_COUNT_MIN", null, "{\"tileType\":\"TREE\",\"minCount\":25}"),
                c("park-15", 14, "도심 공원",
                        "공원 타일로 넓은 잔디밭을 만들어 보세요. 건물 사이사이에 녹색 공간을 넣으면 열섬이 완화됩니다.",
                        "TILE_COUNT_MIN", null, "{\"tileType\":\"PARK\",\"minCount\":15}"),
                c("wetland-8", 15, "습지 공원",
                        "습지 타일로 작은 연못·습지원을 만들어 보세요. 물과 풀이 함께 있으면 주변 냉각에 도움이 됩니다.",
                        "TILE_COUNT_MIN", null, "{\"tileType\":\"WETLAND\",\"minCount\":8}"),
                c("oasis", 16, "오아시스 도시",
                        "녹지를 넓히면서 동시에 평균 온도가 확실히 내려가도록 설계해 보세요. 두 가지를 한 번에 만족시켜야 합니다.",
                        "ALL_OF", null,
                        "[{\"ruleType\":\"GREEN_RATIO_MIN\",\"threshold\":0.30},{\"ruleType\":\"DELTA_T_MAX\",\"threshold\":-2}]"),
                c("river-green", 17, "강변 공원",
                        "물가(수변·습지)와 공원·가로수를 함께 배치해 강변 공원처럼 만들어 보세요.",
                        "ALL_OF", null,
                        "[{\"ruleType\":\"GREEN_RATIO_MIN\",\"threshold\":0.25},{\"ruleType\":\"WATER_RATIO_MIN\",\"threshold\":0.10}]"),
                c("master-cool", 18, "쿨시티 마스터",
                        "녹지·수변·가로수를 종합적으로 배치해, 도시 전체가 눈에 띄게 시원해지도록 설계해 보세요. 최고 난이도입니다.",
                        "ALL_OF", null,
                        "[{\"ruleType\":\"GREEN_RATIO_MIN\",\"threshold\":0.40},{\"ruleType\":\"DELTA_T_MAX\",\"threshold\":-4}]")
        );
    }

    private static ChallengeConfig c(String id, int order, String title, String hint,
                                     String ruleType, Double threshold, String paramsJson) {
        return ChallengeConfig.builder()
                .id(id)
                .experienceId("urban-climate")
                .title(title)
                .description(hint)
                .ruleType(ruleType)
                .threshold(threshold)
                .ruleParamsJson(paramsJson)
                .enabled(true)
                .sortOrder(order)
                .build();
    }

    public static List<ChallengeConfig> defaultDisasterChallenges() {
        return List.of(
                dc("typhoon-flood-30", "typhoon", 1, "침수 30% 이하",
                        "저지대 침수 셀을 줄이세요. 배수·녹지 완충·방조제를 활용하세요.",
                        "FLOOD_RATIO_MAX", 0.30, null),
                dc("typhoon-wind-25", "typhoon", 2, "강풍 노출 25% 이하",
                        "강풍 위험 셀을 줄이세요. 방조제와 녹지로 바람을 막아 보세요.",
                        "WIND_EXPOSURE_MAX", 0.25, null),
                dc("typhoon-shelter-5", "typhoon", 3, "대피소 5칸",
                        "대피소(SHELTER) 타일을 5칸 이상 배치하세요.",
                        "TILE_COUNT_MIN", null, "{\"tileType\":\"SHELTER\",\"minCount\":5}"),
                dc("eq-collapse-20", "earthquake", 1, "붕괴 위험 20% 이하",
                        "붕괴 위험 셀 비율을 낮추세요. 옹벽·공원·대피소를 활용하세요.",
                        "COLLAPSE_RISK_MAX", 0.20, null),
                dc("eq-evac-70", "earthquake", 2, "대피 커버 70%",
                        "대피 가능 비율을 70% 이상으로 높이세요.",
                        "EVAC_3MIN_RATIO_MIN", 0.70, null),
                dc("eq-shelter-8", "earthquake", 3, "대피소·고지 8칸",
                        "SHELTER 또는 HIGH_GROUND 타일 합계 8칸 이상.",
                        "DISASTER_TILE_SUM_MIN", null, "{\"tileTypes\":[\"SHELTER\",\"HIGH_GROUND\"],\"minCount\":8}"),
                dc("tsunami-inund-25", "tsunami", 1, "침수 25% 이하",
                        "해일 침수 셀을 줄이세요. 방조제와 고지대를 배치하세요.",
                        "INUNDATION_RATIO_MAX", 0.25, null),
                dc("tsunami-high-10", "tsunami", 2, "고지·대피 10%",
                        "HIGH_GROUND·SHELTER 타일 비율 10% 이상.",
                        "HIGH_GROUND_COVERAGE_MIN", 0.10, null),
                dc("tsunami-seawall-6", "tsunami", 3, "방조제 6칸",
                        "해안가에 SEAWALL 타일 6칸 이상 배치하세요.",
                        "TILE_COUNT_MIN", null, "{\"tileType\":\"SEAWALL\",\"minCount\":6}")
        );
    }

    private static ChallengeConfig dc(String id, String experienceId, int order, String title, String hint,
                                      String ruleType, Double threshold, String paramsJson) {
        return ChallengeConfig.builder()
                .id(id)
                .experienceId(experienceId)
                .title(title)
                .description(hint)
                .ruleType(ruleType)
                .threshold(threshold)
                .ruleParamsJson(paramsJson)
                .enabled(true)
                .sortOrder(order)
                .build();
    }
}
