package com.horizon.disaster.seed;

import com.horizon.disaster.dto.DisasterMode;
import com.horizon.disaster.entity.DisasterScenario;
import com.horizon.disaster.repository.DisasterScenarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

@Slf4j
@Component
@Order(25)
@RequiredArgsConstructor
public class DisasterScenarioSeed {

    private final DisasterScenarioRepository repository;

    public void seedIfEmpty() {
        if (repository.count() == 0) {
            repository.saveAll(defaultScenarios());
            log.info("Seeded disaster_scenario rows");
        }
        syncDefaultCopy();
    }

    /** SQL 수동 시드 등으로 한글이 깨졌을 때 Java 기본값으로 제목·설명을 복구합니다. */
    public void syncDefaultCopy() {
        int updated = 0;
        int inserted = 0;
        for (DisasterScenario template : defaultScenarios()) {
            var opt = repository.findById(template.getId());
            if (opt.isEmpty()) {
                repository.save(template);
                inserted++;
                continue;
            }
            DisasterScenario existing = opt.get();
            if (!existing.getTitle().equals(template.getTitle())
                    || !Objects.equals(existing.getDescription(), template.getDescription())) {
                existing.update(
                        template.getTitle(),
                        template.getDescription(),
                        existing.getParamsJson(),
                        existing.getRegionCode(),
                        existing.isEnabled(),
                        existing.getSortOrder());
                updated++;
            }
        }
        if (updated > 0 || inserted > 0) {
            log.info("Synced disaster_scenario copy (updated={}, inserted={})", updated, inserted);
        }
    }

    static List<DisasterScenario> defaultScenarios() {
        return List.of(
                typhoon("typhoon-maemi-2003", "태풍 매미 (2003)", "강풍·호우로 침수 피해가 컸던 사례입니다. 방조제·배수·대피소를 배치해 보세요.",
                        "MAEMI2003", "busan", 1, """
                        {"maxWindMs":55,"windRadiusKm":120,"rainfallMm":350,"track":[
                        {"hour":0,"latOffset":-0.3,"lonOffset":0.2,"windMs":35},
                        {"hour":6,"latOffset":-0.1,"lonOffset":0.1,"windMs":48},
                        {"hour":12,"latOffset":0.0,"lonOffset":0.0,"windMs":55},
                        {"hour":18,"latOffset":0.15,"lonOffset":-0.1,"windMs":42}
                        ]}"""),
                typhoon("typhoon-seoul-capital-2024", "수도권 집중호우·태풍 (교육용)", "서울·수도권 저지대 침수와 강풍을 동시에 대비하는 시나리오입니다.",
                        "CAPITAL2024", "seoul", 2, """
                        {"maxWindMs":42,"windRadiusKm":90,"rainfallMm":320,"track":[
                        {"hour":0,"latOffset":0.1,"lonOffset":-0.15,"windMs":28},
                        {"hour":6,"latOffset":0.0,"lonOffset":-0.05,"windMs":38},
                        {"hour":12,"latOffset":-0.05,"lonOffset":0.0,"windMs":42},
                        {"hour":18,"latOffset":0.05,"lonOffset":0.1,"windMs":30}
                        ]}"""),
                typhoon("typhoon-hinnamnor-2022", "태풍 힌남노 (2022)", "남해안을 강타한 대형 태풍 시나리오입니다.",
                        "HINNAMNOR2022", "busan", 3, """
                        {"maxWindMs":50,"windRadiusKm":100,"rainfallMm":280,"track":[
                        {"hour":0,"latOffset":0.2,"lonOffset":-0.2,"windMs":30},
                        {"hour":8,"latOffset":0.05,"lonOffset":-0.05,"windMs":45},
                        {"hour":16,"latOffset":-0.05,"lonOffset":0.05,"windMs":50},
                        {"hour":24,"latOffset":0.1,"lonOffset":0.15,"windMs":38}
                        ]}"""),
                earthquake("eq-pohang-2017", "포항 지진 M5.4 (2017)", "연약 지반에서 건물·도로 피해가 발생했습니다. 대피 동선을 설계하세요.",
                        "POHANG2017", "daegu", 1, """
                        {"magnitude":5.4,"depthKm":9,"epicenterLatOffset":0.15,"epicenterLonOffset":-0.1,"soilType":"soft"}"""),
                earthquake("eq-gyeongju-2016", "경주 지진 M5.8 (2016)", "역사적 지진 활동 지역의 강진 시나리오입니다.",
                        "GYEONGJU2016", "daegu", 2, """
                        {"magnitude":5.8,"depthKm":12,"epicenterLatOffset":-0.05,"epicenterLonOffset":0.12,"soilType":"soft"}"""),
                tsunami("tsunami-tohoku-2011", "동일본 대지진 해일 (2011)", "원거리 원발 해일이 해안 도시에 도달하는 교육용 시나리오입니다.",
                        "TOHOKU2011", "busan", 1, """
                        {"sourceMagnitude":9.0,"waveHeightM":8.5,"approachBearingDeg":90,"etaMinutes":40,"runupFactor":1.3}"""),
                tsunami("tsunami-east-sea-drill", "동해안 해일 대피 훈련", "지진해일 경보 후 고지·방조제·대피소 활용 시나리오입니다.",
                        "EASTSEA_DRILL", "busan", 2, """
                        {"sourceMagnitude":7.5,"waveHeightM":5.0,"approachBearingDeg":85,"etaMinutes":25,"runupFactor":1.1}""")
        );
    }

    private static DisasterScenario typhoon(String id, String title, String desc, String source,
                                              String region, int order, String params) {
        return scenario(id, DisasterMode.TYPHOON, title, desc, source, region, order, params);
    }

    private static DisasterScenario earthquake(String id, String title, String desc, String source,
                                               String region, int order, String params) {
        return scenario(id, DisasterMode.EARTHQUAKE, title, desc, source, region, order, params);
    }

    private static DisasterScenario tsunami(String id, String title, String desc, String source,
                                            String region, int order, String params) {
        return scenario(id, DisasterMode.TSUNAMI, title, desc, source, region, order, params);
    }

    private static DisasterScenario scenario(String id, DisasterMode mode, String title, String desc,
                                             String source, String region, int order, String params) {
        return DisasterScenario.builder()
                .id(id)
                .mode(mode)
                .title(title)
                .description(desc)
                .sourceEventId(source)
                .paramsJson(params.trim())
                .regionCode(region)
                .enabled(true)
                .sortOrder(order)
                .build();
    }
}
